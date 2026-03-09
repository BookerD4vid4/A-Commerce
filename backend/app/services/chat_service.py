"""
Chat Service for A-Commerce
Handles chat session management, message processing, and Typhoon LLM integration
"""

import httpx
import json
import re
import uuid
from typing import Optional
import asyncpg

from app.config import settings
from app.services.embedding_service import (
    generate_embedding,
    search_similar_products,
    search_products_by_keyword,
)


# --- Intent Detection Keyword Lists ---
# Priority: NEGATION → CHECKOUT → GENERAL → ORDER → SEARCH → default general
#
# Design rules:
#   1. Multi-word phrases checked before single words to avoid false positives
#   2. Negation phrases ("ไม่เอา", "ไม่ซื้อ") override order intent
#   3. Checkout phrases detected before general (to not swallow "ชำระเงิน")
#   4. Short words like "หา", "ดู" only in SEARCH to avoid over-matching
#   5. GENERAL checked before ORDER so greetings/info never trigger product search

# Negation / cancellation phrases — always general intent
NEGATION_KEYWORDS = [
    "ไม่เอา", "ไม่ซื้อ", "ไม่สั่ง", "ไม่เพิ่ม", "ไม่ต้อง", "ยกเลิก",
    "ไม่เอาแล้ว", "ไม่สั่งแล้ว", "ไม่เพิ่มแล้ว", "ไม่ซื้อแล้ว",
    "ไม่ต้องแล้ว", "เอาออก", "ลบออก", "ถอดออก", "ยกเลิกออเดอร์",
]

# Checkout intent — user wants to pay / finish ordering
CHECKOUT_KEYWORDS = [
    "ชำระเงิน", "เช็คเอาท์", "checkout", "จ่ายเงิน", "จ่ายตัง",
    "สั่งเลย", "สั่งซื้อเลย", "สั่งได้เลย", "ไปชำระ",
    "จบการสั่ง", "สั่งเท่านี้", "เอาเท่านี้", "จะจ่าย",
]

# General / info keywords (no product search needed)
GENERAL_KEYWORDS = [
    # Categories & info
    "หมวด", "ประเภท", "category", "ชนิด",
    # Greetings
    "สวัสดี", "หวัดดี", "ดีครับ", "ดีค่ะ", "ดีจ้า", "ดีจ๊ะ",
    "ดีคับ", "ดีคะ", "หวัดดีครับ", "หวัดดีค่ะ", "hello", "hi",
    # Thanks / goodbye
    "ขอบคุณ", "ขอบใจ", "ลาก่อน", "บาย", "bye",
    "ขอบคุณครับ", "ขอบคุณค่ะ", "ขอบคุณมาก",
    # How-to / payment info (asking HOW, not requesting checkout)
    "วิธีสั่ง", "วิธีซื้อ", "สั่งยังไง", "ซื้อยังไง", "สั่งซื้อยังไง",
    "จ่ายยังไง", "วิธีชำระ", "วิธีจ่าย",
    # Store info
    "เปิดกี่โมง", "ปิดกี่โมง", "เวลาเปิด", "เวลาปิด",
    "อยู่ที่ไหน", "ที่อยู่ร้าน", "ร้านอยู่ไหน", "อยู่ตรงไหน",
    # Delivery
    "ส่งยังไง", "ค่าส่ง", "จัดส่ง", "ค่าจัดส่ง", "ส่งฟรี", "วิธีส่ง",
    # Contact
    "ติดต่อ", "เบอร์โทร", "โทร", "ไลน์", "line", "อีเมล", "email",
    # Help
    "ช่วยอะไรได้บ้าง", "ทำอะไรได้บ้าง", "ช่วยอะไรได้", "help",
    # Done / end conversation
    "พอแล้ว", "เท่านี้", "จบ", "แค่นี้", "โอเค", "ตกลง", "ok", "okay",
    "เข้าใจแล้ว", "รับทราบ", "ได้เลย", "โอเคครับ", "โอเคค่ะ",
    # Cart check (asking about cart, not adding)
    "ยอดรวม", "ตะกร้า", "ดูตะกร้า", "เช็คตะกร้า", "ในตะกร้า",
    # Ask/view (not ordering)
    "ขอดู", "ขอถาม", "ถามหน่อย", "ขอสอบถาม", "สอบถาม",
    "อยากรู้", "อยากถาม", "ขอทราบ",
    # Promotions / policies
    "โปรโมชั่น", "โปรโมชัน", "ส่วนลด", "คูปอง", "ลดราคา",
    "นโยบาย", "คืนสินค้า", "เปลี่ยนสินค้า", "รับประกัน", "warranty",
]

