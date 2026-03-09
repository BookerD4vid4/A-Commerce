"""
Embedding Service for A-Commerce
Handles Gemini embedding generation and pgvector similarity search
"""

import httpx
from typing import Optional
import asyncpg

from app.config import settings


GEMINI_EMBED_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:embedContent"


async def generate_embedding(text: str) -> Optional[list[float]]:
    """Generate embedding vector using Gemini API"""
    if not settings.GEMINI_API_KEY:
        print("[WARNING] GEMINI_API_KEY not set, skipping embedding generation")
        return None

    url = GEMINI_EMBED_URL.format(model=settings.GEMINI_EMBEDDING_MODEL)

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            url,
            params={"key": settings.GEMINI_API_KEY},
            json={
                "model": f"models/{settings.GEMINI_EMBEDDING_MODEL}",
                "content": {"parts": [{"text": text}]},
                "outputDimensionality": 768,
            },
        )
        response.raise_for_status()
        data = response.json()
        return data["embedding"]["values"]


async def search_similar_products(
    query_embedding: list[float],
    db: asyncpg.Connection,
    limit: int = 5,
    min_similarity: float = 0.55,
) -> list[dict]:
    """Search for similar products using pgvector cosine similarity.

    Returns variant-level records: each size/variant gets its own entry.
    Uses dynamic filtering: returns products above min_similarity,
    but drops results that are much worse than the best match.
    """
    embedding_str = "[" + ",".join(str(v) for v in query_embedding) + "]"

    # First find matching products by embedding
    products = await db.fetch(
        """
        SELECT
            p.product_id,
            p.name,
            p.description,
            p.marketing_copy,
            c.name as category_name,
            1 - (pe.embedding <=> $1::vector) as similarity
        FROM product_embeddings pe
        JOIN products p ON p.product_id = pe.product_id
        LEFT JOIN categories c ON c.category_id = p.category_id
        WHERE p.is_active = TRUE
          AND 1 - (pe.embedding <=> $1::vector) >= $2
        ORDER BY pe.embedding <=> $1::vector
        LIMIT $3
        """,
        embedding_str,
        min_similarity,
        limit,
    )

    if not products:
        return []

    # Dynamic filtering
    best_score = float(products[0]["similarity"])
    gap_threshold = best_score - 0.04
    filtered = [p for p in products if float(p["similarity"]) >= gap_threshold]

    # Expand each product into its variants
    product_ids = [p["product_id"] for p in filtered]
    variants = await db.fetch(
        """
        SELECT variant_id, product_id, sku, price, stock_quantity,
               unit, size, color, image_url
        FROM product_variants
        WHERE product_id = ANY($1) AND is_active = TRUE
        ORDER BY product_id, price ASC
        """,
        product_ids,
    )

    # Build variant-level results
    product_map = {p["product_id"]: p for p in filtered}
    results = []
    for v in variants:
        p = product_map[v["product_id"]]
        # Build display name with size info
        display_name = p["name"]
        if v["size"]:
            display_name = f"{p['name']} ({v['size']})"

        results.append({
            "product_id": p["product_id"],
            "variant_id": v["variant_id"],
            "name": display_name,
            "description": p["description"],
            "category_name": p["category_name"],
            "min_price": float(v["price"]),
            "max_price": float(v["price"]),
            "image_url": v["image_url"],
            "total_stock": v["stock_quantity"],
            "size": v["size"],
            "unit": v["unit"],
            "similarity": float(p["similarity"]),
        })

    return results


async def search_products_by_keyword(
    query: str,
    db: asyncpg.Connection,
    limit: int = 5,
) -> list[dict]:
    """Fallback keyword search when embeddings are not available.
    Returns variant-level records."""
    # Find matching products first
    products = await db.fetch(
        """
        SELECT
            p.product_id,
            p.name,
            p.description,
            p.marketing_copy,
            c.name as category_name
        FROM products p
        LEFT JOIN categories c ON c.category_id = p.category_id
        WHERE p.is_active = TRUE
          AND (p.name ILIKE $1 OR p.description ILIKE $1 OR p.marketing_copy ILIKE $1)
        ORDER BY p.product_id
        LIMIT $2
        """,
        f"%{query}%",
        limit,
    )

    if not products:
        return []

    # Expand to variants
    product_ids = [p["product_id"] for p in products]
    variants = await db.fetch(
        """
        SELECT variant_id, product_id, sku, price, stock_quantity,
               unit, size, color, image_url
        FROM product_variants
        WHERE product_id = ANY($1) AND is_active = TRUE
        ORDER BY product_id, price ASC
        """,
        product_ids,
    )

    product_map = {p["product_id"]: p for p in products}
    results = []
    for v in variants:
        p = product_map[v["product_id"]]
        display_name = p["name"]
        if v["size"]:
            display_name = f"{p['name']} ({v['size']})"

        results.append({
            "product_id": p["product_id"],
            "variant_id": v["variant_id"],
            "name": display_name,
            "description": p["description"],
            "category_name": p["category_name"],
            "min_price": float(v["price"]),
            "max_price": float(v["price"]),
            "image_url": v["image_url"],
            "total_stock": v["stock_quantity"],
            "size": v["size"],
            "unit": v["unit"],
            "similarity": 0.5,
        })

    return results


