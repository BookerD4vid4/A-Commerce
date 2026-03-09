"""
Admin Panel API endpoints
จัดการระบบหลังบ้านสำหรับ admin
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime, date, time
from decimal import Decimal
import asyncpg

from app.middleware.auth import require_admin
from app.database import get_db
from app.services.embedding_service import generate_all_product_embeddings, generate_product_embedding

router = APIRouter(prefix="/api/admin", tags=["Admin"])


# =============================================
# Pydantic Models
# =============================================

class DashboardStats(BaseModel):
    total_users: int
    total_orders: int
    total_revenue: Decimal
    total_products: int
    orders_by_status: dict
    recent_orders: list
    low_stock_alerts: list


class UserListItem(BaseModel):
    user_id: int
    phone_number: str
    full_name: Optional[str]
    role: str
    is_active: bool
    order_count: int
    total_spent: Decimal
    last_login_at: Optional[datetime]
    created_at: datetime


class UserListResponse(BaseModel):
    users: List[UserListItem]
    total: int
    page: int
    page_size: int


class UpdateUserRequest(BaseModel):
    role: Optional[str] = None
    is_active: Optional[bool] = None


class AdminOrderListItem(BaseModel):
    order_id: int
    user_name: Optional[str]
    user_phone: str
    total_amount: Decimal
    status: str
    payment_status: str
    items_count: int
    created_at: datetime


class AdminOrderListResponse(BaseModel):
    orders: List[AdminOrderListItem]
    total: int
    page: int
    page_size: int


class AdminOrderItemDetail(BaseModel):
    variant_id: int
    product_name: str
    price: Decimal
    quantity: int
    image_url: Optional[str]


class AdminOrderDetail(BaseModel):
    order_id: int
    user_id: int
    user_name: Optional[str]
    user_phone: str
    total_amount: Decimal
    status: str
    payment_status: str
    payment_method: Optional[str]
    shipping_address: Optional[dict]
    items: List[AdminOrderItemDetail]
    created_at: datetime
    updated_at: datetime


class UpdateOrderStatusRequest(BaseModel):
    status: str = Field(..., pattern="^(pending|confirmed|preparing|shipping|delivered|cancelled)$")


class PromptItem(BaseModel):
    prompt_id: int
    prompt_type: str
    category_id: Optional[int]
    product_id: Optional[int]
    prompt_text: str
    is_active: bool


class UpdatePromptRequest(BaseModel):
    prompt_text: str


class CreatePromptRequest(BaseModel):
    prompt_type: str = Field(..., pattern="^(system|category|product_specific)$")
    prompt_text: str
    category_id: Optional[int] = None
    product_id: Optional[int] = None


class ReportSummary(BaseModel):
    revenue_by_period: list
    top_products: list
    orders_over_time: list


# -- Product Management Models --

class AdminProductListItem(BaseModel):
    product_id: int
    name: str
    category_name: Optional[str]
    variant_count: int
    min_price: Optional[Decimal]
    max_price: Optional[Decimal]
    total_stock: int
    image_url: Optional[str]
    is_active: bool


class AdminProductListResponse(BaseModel):
    products: List[AdminProductListItem]
    total: int
    page: int
    page_size: int


class AdminVariantDetail(BaseModel):
    variant_id: int
    sku: Optional[str]
    price: Decimal
    stock_quantity: int
    image_url: Optional[str]
    unit: Optional[str]
    size: Optional[str]
    color: Optional[str]
    is_active: bool


class AdminProductDetail(BaseModel):
    product_id: int
    name: str
    description: Optional[str]
    marketing_copy: Optional[str]
    category_id: Optional[int]
    category_name: Optional[str]
    is_active: bool
    variants: List[AdminVariantDetail]
    created_at: datetime
    updated_at: datetime


class CreateVariantRequest(BaseModel):
    sku: Optional[str] = None
    price: Decimal
    stock_quantity: int = 0
    image_url: Optional[str] = None
    unit: Optional[str] = None
    size: Optional[str] = None
    color: Optional[str] = None


class CreateProductRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    marketing_copy: Optional[str] = None
    category_id: Optional[int] = None
    variants: List[CreateVariantRequest] = []


class UpdateProductRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    marketing_copy: Optional[str] = None
    category_id: Optional[int] = None
    is_active: Optional[bool] = None


class UpdateVariantRequest(BaseModel):
    sku: Optional[str] = None
    price: Optional[Decimal] = None
    stock_quantity: Optional[int] = None
    image_url: Optional[str] = None
    unit: Optional[str] = None
    size: Optional[str] = None
    color: Optional[str] = None
    is_active: Optional[bool] = None


# =============================================
# Dashboard
# =============================================

@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard(
    user: dict = Depends(require_admin),
    db: asyncpg.Connection = Depends(get_db),
):
    # Aggregate counts
    stats = await db.fetchrow("""
        SELECT
            (SELECT COUNT(*) FROM users) as total_users,
            (SELECT COUNT(*) FROM orders) as total_orders,
            (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status != 'cancelled') as total_revenue,
            (SELECT COUNT(*) FROM products WHERE is_active = TRUE) as total_products
    """)

    # Orders by status
    status_rows = await db.fetch(
        "SELECT status, COUNT(*) as count FROM orders GROUP BY status"
    )
    orders_by_status = {row["status"]: row["count"] for row in status_rows}

    # Recent 5 orders
    recent = await db.fetch("""
        SELECT o.order_id, u.full_name, u.phone_number, o.total_amount,
               o.status, o.payment_status, o.created_at
        FROM orders o
        JOIN users u ON o.user_id = u.user_id
        ORDER BY o.created_at DESC LIMIT 5
    """)

    # Low stock alerts
    low_stock = await db.fetch("""
        SELECT pv.variant_id, p.name as product_name, pv.sku,
               pv.stock_quantity, pv.unit, pv.size
        FROM product_variants pv
        JOIN products p ON pv.product_id = p.product_id
        WHERE pv.stock_quantity < 10 AND pv.is_active = TRUE
        ORDER BY pv.stock_quantity ASC LIMIT 20
    """)

    return DashboardStats(
        total_users=stats["total_users"],
        total_orders=stats["total_orders"],
        total_revenue=stats["total_revenue"],
        total_products=stats["total_products"],
        orders_by_status=orders_by_status,
        recent_orders=[dict(r) for r in recent],
        low_stock_alerts=[dict(r) for r in low_stock],
    )


# =============================================
# Members / Users
# =============================================

@router.get("/users", response_model=UserListResponse)
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    user: dict = Depends(require_admin),
    db: asyncpg.Connection = Depends(get_db),
):
    where_clause = ""
    params: list = []
    idx = 1

    if search:
        where_clause = f"WHERE u.full_name ILIKE ${idx} OR u.phone_number ILIKE ${idx}"
        params.append(f"%{search}%")
        idx += 1

    total = await db.fetchval(
        f"SELECT COUNT(*) FROM users u {where_clause}", *params
    )

    query = f"""
        SELECT u.user_id, u.phone_number, u.full_name, u.role, u.is_active,
               u.last_login_at, u.created_at,
               COUNT(o.order_id) as order_count,
               COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN o.total_amount ELSE 0 END), 0) as total_spent
        FROM users u
        LEFT JOIN orders o ON u.user_id = o.user_id
        {where_clause}
        GROUP BY u.user_id
        ORDER BY u.created_at DESC
        LIMIT ${idx} OFFSET ${idx + 1}
    """
    params.extend([page_size, (page - 1) * page_size])
    rows = await db.fetch(query, *params)

    return UserListResponse(
        users=[UserListItem(**dict(r)) for r in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/users/{user_id}", response_model=UserListItem)
async def get_user_detail(
    user_id: int,
    user: dict = Depends(require_admin),
    db: asyncpg.Connection = Depends(get_db),
):
    row = await db.fetchrow("""
        SELECT u.user_id, u.phone_number, u.full_name, u.role, u.is_active,
               u.last_login_at, u.created_at,
               COUNT(o.order_id) as order_count,
               COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN o.total_amount ELSE 0 END), 0) as total_spent
        FROM users u
        LEFT JOIN orders o ON u.user_id = o.user_id
        WHERE u.user_id = $1
        GROUP BY u.user_id
    """, user_id)

    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return UserListItem(**dict(row))


@router.patch("/users/{user_id}")
async def update_user(
    user_id: int,
    body: UpdateUserRequest,
    user: dict = Depends(require_admin),
    db: asyncpg.Connection = Depends(get_db),
):
    # Prevent admin from demoting or deactivating themselves
    if user_id == user["user_id"]:
        if body.role is not None and body.role != "admin":
            raise HTTPException(status_code=400, detail="Cannot change your own role")
        if body.is_active is False:
            raise HTTPException(status_code=400, detail="Cannot deactivate your own account")

    updates = []
    params: list = []
    idx = 1

    if body.role is not None:
        if body.role not in ("user", "admin"):
            raise HTTPException(status_code=400, detail="Invalid role")
        updates.append(f"role = ${idx}")
        params.append(body.role)
        idx += 1

    if body.is_active is not None:
        updates.append(f"is_active = ${idx}")
        params.append(body.is_active)
        idx += 1

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    params.append(user_id)
    query = f"UPDATE users SET {', '.join(updates)}, updated_at = NOW() WHERE user_id = ${idx}"
    result = await db.execute(query, *params)

    if result == "UPDATE 0":
        raise HTTPException(status_code=404, detail="User not found")

    return {"message": "User updated", "user_id": user_id}


# =============================================
# Orders Management
# =============================================

@router.get("/orders", response_model=AdminOrderListResponse)
async def list_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = Query(None, alias="status"),
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    user: dict = Depends(require_admin),
    db: asyncpg.Connection = Depends(get_db),
):
    conditions: list[str] = []
    params: list = []
    idx = 1

    if status_filter:
        conditions.append(f"o.status = ${idx}")
        params.append(status_filter)
        idx += 1
    if date_from:
        conditions.append(f"o.created_at >= ${idx}")
        params.append(datetime.combine(date_from, time.min))
        idx += 1
    if date_to:
        conditions.append(f"o.created_at <= ${idx}")
        params.append(datetime.combine(date_to, time(23, 59, 59)))
        idx += 1

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""

    total = await db.fetchval(
        f"SELECT COUNT(*) FROM orders o {where}", *params
    )

    params.extend([page_size, (page - 1) * page_size])
    query = f"""
        SELECT o.order_id, u.full_name as user_name, u.phone_number as user_phone,
               o.total_amount, o.status, o.payment_status, o.created_at,
               COUNT(oi.id) as items_count
        FROM orders o
        JOIN users u ON o.user_id = u.user_id
        LEFT JOIN order_items oi ON o.order_id = oi.order_id
        {where}
        GROUP BY o.order_id, u.full_name, u.phone_number
        ORDER BY o.created_at DESC
        LIMIT ${idx} OFFSET ${idx + 1}
    """
    rows = await db.fetch(query, *params)

    return AdminOrderListResponse(
        orders=[AdminOrderListItem(**dict(r)) for r in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/orders/{order_id}", response_model=AdminOrderDetail)
async def get_order_detail(
    order_id: int,
    user: dict = Depends(require_admin),
    db: asyncpg.Connection = Depends(get_db),
):
    order = await db.fetchrow("""
        SELECT o.order_id, o.user_id, o.total_amount, o.status, o.payment_status,
               o.created_at, o.updated_at,
               u.full_name as user_name, u.phone_number as user_phone,
               p.method as payment_method,
               ua.recipient_name, ua.phone_number as addr_phone, ua.address_line,
               ua.subdistrict, ua.district, ua.province, ua.postal_code
        FROM orders o
        JOIN users u ON o.user_id = u.user_id
        LEFT JOIN payments p ON o.order_id = p.order_id
        LEFT JOIN user_addresses ua ON o.shipping_address_id = ua.address_id
        WHERE o.order_id = $1
    """, order_id)

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    items = await db.fetch("""
        SELECT oi.variant_id, oi.product_name, oi.price, oi.quantity,
               pv.image_url
        FROM order_items oi
        LEFT JOIN product_variants pv ON oi.variant_id = pv.variant_id
        WHERE oi.order_id = $1
    """, order_id)

    shipping_address = None
    if order["recipient_name"]:
        shipping_address = {
            "recipient_name": order["recipient_name"],
            "phone_number": order["addr_phone"],
            "address_line": order["address_line"],
            "subdistrict": order["subdistrict"],
            "district": order["district"],
            "province": order["province"],
            "postal_code": order["postal_code"],
        }

    return AdminOrderDetail(
        order_id=order["order_id"],
        user_id=order["user_id"],
        user_name=order["user_name"],
        user_phone=order["user_phone"],
        total_amount=order["total_amount"],
        status=order["status"],
        payment_status=order["payment_status"],
        payment_method=order["payment_method"],
        shipping_address=shipping_address,
        items=[AdminOrderItemDetail(**dict(i)) for i in items],
        created_at=order["created_at"],
        updated_at=order["updated_at"],
    )


@router.patch("/orders/{order_id}/status")
async def update_order_status(
    order_id: int,
    body: UpdateOrderStatusRequest,
    user: dict = Depends(require_admin),
    db: asyncpg.Connection = Depends(get_db),
):
    valid_transitions = {
        "pending": ["confirmed", "preparing", "shipping", "delivered", "cancelled"],
        "confirmed": ["pending", "preparing", "shipping", "delivered", "cancelled"],
        "preparing": ["pending", "confirmed", "shipping", "delivered", "cancelled"],
        "shipping": ["pending", "confirmed", "preparing", "delivered", "cancelled"],
        "delivered": ["pending", "confirmed", "preparing", "shipping", "cancelled"],
        "cancelled": ["pending", "confirmed", "preparing", "shipping", "delivered"],
    }

    current = await db.fetchrow(
        "SELECT status FROM orders WHERE order_id = $1", order_id
    )
    if not current:
        raise HTTPException(status_code=404, detail="Order not found")

    if body.status not in valid_transitions.get(current["status"], []):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot change from {current['status']} to {body.status}",
        )

    async with db.transaction():
        await db.execute(
            "UPDATE orders SET status = $1, updated_at = NOW() WHERE order_id = $2",
            body.status, order_id,
        )

        # Restore stock when cancelling (from non-cancelled status)
        if body.status == "cancelled" and current["status"] != "cancelled":
            await db.execute("""
                UPDATE product_variants pv
                SET stock_quantity = stock_quantity + oi.quantity
                FROM order_items oi
                WHERE oi.variant_id = pv.variant_id AND oi.order_id = $1
            """, order_id)

        # Deduct stock when un-cancelling (from cancelled to any active status)
        if current["status"] == "cancelled" and body.status != "cancelled":
            await db.execute("""
                UPDATE product_variants pv
                SET stock_quantity = stock_quantity - oi.quantity
                FROM order_items oi
                WHERE oi.variant_id = pv.variant_id AND oi.order_id = $1
            """, order_id)

    return {"message": "Status updated", "order_id": order_id, "status": body.status}


# =============================================
# Chatbot Settings
# =============================================

@router.get("/chatbot/prompts", response_model=List[PromptItem])
async def list_prompts(
    user: dict = Depends(require_admin),
    db: asyncpg.Connection = Depends(get_db),
):
    rows = await db.fetch("""
        SELECT prompt_id, prompt_type, category_id, product_id, prompt_text, is_active
        FROM chatbot_prompts ORDER BY prompt_id
    """)
    return [PromptItem(**dict(r)) for r in rows]


@router.put("/chatbot/prompts/{prompt_id}")
async def update_prompt(
    prompt_id: int,
    body: UpdatePromptRequest,
    user: dict = Depends(require_admin),
    db: asyncpg.Connection = Depends(get_db),
):
    result = await db.execute(
        "UPDATE chatbot_prompts SET prompt_text = $1, updated_at = NOW() WHERE prompt_id = $2",
        body.prompt_text, prompt_id,
    )
    if result == "UPDATE 0":
        raise HTTPException(status_code=404, detail="Prompt not found")
    return {"message": "Prompt updated", "prompt_id": prompt_id}


@router.post("/chatbot/prompts", response_model=PromptItem)
async def create_prompt(
    body: CreatePromptRequest,
    user: dict = Depends(require_admin),
    db: asyncpg.Connection = Depends(get_db),
):
    row = await db.fetchrow("""
        INSERT INTO chatbot_prompts (prompt_type, prompt_text, category_id, product_id, is_active)
        VALUES ($1, $2, $3, $4, TRUE)
        RETURNING prompt_id, prompt_type, category_id, product_id, prompt_text, is_active
    """, body.prompt_type, body.prompt_text, body.category_id, body.product_id)
    return PromptItem(**dict(row))


@router.post("/chatbot/embeddings/regenerate")
async def regenerate_embeddings(
    user: dict = Depends(require_admin),
    db: asyncpg.Connection = Depends(get_db),
):
    result = await generate_all_product_embeddings(db)
    return result


# =============================================
# Products Management
# =============================================

@router.get("/products", response_model=AdminProductListResponse)
async def list_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    category_id: Optional[int] = None,
    user: dict = Depends(require_admin),
    db: asyncpg.Connection = Depends(get_db),
):
    conditions: list[str] = []
    params: list = []
    idx = 1

    if search:
        conditions.append(f"p.name ILIKE ${idx}")
        params.append(f"%{search}%")
        idx += 1
    if category_id is not None:
        conditions.append(f"p.category_id = ${idx}")
        params.append(category_id)
        idx += 1

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""

    total = await db.fetchval(
        f"SELECT COUNT(*) FROM products p {where}", *params
    )

    params.extend([page_size, (page - 1) * page_size])
    query = f"""
        SELECT p.product_id, p.name, c.name as category_name, p.is_active,
               COUNT(pv.variant_id) as variant_count,
               MIN(pv.price) as min_price,
               MAX(pv.price) as max_price,
               COALESCE(SUM(pv.stock_quantity), 0) as total_stock,
               (SELECT v2.image_url FROM product_variants v2
                WHERE v2.product_id = p.product_id AND v2.image_url IS NOT NULL
                LIMIT 1) as image_url
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.category_id
        LEFT JOIN product_variants pv ON p.product_id = pv.product_id
        {where}
        GROUP BY p.product_id, p.name, c.name, p.is_active
        ORDER BY p.product_id DESC
        LIMIT ${idx} OFFSET ${idx + 1}
    """
    rows = await db.fetch(query, *params)

    return AdminProductListResponse(
        products=[AdminProductListItem(**dict(r)) for r in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/products/{product_id}", response_model=AdminProductDetail)
async def get_product(
    product_id: int,
    user: dict = Depends(require_admin),
    db: asyncpg.Connection = Depends(get_db),
):
    product = await db.fetchrow("""
        SELECT p.product_id, p.name, p.description, p.marketing_copy,
               p.category_id, c.name as category_name, p.is_active,
               p.created_at, p.updated_at
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.category_id
        WHERE p.product_id = $1
    """, product_id)

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    variants = await db.fetch("""
        SELECT variant_id, sku, price, stock_quantity, image_url,
               unit, size, color, is_active
        FROM product_variants
        WHERE product_id = $1
        ORDER BY variant_id
    """, product_id)

    return AdminProductDetail(
        **dict(product),
        variants=[AdminVariantDetail(**dict(v)) for v in variants],
    )


@router.post("/products", response_model=AdminProductDetail)
async def create_product(
    body: CreateProductRequest,
    user: dict = Depends(require_admin),
    db: asyncpg.Connection = Depends(get_db),
):
    async with db.transaction():
        product = await db.fetchrow("""
            INSERT INTO products (name, description, marketing_copy, category_id)
            VALUES ($1, $2, $3, $4)
            RETURNING product_id, name, description, marketing_copy, category_id,
                      is_active, created_at, updated_at
        """, body.name, body.description, body.marketing_copy, body.category_id)

        variants = []
        for v in body.variants:
            row = await db.fetchrow("""
                INSERT INTO product_variants (product_id, sku, price, stock_quantity,
                    image_url, unit, size, color)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING variant_id, sku, price, stock_quantity, image_url,
                          unit, size, color, is_active
            """, product["product_id"], v.sku, v.price, v.stock_quantity,
                v.image_url, v.unit, v.size, v.color)
            variants.append(AdminVariantDetail(**dict(row)))

    # Auto-generate embedding for chatbot search
    await generate_product_embedding(db, product["product_id"])

    category_name = None
    if body.category_id:
        cat = await db.fetchval(
            "SELECT name FROM categories WHERE category_id = $1", body.category_id
        )
        category_name = cat

    return AdminProductDetail(
        **dict(product),
        category_name=category_name,
        variants=variants,
    )


@router.put("/products/{product_id}")
async def update_product(
    product_id: int,
    body: UpdateProductRequest,
    user: dict = Depends(require_admin),
    db: asyncpg.Connection = Depends(get_db),
):
    updates = []
    params: list = []
    idx = 1

    for field in ["name", "description", "marketing_copy", "category_id", "is_active"]:
        value = getattr(body, field)
        if value is not None:
            updates.append(f"{field} = ${idx}")
            params.append(value)
            idx += 1

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    params.append(product_id)
    result = await db.execute(
        f"UPDATE products SET {', '.join(updates)}, updated_at = NOW() WHERE product_id = ${idx}",
        *params,
    )

    if result == "UPDATE 0":
        raise HTTPException(status_code=404, detail="Product not found")

    # Re-generate embedding if name/description/marketing_copy changed
    if any(getattr(body, f) is not None for f in ["name", "description", "marketing_copy"]):
        await generate_product_embedding(db, product_id)

    return {"message": "Product updated", "product_id": product_id}


@router.delete("/products/{product_id}")
async def delete_product(
    product_id: int,
    user: dict = Depends(require_admin),
    db: asyncpg.Connection = Depends(get_db),
):
    # Check if product has order items referencing its variants
    has_orders = await db.fetchval("""
        SELECT EXISTS(
            SELECT 1 FROM order_items oi
            JOIN product_variants pv ON oi.variant_id = pv.variant_id
            WHERE pv.product_id = $1
        )
    """, product_id)

    if has_orders:
        # Soft delete - just deactivate
        await db.execute(
            "UPDATE products SET is_active = FALSE, updated_at = NOW() WHERE product_id = $1",
            product_id,
        )
        return {"message": "Product deactivated (has order history)", "product_id": product_id}
    else:
        result = await db.execute(
            "DELETE FROM products WHERE product_id = $1", product_id
        )
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Product not found")
        return {"message": "Product deleted", "product_id": product_id}


@router.post("/products/{product_id}/variants", response_model=AdminVariantDetail)
async def create_variant(
    product_id: int,
    body: CreateVariantRequest,
    user: dict = Depends(require_admin),
    db: asyncpg.Connection = Depends(get_db),
):
    # Verify product exists
    exists = await db.fetchval(
        "SELECT EXISTS(SELECT 1 FROM products WHERE product_id = $1)", product_id
    )
    if not exists:
        raise HTTPException(status_code=404, detail="Product not found")

    try:
        row = await db.fetchrow("""
            INSERT INTO product_variants (product_id, sku, price, stock_quantity,
                image_url, unit, size, color)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING variant_id, sku, price, stock_quantity, image_url,
                      unit, size, color, is_active
        """, product_id, body.sku, body.price, body.stock_quantity,
            body.image_url, body.unit, body.size, body.color)
    except asyncpg.UniqueViolationError:
        raise HTTPException(status_code=400, detail="SKU นี้ถูกใช้งานแล้ว กรุณาใช้ SKU อื่น")

    return AdminVariantDetail(**dict(row))


@router.put("/variants/{variant_id}")
async def update_variant(
    variant_id: int,
    body: UpdateVariantRequest,
    user: dict = Depends(require_admin),
    db: asyncpg.Connection = Depends(get_db),
):
    updates = []
    params: list = []
    idx = 1

    for field in ["sku", "price", "stock_quantity", "image_url", "unit", "size", "color", "is_active"]:
        value = getattr(body, field)
        if value is not None:
            updates.append(f"{field} = ${idx}")
            params.append(value)
            idx += 1

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    params.append(variant_id)
    try:
        result = await db.execute(
            f"UPDATE product_variants SET {', '.join(updates)}, updated_at = NOW() WHERE variant_id = ${idx}",
            *params,
        )
    except asyncpg.UniqueViolationError:
        raise HTTPException(status_code=400, detail="SKU นี้ถูกใช้งานแล้ว กรุณาใช้ SKU อื่น")

    if result == "UPDATE 0":
        raise HTTPException(status_code=404, detail="Variant not found")

    return {"message": "Variant updated", "variant_id": variant_id}


@router.delete("/variants/{variant_id}")
async def delete_variant(
    variant_id: int,
    user: dict = Depends(require_admin),
    db: asyncpg.Connection = Depends(get_db),
):
    # Check if variant has order items
    has_orders = await db.fetchval(
        "SELECT EXISTS(SELECT 1 FROM order_items WHERE variant_id = $1)", variant_id
    )

    if has_orders:
        await db.execute(
            "UPDATE product_variants SET is_active = FALSE, updated_at = NOW() WHERE variant_id = $1",
            variant_id,
        )
        return {"message": "Variant deactivated (has order history)", "variant_id": variant_id}
    else:
        result = await db.execute(
            "DELETE FROM product_variants WHERE variant_id = $1", variant_id
        )
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Variant not found")
        return {"message": "Variant deleted", "variant_id": variant_id}


# =============================================
# Reports
# =============================================

@router.get("/reports/summary", response_model=ReportSummary)
async def get_reports(
    period: str = Query("daily", pattern="^(daily|weekly|monthly)$"),
    user: dict = Depends(require_admin),
    db: asyncpg.Connection = Depends(get_db),
):
    trunc = {"daily": "day", "weekly": "week", "monthly": "month"}[period]

    # Revenue by period
    revenue = await db.fetch(f"""
        SELECT date_trunc('{trunc}', created_at) as period,
               SUM(total_amount) as revenue
        FROM orders WHERE status != 'cancelled'
        GROUP BY period ORDER BY period DESC LIMIT 30
    """)

    # Top 10 products
    top = await db.fetch("""
        SELECT oi.product_name, SUM(oi.quantity) as total_sold,
               SUM(oi.price * oi.quantity) as total_revenue
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.order_id
        WHERE o.status != 'cancelled'
        GROUP BY oi.product_name
        ORDER BY total_sold DESC LIMIT 10
    """)

    # Orders count over time
    orders_time = await db.fetch(f"""
        SELECT date_trunc('{trunc}', created_at) as period, COUNT(*) as count
        FROM orders
        GROUP BY period ORDER BY period DESC LIMIT 30
    """)

    return ReportSummary(
        revenue_by_period=[
            {"period": str(r["period"].date()) if r["period"] else "", "revenue": float(r["revenue"])}
            for r in revenue
        ],
        top_products=[dict(r) for r in top],
        orders_over_time=[
            {"period": str(r["period"].date()) if r["period"] else "", "count": r["count"]}
            for r in orders_time
        ],
    )