# Order intent — multi-word phrases first, then single words
# These MUST express clear intent to purchase/add items
ORDER_KEYWORDS = [
    # Multi-word — CLEAR intent to add a SPECIFIC item (not browsing)
    "ใส่ตะกร้า", "เพิ่มในตะกร้า", "เอาด้วย", "เพิ่มอีก",
    "สั่งเพิ่ม", "เอาเพิ่ม", "เพิ่มสินค้า", "เพิ่มรายการ",
    "ขอสั่ง", "ขอซื้อ",
]

# Search / browse intent — user wants to see/choose products
SEARCH_KEYWORDS = [
    # Multi-word first
    "มีอะไรบ้าง", "อะไรบ้าง", "มีอะไร", "มีไหม", "มีมั้ย",
    "ราคาเท่าไหร่", "ราคาเท่าไร", "กี่บาท",
    # Desire/want — should show options, not auto-add
    "อยากได้", "ต้องการ", "จะเอา", "จะซื้อ", "จะสั่ง", "เอามา",
    # Single words
    "แนะนำ", "ค้นหา", "หา", "ดู", "ราคา", "สินค้า",
    "เท่าไหร่", "เท่าไร",
    "เอา", "สั่ง", "ซื้อ", "เพิ่ม",
]

# Default system prompt (used if no prompt in chatbot_prompts table)
DEFAULT_SYSTEM_PROMPT = """คุณคือผู้ช่วยขายของร้านโชห่วย ABC (A-Commerce) ที่เป็นมิตรและช่วยเหลือลูกค้า

หน้าที่ของคุณ:
- แนะนำสินค้าที่เหมาะสมกับความต้องการของลูกค้า
- ตอบคำถามเกี่ยวกับสินค้า ราคา และสต็อก
- พูดภาษาไทยอย่างเป็นกันเอง สุภาพ

กฎสำคัญที่สุด (ห้ามฝ่าฝืนเด็ดขาด):
- ห้ามสร้างชื่อสินค้า ยี่ห้อ หรือราคาขึ้นมาเอง ต้องอ้างอิงจาก "ผลค้นหาจากฐานข้อมูลร้าน" ที่แนบมาเท่านั้น
- ถ้าในผลค้นหาไม่มีสินค้าที่ลูกค้าถาม ให้ตอบว่า "ขออภัยค่ะ ตอนนี้ร้านยังไม่มีสินค้านี้ค่ะ" ห้ามแต่งชื่อสินค้าอื่นมาทดแทน
- ถ้าผลค้นหาพบสินค้า ให้แนะนำเฉพาะสินค้าจากผลค้นหาเท่านั้น ห้ามเพิ่มสินค้าอื่นที่ไม่อยู่ในผลค้นหา
- ตอบเฉพาะเรื่องที่เกี่ยวกับร้านค้าและสินค้าเท่านั้น
- ถ้าลูกค้าถามนอกเรื่อง ให้นำกลับมาที่เรื่องสินค้า
- ตอบสั้นกระชับ ไม่เกิน 2-3 ประโยค ยกเว้นต้องอธิบายรายละเอียดสินค้า

เมื่อลูกค้าสั่งซื้อ/เอาสินค้า:
- ยืนยันรายการที่ลูกค้าสั่ง เช่น "เพิ่ม [ชื่อสินค้า] x [จำนวน] ในตะกร้าแล้วค่ะ"
- บอกราคาของสินค้าที่สั่ง
- ห้ามแนะนำสินค้าอื่นเพิ่ม ยกเว้นลูกค้าถามเอง
- ถามว่า "สั่งเพิ่มไหมคะ หรือจะชำระเงินเลย?"

เมื่อลูกค้าค้นหา/ถามเรื่องสินค้า:
- แนะนำเฉพาะสินค้าจากผลค้นหาที่ระบบหามาให้เท่านั้น ห้ามเพิ่มเติมสินค้าที่ไม่อยู่ในผลค้นหา
- บอกชื่อสินค้าและราคาตามผลค้นหา"""