async def generate_product_embedding(db: asyncpg.Connection, product_id: int) -> bool:
    """Generate/update embedding for a single product. Returns True on success."""
    if not settings.GEMINI_API_KEY:
        print("[WARNING] GEMINI_API_KEY not set, skipping embedding")
        return False

    product = await db.fetchrow(
        "SELECT name, description, marketing_copy FROM products WHERE product_id = $1",
        product_id,
    )
    if not product:
        return False

    text_parts = [product["name"]]
    if product["description"]:
        text_parts.append(product["description"])
    if product["marketing_copy"]:
        text_parts.append(product["marketing_copy"])
    text_content = " ".join(text_parts)

    try:
        embedding = await generate_embedding(text_content)
        if not embedding:
            return False

        embedding_str = "[" + ",".join(str(v) for v in embedding) + "]"

        existing = await db.fetchrow(
            "SELECT embedding_id FROM product_embeddings WHERE product_id = $1",
            product_id,
        )

        if existing:
            await db.execute(
                """
                UPDATE product_embeddings
                SET embedding = $1::vector, text_content = $2, updated_at = NOW()
                WHERE product_id = $3
                """,
                embedding_str, text_content, product_id,
            )
        else:
            await db.execute(
                """
                INSERT INTO product_embeddings (product_id, embedding, text_content)
                VALUES ($1, $2::vector, $3)
                """,
                product_id, embedding_str, text_content,
            )

        print(f"[OK] Auto-embedding for product {product_id}")
        return True
    except Exception as e:
        print(f"[ERROR] Auto-embedding failed for product {product_id}: {e}")
        return False


async def generate_all_product_embeddings(db: asyncpg.Connection) -> dict:
    """Generate embeddings for all active products and store in product_embeddings"""
    if not settings.GEMINI_API_KEY:
        return {"status": "error", "message": "GEMINI_API_KEY not configured"}

    products = await db.fetch(
        """
        SELECT product_id, name, description, marketing_copy
        FROM products WHERE is_active = TRUE
        """
    )

    created = 0
    updated = 0
    errors = 0

    for product in products:
        text_parts = [product["name"]]
        if product["description"]:
            text_parts.append(product["description"])
        if product["marketing_copy"]:
            text_parts.append(product["marketing_copy"])
        text_content = " ".join(text_parts)

        try:
            embedding = await generate_embedding(text_content)
            if not embedding:
                errors += 1
                continue

            embedding_str = "[" + ",".join(str(v) for v in embedding) + "]"

            # Upsert: update if exists, insert if not
            existing = await db.fetchrow(
                "SELECT embedding_id FROM product_embeddings WHERE product_id = $1",
                product["product_id"],
            )

            if existing:
                await db.execute(
                    """
                    UPDATE product_embeddings
                    SET embedding = $1::vector, text_content = $2, updated_at = NOW()
                    WHERE product_id = $3
                    """,
                    embedding_str,
                    text_content,
                    product["product_id"],
                )
                updated += 1
            else:
                await db.execute(
                    """
                    INSERT INTO product_embeddings (product_id, embedding, text_content)
                    VALUES ($1, $2::vector, $3)
                    """,
                    product["product_id"],
                    embedding_str,
                    text_content,
                )
                created += 1

            print(f"[OK] Embedding for product {product['product_id']}")

        except Exception as e:
            print(f"[ERROR] Failed to generate embedding for product {product['product_id']}: {e}")
            errors += 1

    return {
        "status": "completed",
        "total_products": len(products),
        "created": created,
        "updated": updated,
        "errors": errors,
    }
