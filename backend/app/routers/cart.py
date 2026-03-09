"""
Cart Router
จัดการตะกร้าสินค้า - รองรับทั้ง guest (cookie/localStorage) และ logged-in users (database)
Stock reservation: ตัด stock ทันทีเมื่อเพิ่มลงตะกร้า, hold 30 นาที, หมดเวลาคืน stock อัตโนมัติ
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, field_validator
from typing import List, Optional
import asyncpg

from app.database import get_db
from app.middleware.auth import get_current_user, get_optional_user

router = APIRouter(prefix="/api/cart", tags=["Cart"])


# =============================================
# Request/Response Models
# =============================================

class AddToCartRequest(BaseModel):
    variant_id: int
    quantity: int = 1

    @field_validator('quantity')
    @classmethod
    def validate_quantity(cls, v: int) -> int:
        if v < 1:
            raise ValueError("จำนวนต้องมากกว่า 0")
        if v > 999:
            raise ValueError("จำนวนสูงสุด 999 ชิ้น")
        return v


class UpdateCartItemRequest(BaseModel):
    quantity: int

    @field_validator('quantity')
    @classmethod
    def validate_quantity(cls, v: int) -> int:
        if v < 0:
            raise ValueError("จำนวนต้องไม่น้อยกว่า 0")
        if v > 999:
            raise ValueError("จำนวนสูงสุด 999 ชิ้น")
        return v


class SyncCartRequest(BaseModel):
    """Sync guest cart to database when user logs in"""
    items: List[dict]  # [{ variant_id: int, quantity: int }]


class CartItemResponse(BaseModel):
    variant_id: int
    product_id: int
    product_name: str
    variant_sku: Optional[str]
    price: float
    quantity: int
    stock_quantity: int
    image_url: Optional[str]
    unit: Optional[str]
    size: Optional[str]
    color: Optional[str]
    is_available: bool  # stock > 0 and is_active
    subtotal: float  # price * quantity


class CartResponse(BaseModel):
    items: List[CartItemResponse]
    total_items: int
    total_amount: float


# =============================================
# Helper Functions
# =============================================

async def get_or_create_cart(db: asyncpg.Connection, user_id: int) -> int:
    """Get existing cart or create new one for user"""
    cart = await db.fetchrow(
        "SELECT cart_id FROM carts WHERE user_id = $1",
        user_id
    )

    if cart:
        return cart["cart_id"]

    # Create new cart
    cart_id = await db.fetchval(
        "INSERT INTO carts (user_id) VALUES ($1) RETURNING cart_id",
        user_id
    )
    return cart_id


async def get_cart_items_from_db(db: asyncpg.Connection, cart_id: int) -> List[dict]:
    """Get cart items with product details"""
    query = """
        SELECT
            ci.variant_id,
            ci.quantity,
            p.product_id,
            p.name as product_name,
            pv.sku as variant_sku,
            pv.price,
            pv.stock_quantity,
            pv.image_url,
            pv.unit,
            pv.size,
            pv.color,
            pv.is_active,
            (pv.is_active) as is_available
        FROM cart_items ci
        JOIN product_variants pv ON ci.variant_id = pv.variant_id
        JOIN products p ON pv.product_id = p.product_id
        WHERE ci.cart_id = $1
        ORDER BY ci.id DESC
    """

    rows = await db.fetch(query, cart_id)

    items = []
    for row in rows:
        items.append({
            "variant_id": row["variant_id"],
            "product_id": row["product_id"],
            "product_name": row["product_name"],
            "variant_sku": row["variant_sku"],
            "price": float(row["price"]),
            "quantity": row["quantity"],
            "stock_quantity": row["stock_quantity"],
            "image_url": row["image_url"],
            "unit": row["unit"],
            "size": row["size"],
            "color": row["color"],
            "is_available": row["is_available"],
            "subtotal": float(row["price"]) * row["quantity"]
        })

    return items


def build_cart_response(items: List[dict]) -> CartResponse:
    """Build CartResponse from items list"""
    total_items = sum(item["quantity"] for item in items)
    total_amount = sum(item["subtotal"] for item in items)
    return CartResponse(items=items, total_items=total_items, total_amount=total_amount)


# =============================================
# Endpoints
# =============================================

@router.get("", response_model=CartResponse)
async def get_cart(
    current_user: dict = Depends(get_optional_user),
    db: asyncpg.Connection = Depends(get_db)
):
    """
    ดูตะกร้าสินค้า
    - Guest users: ส่ง cart ผ่าน localStorage (frontend จัดการเอง)
    - Logged-in users: ดึงจาก database
    """
    if not current_user:
        return CartResponse(items=[], total_items=0, total_amount=0.0)

    cart_id = await get_or_create_cart(db, current_user["user_id"])
    items = await get_cart_items_from_db(db, cart_id)
    return build_cart_response(items)


@router.post("/items", response_model=CartResponse)
async def add_to_cart(
    request: AddToCartRequest,
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db)
):
    """
    เพิ่มสินค้าลงตะกร้า + จอง stock ทันที
    - FOR UPDATE lock ป้องกัน race condition
    - ตัด stock จาก product_variants ทันที
    - ตั้ง reserved_at สำหรับ 30-min expiry
    """
    cart_id = await get_or_create_cart(db, current_user["user_id"])

    async with db.transaction():
        # Lock variant row to prevent race condition
        variant = await db.fetchrow(
            """SELECT variant_id, stock_quantity, price, is_active
               FROM product_variants
               WHERE variant_id = $1
               FOR UPDATE""",
            request.variant_id
        )

        if not variant:
            raise HTTPException(status_code=404, detail="ไม่พบสินค้านี้")
        if not variant["is_active"]:
            raise HTTPException(status_code=400, detail="สินค้านี้ไม่พร้อมขาย")

        # Check existing cart item
        existing = await db.fetchrow(
            "SELECT quantity FROM cart_items WHERE cart_id = $1 AND variant_id = $2",
            cart_id, request.variant_id
        )

        quantity_to_reserve = request.quantity

        if existing:
            # Check total won't exceed available stock
            # Available = current stock_quantity (already reduced by existing reservation)
            if quantity_to_reserve > variant["stock_quantity"]:
                raise HTTPException(
                    status_code=400,
                    detail=f"สินค้าคงเหลือไม่เพียงพอ (เหลือ {variant['stock_quantity']} ชิ้น)"
                )

            # Deduct additional stock
            await db.execute(
                "UPDATE product_variants SET stock_quantity = stock_quantity - $1 WHERE variant_id = $2",
                quantity_to_reserve, request.variant_id
            )

            # Update cart item quantity + reset reservation timer
            await db.execute(
                """UPDATE cart_items SET quantity = quantity + $1, reserved_at = NOW()
                   WHERE cart_id = $2 AND variant_id = $3""",
                quantity_to_reserve, cart_id, request.variant_id
            )
        else:
            if quantity_to_reserve > variant["stock_quantity"]:
                raise HTTPException(
                    status_code=400,
                    detail=f"สินค้าคงเหลือไม่เพียงพอ (เหลือ {variant['stock_quantity']} ชิ้น)"
                )

            # Deduct stock (reserve)
            await db.execute(
                "UPDATE product_variants SET stock_quantity = stock_quantity - $1 WHERE variant_id = $2",
                quantity_to_reserve, request.variant_id
            )

            # Insert new cart item with reservation
            await db.execute(
                """INSERT INTO cart_items (cart_id, variant_id, quantity, reserved_at)
                   VALUES ($1, $2, $3, NOW())""",
                cart_id, request.variant_id, quantity_to_reserve
            )

    # Return updated cart
    items = await get_cart_items_from_db(db, cart_id)
    return build_cart_response(items)


@router.put("/items/{variant_id}", response_model=CartResponse)
async def update_cart_item(
    variant_id: int,
    request: UpdateCartItemRequest,
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db)
):
    """
    แก้ไขจำนวนสินค้าในตะกร้า + ปรับ stock reservation
    - quantity = 0 → ลบออก + คืน stock
    - quantity เพิ่ม → ตัด stock เพิ่ม
    - quantity ลด → คืน stock ส่วนต่าง
    """
    cart_id = await get_or_create_cart(db, current_user["user_id"])

    async with db.transaction():
        # Lock variant
        variant = await db.fetchrow(
            "SELECT stock_quantity, is_active FROM product_variants WHERE variant_id = $1 FOR UPDATE",
            variant_id
        )
        if not variant:
            raise HTTPException(status_code=404, detail="ไม่พบสินค้านี้")

        # Get existing cart item
        existing = await db.fetchrow(
            "SELECT quantity FROM cart_items WHERE cart_id = $1 AND variant_id = $2",
            cart_id, variant_id
        )
        if not existing:
            raise HTTPException(status_code=404, detail="ไม่พบสินค้าในตะกร้า")

        if request.quantity == 0:
            # Remove: return ALL reserved stock
            await db.execute(
                "UPDATE product_variants SET stock_quantity = stock_quantity + $1 WHERE variant_id = $2",
                existing["quantity"], variant_id
            )
            await db.execute(
                "DELETE FROM cart_items WHERE cart_id = $1 AND variant_id = $2",
                cart_id, variant_id
            )
        else:
            delta = request.quantity - existing["quantity"]

            if delta > 0:
                # Increasing: need more stock
                if not variant["is_active"]:
                    raise HTTPException(status_code=400, detail="สินค้านี้ไม่พร้อมขาย")
                if delta > variant["stock_quantity"]:
                    raise HTTPException(
                        status_code=400,
                        detail=f"สินค้าคงเหลือไม่เพียงพอ (เหลือ {variant['stock_quantity']} ชิ้น)"
                    )
                await db.execute(
                    "UPDATE product_variants SET stock_quantity = stock_quantity - $1 WHERE variant_id = $2",
                    delta, variant_id
                )
            elif delta < 0:
                # Decreasing: return stock
                await db.execute(
                    "UPDATE product_variants SET stock_quantity = stock_quantity + $1 WHERE variant_id = $2",
                    abs(delta), variant_id
                )

            # Update quantity + reset reservation timer
            await db.execute(
                """UPDATE cart_items SET quantity = $1, reserved_at = NOW()
                   WHERE cart_id = $2 AND variant_id = $3""",
                request.quantity, cart_id, variant_id
            )

    items = await get_cart_items_from_db(db, cart_id)
    return build_cart_response(items)


@router.delete("/items/{variant_id}", response_model=CartResponse)
async def remove_from_cart(
    variant_id: int,
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db)
):
    """ลบสินค้าออกจากตะกร้า + คืน stock ที่จองไว้"""
    cart_id = await get_or_create_cart(db, current_user["user_id"])

    async with db.transaction():
        # Get item quantity before delete
        item = await db.fetchrow(
            "SELECT quantity FROM cart_items WHERE cart_id = $1 AND variant_id = $2",
            cart_id, variant_id
        )
        if not item:
            raise HTTPException(status_code=404, detail="ไม่พบสินค้าในตะกร้า")

        # Return reserved stock
        await db.execute(
            "UPDATE product_variants SET stock_quantity = stock_quantity + $1 WHERE variant_id = $2",
            item["quantity"], variant_id
        )

        # Delete cart item
        await db.execute(
            "DELETE FROM cart_items WHERE cart_id = $1 AND variant_id = $2",
            cart_id, variant_id
        )

    items = await get_cart_items_from_db(db, cart_id)
    return build_cart_response(items)


@router.post("/sync", response_model=CartResponse)
async def sync_cart(
    request: SyncCartRequest,
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db)
):
    """
    Sync guest cart to database when user logs in
    - Merge guest cart items with database cart
    - Reserve stock for each synced item
    """
    cart_id = await get_or_create_cart(db, current_user["user_id"])

    async with db.transaction():
        for item in request.items:
            variant_id = item.get("variant_id")
            quantity = item.get("quantity", 1)

            if not variant_id or quantity < 1:
                continue

            # Lock variant row
            variant = await db.fetchrow(
                "SELECT stock_quantity, is_active FROM product_variants WHERE variant_id = $1 FOR UPDATE",
                variant_id
            )

            if not variant or not variant["is_active"]:
                continue

            existing = await db.fetchrow(
                "SELECT quantity FROM cart_items WHERE cart_id = $1 AND variant_id = $2",
                cart_id, variant_id
            )

            if existing:
                # Merge: add guest quantity to existing (cap at available stock)
                additional = min(quantity, variant["stock_quantity"])
                if additional <= 0:
                    continue

                await db.execute(
                    "UPDATE product_variants SET stock_quantity = stock_quantity - $1 WHERE variant_id = $2",
                    additional, variant_id
                )
                await db.execute(
                    """UPDATE cart_items SET quantity = quantity + $1, reserved_at = NOW()
                       WHERE cart_id = $2 AND variant_id = $3""",
                    additional, cart_id, variant_id
                )
            else:
                # New item: cap at available stock
                final_quantity = min(quantity, variant["stock_quantity"])
                if final_quantity <= 0:
                    continue

                await db.execute(
                    "UPDATE product_variants SET stock_quantity = stock_quantity - $1 WHERE variant_id = $2",
                    final_quantity, variant_id
                )
                await db.execute(
                    """INSERT INTO cart_items (cart_id, variant_id, quantity, reserved_at)
                       VALUES ($1, $2, $3, NOW())""",
                    cart_id, variant_id, final_quantity
                )

    items = await get_cart_items_from_db(db, cart_id)
    return build_cart_response(items)


@router.delete("", response_model=dict)
async def clear_cart(
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db)
):
    """ล้างตะกร้าทั้งหมด + คืน stock ที่จองไว้"""
    cart_id = await get_or_create_cart(db, current_user["user_id"])

    async with db.transaction():
        # Return all reserved stock in one query
        await db.execute(
            """UPDATE product_variants pv
               SET stock_quantity = stock_quantity + ci.quantity
               FROM cart_items ci
               WHERE ci.variant_id = pv.variant_id AND ci.cart_id = $1""",
            cart_id
        )

        await db.execute("DELETE FROM cart_items WHERE cart_id = $1", cart_id)

    return {"message": "ล้างตะกร้าสำเร็จ"}