async def get_or_create_session(
    db: asyncpg.Connection,
    user_id: Optional[int] = None,
    session_token: Optional[str] = None,
) -> dict:
    """Get existing session or create a new one"""
    # Try to find existing session
    if user_id:
        session = await db.fetchrow(
            """SELECT session_id, user_id, session_token, created_at
               FROM chat_sessions WHERE user_id = $1
               ORDER BY updated_at DESC LIMIT 1""",
            user_id,
        )
        if session:
            await db.execute(
                "UPDATE chat_sessions SET updated_at = NOW() WHERE session_id = $1",
                session["session_id"],
            )
            return dict(session)

    if session_token:
        session = await db.fetchrow(
            """SELECT session_id, user_id, session_token, created_at
               FROM chat_sessions WHERE session_token = $1""",
            session_token,
        )
        if session:
            await db.execute(
                "UPDATE chat_sessions SET updated_at = NOW() WHERE session_id = $1",
                session["session_id"],
            )
            return dict(session)

    # Create new session
    if not session_token:
        session_token = str(uuid.uuid4())

    session = await db.fetchrow(
        """INSERT INTO chat_sessions (user_id, session_token)
           VALUES ($1, $2)
           RETURNING session_id, user_id, session_token, created_at""",
        user_id,
        session_token,
    )
    return dict(session)


async def get_chat_history(
    db: asyncpg.Connection,
    session_id: int,
    limit: int = 20,
) -> list[dict]:
    """Get recent chat messages for a session"""
    messages = await db.fetch(
        """SELECT message_id, role, content, metadata, created_at
           FROM chat_messages
           WHERE session_id = $1
           ORDER BY created_at DESC
           LIMIT $2""",
        session_id,
        limit,
    )
    # Return in chronological order
    return [
        {
            "message_id": m["message_id"],
            "role": m["role"],
            "content": m["content"],
            "metadata": json.loads(m["metadata"]) if m["metadata"] else None,
            "created_at": m["created_at"].isoformat(),
        }
        for m in reversed(messages)
    ]


async def get_categories_text(db: asyncpg.Connection) -> str:
    """Load actual categories from database for system prompt context"""
    cats = await db.fetch(
        """SELECT c.name,
                  (SELECT COUNT(*) FROM products p
                   WHERE p.is_active = TRUE
                     AND (p.category_id = c.category_id
                          OR p.category_id IN (SELECT sc.category_id FROM categories sc WHERE sc.parent_id = c.category_id))
                  ) as product_count
           FROM categories c
           WHERE c.parent_id IS NULL
           ORDER BY c.category_id"""
    )
    if not cats:
        return ""

    lines = ["หมวดหมู่สินค้าในร้าน:"]
    for c in cats:
        lines.append(f"- {c['name']} ({c['product_count']} สินค้า)")
    return "\n".join(lines)


async def get_system_prompt(db: asyncpg.Connection) -> str:
    """Load system prompt from chatbot_prompts table + inject real categories"""
    prompt = await db.fetchrow(
        """SELECT prompt_text FROM chatbot_prompts
           WHERE prompt_type = 'system' AND is_active = TRUE
           ORDER BY created_at DESC LIMIT 1"""
    )
    base_prompt = prompt["prompt_text"] if prompt else DEFAULT_SYSTEM_PROMPT

    # Inject real categories from database
    categories_text = await get_categories_text(db)
    if categories_text:
        base_prompt += f"\n\n{categories_text}\n\nสำคัญ: เมื่อลูกค้าถามหมวดหมู่สินค้า ให้ตอบตามรายการหมวดหมู่ข้างต้นเท่านั้น ห้ามสร้างหมวดหมู่ขึ้นมาเอง"

    return base_prompt


