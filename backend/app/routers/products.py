"""
Products Router
จัดการ endpoints เกี่ยวกับสินค้า categories และ variants
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional, List
import asyncpg

from app.database import get_db
from app.middleware.auth import get_optional_user

router = APIRouter(prefix="/api/products", tags=["Products"])


# =============================================
# Response Models
# =============================================

class CategoryResponse(BaseModel):
    category_id: int
    name: str
    parent_id: Optional[int]
    product_count: Optional[int] = 0


class VariantResponse(BaseModel):
    variant_id: int
    sku: Optional[str]
    price: float
    stock_quantity: int
    image_url: Optional[str]
    unit: Optional[str]
    size: Optional[str]
    color: Optional[str]
    is_active: bool


class ProductResponse(BaseModel):
    product_id: int
    name: str
    description: Optional[str]
    marketing_copy: Optional[str]
    category_id: Optional[int]
    category_name: Optional[str]
    is_active: bool
    variants: List[VariantResponse]


class ProductListItem(BaseModel):
    product_id: int
    name: str
    description: Optional[str]
    category_name: Optional[str]
    min_price: float
    max_price: float
    image_url: Optional[str]
    is_active: bool
    total_stock: int


# =============================================
# Endpoints
# =============================================

@router.get("/categories", response_model=List[CategoryResponse])
async def get_categories(
    db: asyncpg.Connection = Depends(get_db)
):
    """
    ดึงรายการ categories ทั้งหมด
    """
    categories = await db.fetch(
        """SELECT c.category_id, c.name, c.parent_id,
                  (
                    SELECT COUNT(*)
                    FROM products p
                    WHERE p.is_active = TRUE
                      AND (p.category_id = c.category_id
                           OR p.category_id IN (SELECT sc.category_id FROM categories sc WHERE sc.parent_id = c.category_id))
                  ) as product_count
           FROM categories c
           ORDER BY c.category_id"""
    )
    
    return [
        CategoryResponse(
            category_id=cat["category_id"],
            name=cat["name"],
            parent_id=cat["parent_id"],
            product_count=cat["product_count"]
        )
        for cat in categories
    ]


@router.get("", response_model=List[ProductListItem])
async def get_products(
    category_id: Optional[int] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Search by name"),
    min_price: Optional[float] = Query(None, description="Minimum price"),
    max_price: Optional[float] = Query(None, description="Maximum price"),
    limit: int = Query(50, le=100, description="Number of products"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    db: asyncpg.Connection = Depends(get_db),
    user: Optional[dict] = Depends(get_optional_user)
):
    """
    ดึงรายการสินค้าพร้อม filters
    
    Query parameters:
    - category_id: กรอง category
    - search: ค้นหาจากชื่อสินค้า
    - min_price, max_price: กรองราคา
    - limit, offset: pagination
    """
    # Build dynamic query
    conditions = ["p.is_active = TRUE"]
    params = []
    param_count = 1
    
    if category_id:
        # Include products in this category AND all its subcategories
        conditions.append(
            f"(p.category_id = ${param_count} "
            f"OR p.category_id IN (SELECT category_id FROM categories WHERE parent_id = ${param_count}))"
        )
        params.append(category_id)
        param_count += 1
    
    if search:
        conditions.append(f"p.name ILIKE ${param_count}")
        params.append(f"%{search}%")
        param_count += 1
    
    # Price filter (from variants)
    price_filter = ""
    if min_price is not None:
        price_filter += f" AND min_price >= ${param_count}"
        params.append(min_price)
        param_count += 1
    
    if max_price is not None:
        price_filter += f" AND max_price <= ${param_count}"
        params.append(max_price)
        param_count += 1
    
    where_clause = " AND ".join(conditions)
    
    query = f"""
        SELECT 
            p.product_id,
            p.name,
            p.description,
            c.name as category_name,
            MIN(v.price) as min_price,
            MAX(v.price) as max_price,
            (SELECT v2.image_url FROM product_variants v2 
             WHERE v2.product_id = p.product_id AND v2.image_url IS NOT NULL 
             LIMIT 1) as image_url,
            p.is_active,
            COALESCE(SUM(v.stock_quantity), 0) as total_stock
        FROM products p
        LEFT JOIN categories c ON c.category_id = p.category_id
        LEFT JOIN product_variants v ON v.product_id = p.product_id AND v.is_active = TRUE
        WHERE {where_clause}
        GROUP BY p.product_id, p.name, p.description, c.name, p.is_active
        HAVING 1=1 {price_filter}
        ORDER BY p.product_id
        LIMIT ${param_count} OFFSET ${param_count + 1}
    """
    
    params.extend([limit, offset])
    
    products = await db.fetch(query, *params)
    
    return [
        ProductListItem(
            product_id=prod["product_id"],
            name=prod["name"],
            description=prod["description"],
            category_name=prod["category_name"],
            min_price=float(prod["min_price"] or 0),
            max_price=float(prod["max_price"] or 0),
            image_url=prod["image_url"],
            is_active=prod["is_active"],
            total_stock=prod["total_stock"]
        )
        for prod in products
    ]


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product_detail(
    product_id: int,
    db: asyncpg.Connection = Depends(get_db),
    user: Optional[dict] = Depends(get_optional_user)
):
    """
    ดึงรายละเอียดสินค้าตาม ID พร้อม variants
    """
    # Get product
    product = await db.fetchrow(
        """SELECT p.*, c.name as category_name
           FROM products p
           LEFT JOIN categories c ON c.category_id = p.category_id
           WHERE p.product_id = $1""",
        product_id
    )
    
    if not product:
        raise HTTPException(status_code=404, detail="ไม่พบสินค้า")
    
    # Get variants
    variants = await db.fetch(
        """SELECT variant_id, sku, price, stock_quantity, image_url,
                  unit, size, color, is_active
           FROM product_variants
           WHERE product_id = $1
           ORDER BY price ASC""",
        product_id
    )
    
    return ProductResponse(
        product_id=product["product_id"],
        name=product["name"],
        description=product["description"],
        marketing_copy=product["marketing_copy"],
        category_id=product["category_id"],
        category_name=product["category_name"],
        is_active=product["is_active"],
        variants=[
            VariantResponse(
                variant_id=v["variant_id"],
                sku=v["sku"],
                price=float(v["price"]),
                stock_quantity=v["stock_quantity"],
                image_url=v["image_url"],
                unit=v["unit"],
                size=v["size"],
                color=v["color"],
                is_active=v["is_active"]
            )
            for v in variants
        ]
    )


@router.get("/variant/{variant_id}", response_model=VariantResponse)
async def get_variant_detail(
    variant_id: int,
    db: asyncpg.Connection = Depends(get_db)
):
    """
    ดึงรายละเอียด variant ตาม ID
    """
    variant = await db.fetchrow(
        """SELECT variant_id, sku, price, stock_quantity, image_url,
                  unit, size, color, is_active
           FROM product_variants
           WHERE variant_id = $1""",
        variant_id
    )
    
    if not variant:
        raise HTTPException(status_code=404, detail="ไม่พบ variant")
    
    return VariantResponse(
        variant_id=variant["variant_id"],
        sku=variant["sku"],
        price=float(variant["price"]),
        stock_quantity=variant["stock_quantity"],
        image_url=variant["image_url"],
        unit=variant["unit"],
        size=variant["size"],
        color=variant["color"],
        is_active=variant["is_active"]
    )