def detect_intent(message: str) -> str:
    """
    Detect user intent from message.

    Priority order:
      1. Negation phrases ("ไม่เอา", "ยกเลิก") → general
      2. Checkout phrases ("ชำระเงิน", "สั่งเลย") → checkout
      3. General/info keywords (greetings, how-to, store info) → general
      4. Order keywords (purchase verbs) → order
      5. Search keywords (browse/find) → search
      6. Default → general (safe fallback, no product cards)
    """
    msg = message.strip().lower()

    # 1. Negation — always general (overrides everything)
    for keyword in NEGATION_KEYWORDS:
        if keyword in msg:
            return "general"

    # 2. Checkout — user wants to pay / finish ordering
    for keyword in CHECKOUT_KEYWORDS:
        if keyword in msg:
            return "checkout"

    # 3. General / info patterns
    for keyword in GENERAL_KEYWORDS:
        if keyword in msg:
            return "general"

    # 4. Order intent — clear purchase verbs
    for keyword in ORDER_KEYWORDS:
        if keyword in msg:
            return "order"

    # 5. Search / browse intent
    for keyword in SEARCH_KEYWORDS:
        if keyword in msg:
            return "search"

    # 6. Pattern-based search detection
    #    "มี...มั้ย/ไหม/ป่าว/เปล่า/บ้าง" = asking if product exists
    if msg.startswith("มี") and re.search(r"(มั้ย|ไหม|ป่าว|เปล่า|บ้าง|รึเปล่า)$", msg):
        return "search"

    # 7. Default to search (try finding products for unrecognized messages)
    return "search"


def parse_order_quantity(message: str) -> int:
    """Extract quantity from order message, default to 1"""
    # Match digit + required unit word (prevents matching product IDs like "product123")
    match = re.search(r"(\d+)\s*(?:ชิ้น|อัน|ขวด|กล่อง|ซอง|ถุง|แพ็ค|โหล|ลัง|กระป๋อง|แท่ง|แผ่น)", message)
    if match:
        qty = int(match.group(1))
        return max(1, min(qty, 99))
    return 1


async def get_product_variants(db: asyncpg.Connection, product_id: int) -> list[dict]:
    """Get active variants for a product"""
    rows = await db.fetch(
        """SELECT variant_id, sku, price, stock_quantity, unit, size, color, image_url
           FROM product_variants
           WHERE product_id = $1 AND is_active = TRUE
           ORDER BY price ASC""",
        product_id,
    )
    return [
        {
            "variant_id": r["variant_id"],
            "sku": r["sku"],
            "price": float(r["price"]),
            "stock_quantity": r["stock_quantity"],
            "unit": r["unit"],
            "size": r["size"],
            "color": r["color"],
            "image_url": r["image_url"],
        }
        for r in rows
    ]


async def search_products_for_chat(
    query: str,
    db: asyncpg.Connection,
    limit: int = 5,
) -> list[dict]:
    """Search products using semantic search (with keyword fallback)"""
    # Try semantic search first
    embedding = await generate_embedding(query)
    if embedding:
        products = await search_similar_products(embedding, db, limit=limit)
        if products:
            return products

    # Fallback to keyword search
    return await search_products_by_keyword(query, db, limit=limit)


def format_products_for_prompt(products: list[dict]) -> str:
    """Format product results into text for LLM context.
    Each entry is a variant-level record (name already includes size)."""
    if not products:
        return "ผลค้นหา: ไม่พบสินค้าที่เกี่ยวข้อง"

    lines = ["ผลค้นหาจากฐานข้อมูลร้าน (มีจริงในร้าน):"]
    for i, p in enumerate(products, 1):
        stock_status = "มีสินค้า" if p["total_stock"] > 0 else "สินค้าหมด"
        price_text = f"{p['min_price']:.0f} บาท"
        lines.append(
            f"{i}. {p['name']} - {price_text} ({stock_status})"
            + (f" - หมวด: {p['category_name']}" if p["category_name"] else "")
        )
    return "\n".join(lines)


async def call_typhoon(messages: list[dict]) -> str:
    """Call Typhoon LLM API (OpenAI-compatible)"""
    if not settings.TYPHOON_API_KEY:
        return "ขออภัยค่ะ ระบบ AI ยังไม่พร้อมใช้งาน กรุณาลองใหม่ภายหลัง"

    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(
            f"{settings.TYPHOON_API_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.TYPHOON_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "typhoon-v2.5-30b-a3b-instruct",
                "messages": messages,
                "max_tokens": 4096,
                "temperature": 0.7,
            },
        )
        if response.status_code != 200:
            print(f"[ERROR] Typhoon response {response.status_code}: {response.text}")
            response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]


async def get_cart_summary(db: asyncpg.Connection, user_id: Optional[int]) -> str:
    """Fetch real cart contents from database for LLM context"""
    if not user_id:
        return ""

    cart = await db.fetchrow(
        "SELECT cart_id FROM carts WHERE user_id = $1", user_id
    )
    if not cart:
        return "\n\n[ข้อมูลตะกร้าจริง: ตะกร้าว่างเปล่า ไม่มีสินค้า]"

    items = await db.fetch(
        """SELECT p.name, pv.size, pv.unit, ci.quantity, pv.price
           FROM cart_items ci
           JOIN product_variants pv ON ci.variant_id = pv.variant_id
           JOIN products p ON pv.product_id = p.product_id
           WHERE ci.cart_id = $1 AND pv.is_active = TRUE""",
        cart["cart_id"],
    )
    if not items:
        return "\n\n[ข้อมูลตะกร้าจริง: ตะกร้าว่างเปล่า ไม่มีสินค้า]"

    lines = ["\n\n[ข้อมูลตะกร้าจริงจากระบบ (ห้ามแต่งเพิ่ม ให้ใช้ข้อมูลนี้เท่านั้น):"]
    total = 0.0
    for item in items:
        name = item["name"]
        if item["size"]:
            name += f" ({item['size']})"
        subtotal = float(item["price"]) * item["quantity"]
        total += subtotal
        lines.append(f"- {name} x{item['quantity']} = {subtotal:.0f} บาท")
    lines.append(f"รวมยอด: {total:.0f} บาท]")
    return "\n".join(lines)


async def process_message(
    db: asyncpg.Connection,
    session_id: int,
    user_message: str,
    user_id: Optional[int] = None,
) -> dict:
    """
    Main chat orchestration:
    1. Save user message
    2. Detect intent (order vs search)
    3. Search relevant products
    4. Build prompt with context
    5. Call Typhoon LLM
    6. Save assistant response
    7. Return response + products + action
    """
    # 1. Save user message
    await db.execute(
        """INSERT INTO chat_messages (session_id, role, content)
           VALUES ($1, 'user', $2)""",
        session_id,
        user_message,
    )

    # 2. Detect intent
    intent = detect_intent(user_message)
    quantity = parse_order_quantity(user_message) if intent == "order" else 0

    # 3. Search relevant products (skip for general/checkout questions)
    products = []
    order_product = None

    if intent in ("general", "checkout"):
        products_for_prompt = []
    else:
        products = await search_products_for_chat(user_message, db)
        # For orders: check if product has multiple variants
        if intent == "order" and products:
            order_product = products[0]
            variants = await get_product_variants(db, order_product["product_id"])
            # Multiple variants with different prices/sizes → let user choose
            has_multiple = len(variants) > 1
            has_different_options = has_multiple and (
                len(set(v["price"] for v in variants)) > 1
                or any(v["size"] for v in variants)
                or any(v["unit"] for v in variants)
            )
            if has_different_options:
                # Switch to select_variant: show options instead of auto-add
                order_product["variants"] = variants
                intent = "select_variant"
            products_for_prompt = [order_product]
        else:
            products_for_prompt = products

    # 4. Build prompt
    system_prompt = await get_system_prompt(db)
    product_context = format_products_for_prompt(products_for_prompt)

    # Fetch real cart data for checkout or cart-related queries
    cart_keywords = ["ตะกร้า", "ดูตะกร้า", "เช็คตะกร้า", "ในตะกร้า", "ยอดรวม"]
    needs_cart = intent == "checkout" or any(kw in user_message for kw in cart_keywords)
    cart_context = await get_cart_summary(db, user_id) if needs_cart else ""

    # Add intent hint to help the LLM respond correctly
    if intent == "checkout":
        intent_hint = f"\n\n[ลูกค้าต้องการชำระเงิน/สั่งซื้อ - ตอบว่ากรุณาเลือกที่อยู่จัดส่งค่ะ ระบบจะแสดงที่อยู่ให้เลือก]{cart_context}"
    elif intent == "general":
        intent_hint = "\n\n[ลูกค้าถามคำถามทั่วไป เช่น หมวดหมู่สินค้า วิธีสั่งซื้อ ทักทาย - ตอบตามข้อมูลร้านค้า ไม่ต้องแนะนำสินค้าเฉพาะ]" + cart_context
    elif intent == "select_variant" and order_product:
        variant_lines = []
        for v in order_product.get("variants", []):
            label = v.get("size") or v.get("unit") or v.get("sku") or ""
            variant_lines.append(f"- {label}: {v['price']:.0f} บาท")
        variants_text = "\n".join(variant_lines)
        intent_hint = f"\n\n[สินค้า {order_product['name']} มีหลายขนาด/ตัวเลือก กรุณาแนะนำให้ลูกค้าเลือกขนาดที่ต้องการ:\n{variants_text}\nห้ามเพิ่มสินค้าลงตะกร้าอัตโนมัติ ให้ลูกค้าเลือกก่อน]"
    elif intent == "order" and order_product:
        intent_hint = f"\n\n[ลูกค้ากำลังสั่งซื้อสินค้า: {order_product['name']} จำนวน {quantity} ชิ้น - กรุณายืนยันการเพิ่มในตะกร้า ห้ามแนะนำสินค้าอื่น]"
    elif products_for_prompt:
        intent_hint = "\n\n[สำคัญ: ระบบค้นหาพบสินค้าที่เกี่ยวข้องแล้ว ห้ามตอบว่าไม่มีสินค้า ให้แนะนำสินค้าจากผลค้นหาด้านล่างนี้ให้ลูกค้า]"
    else:
        intent_hint = "\n\n[ระบบค้นหาไม่พบสินค้าที่ตรงกับคำถาม - แจ้งลูกค้าว่าไม่พบสินค้าและเสนอช่วยค้นหาอย่างอื่น]"

    # Get recent chat history for context
    history = await get_chat_history(db, session_id, limit=6)
    # Exclude the message we just saved (last one)
    history_for_prompt = history[:-1] if history else []

    messages = [
        {"role": "system", "content": f"{system_prompt}{intent_hint}\n\n{product_context}"},
    ]

    # Add conversation history
    for msg in history_for_prompt:
        if msg["role"] in ("user", "assistant"):
            messages.append({"role": msg["role"], "content": msg["content"]})

    # Add current user message
    messages.append({"role": "user", "content": user_message})

    # 5. Call Typhoon LLM
    try:
        assistant_response = await call_typhoon(messages)
    except Exception as e:
        print(f"[ERROR] Typhoon API failed: {e}")
        assistant_response = "ขออภัยค่ะ ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้งนะคะ"

    # 6. Save assistant response with product metadata
    metadata_dict = {}
    if intent == "checkout":
        metadata_dict["action"] = "show_addresses"
    elif intent == "select_variant" and order_product:
        metadata_dict["action"] = "select_variant"
        metadata_dict["order_product"] = order_product
    elif intent == "order" and order_product:
        metadata_dict["action"] = "add_to_cart"
        metadata_dict["order_product"] = order_product
        metadata_dict["quantity"] = quantity
    elif products:
        metadata_dict["products"] = products

    metadata = json.dumps(metadata_dict, ensure_ascii=False) if metadata_dict else None

    await db.execute(
        """INSERT INTO chat_messages (session_id, role, content, metadata)
           VALUES ($1, 'assistant', $2, $3)""",
        session_id,
        assistant_response,
        metadata,
    )

    # 7. Return response
    result = {
        "role": "assistant",
        "content": assistant_response,
        "products": [],
    }

    if intent == "checkout":
        result["action"] = "show_addresses"
    elif intent == "select_variant" and order_product:
        result["action"] = "select_variant"
        result["order_product"] = order_product
        result["variants"] = order_product.get("variants", [])
    elif intent == "order" and order_product:
        result["action"] = "add_to_cart"
        result["order_product"] = order_product
        result["quantity"] = quantity
    else:
        result["products"] = products if products else []

    return result
