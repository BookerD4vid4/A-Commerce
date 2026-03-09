"""
Orders API endpoints
Handles order creation, order history, and order management
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime
from decimal import Decimal

from app.middleware.auth import get_current_user
from app.database import get_db

router = APIRouter(prefix="/api/orders", tags=["Orders"])


# =============================================
# Pydantic Models
# =============================================

class OrderItemCreate(BaseModel):
    variant_id: int
    quantity: int = Field(gt=0)


class CreateOrderRequest(BaseModel):
    shipping_address_id: int
    payment_method: str = Field(..., pattern="^(promptpay_qr|cod)$")
    items: Optional[List[OrderItemCreate]] = None  # If None, use cart items


class OrderItemResponse(BaseModel):
    variant_id: int
    product_name: str
    price: float
    quantity: int
    image_url: Optional[str]

    class Config:
        from_attributes = True


class OrderResponse(BaseModel):
    order_id: int
    total_amount: float
    status: str
    payment_status: str
    payment_method: str
    shipping_address: dict
    items: List[OrderItemResponse]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class OrderListItem(BaseModel):
    order_id: int
    total_amount: float
    status: str
    payment_status: str
    items_count: int
    created_at: datetime


# =============================================
# Endpoints
# =============================================

@router.post("/", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    request: CreateOrderRequest,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Create new order from cart or specified items

    Flow:
    1. Validate address belongs to user
    2. Get items from cart or request
    3. Calculate total amount
    4. Check stock availability
    5. Create order + order_items
    6. Create payment record
    7. Reduce stock quantities
    8. Clear cart (if using cart)
    9. Create shipment record
    """
    user_id = current_user["user_id"]

    # Step 1: Validate address
    address = await db.fetchrow(
        """
        SELECT address_id, recipient_name, phone_number,
               address_line, subdistrict, district, province, postal_code
        FROM user_addresses
        WHERE address_id = $1 AND user_id = $2
        """,
        request.shipping_address_id, user_id
    )

    if not address:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Address not found or doesn't belong to you"
        )

    # Step 2: Get items (from cart or request)
    if request.items:
        # Use items from request
        items_data = []
        for item in request.items:
            variant = await db.fetchrow(
                """
                SELECT pv.variant_id, pv.price, pv.stock_quantity, pv.image_url,
                       p.name as product_name
                FROM product_variants pv
                JOIN products p ON pv.product_id = p.product_id
                WHERE pv.variant_id = $1 AND pv.is_active = TRUE
                """,
                item.variant_id
            )

            if not variant:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Product variant {item.variant_id} not found"
                )

            items_data.append({
                "variant_id": item.variant_id,
                "quantity": item.quantity,
                "price": variant["price"],
                "product_name": variant["product_name"],
                "stock_quantity": variant["stock_quantity"],
                "image_url": variant["image_url"]
            })
    else:
        # Get items from cart
        cart = await db.fetchrow(
            "SELECT cart_id FROM carts WHERE user_id = $1",
            user_id
        )

        if not cart:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cart is empty"
            )

        cart_items = await db.fetch(
            """
            SELECT ci.variant_id, ci.quantity, pv.price, pv.stock_quantity,
                   pv.image_url, p.name as product_name
            FROM cart_items ci
            JOIN product_variants pv ON ci.variant_id = pv.variant_id
            JOIN products p ON pv.product_id = p.product_id
            WHERE ci.cart_id = $1 AND pv.is_active = TRUE
            """,
            cart["cart_id"]
        )

        if not cart_items:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cart is empty"
            )

        items_data = [dict(item) for item in cart_items]

    # Step 3: Calculate total and check stock
    # For cart orders: stock is already reserved (deducted when added to cart)
    # For direct orders (request.items): stock must be checked now
    is_cart_order = not request.items
    total_amount = Decimal("0.00")

    for item in items_data:
        if not is_cart_order:
            # Direct order: validate stock (not yet reserved)
            if item["quantity"] > item["stock_quantity"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Not enough stock for {item['product_name']} (available: {item['stock_quantity']})"
                )
        total_amount += Decimal(str(item["price"])) * item["quantity"]

    # Step 4: Create order (use transaction)
    async with db.transaction():
        # Insert order
        order = await db.fetchrow(
            """
            INSERT INTO orders (user_id, shipping_address_id, total_amount, status, payment_status)
            VALUES ($1, $2, $3, 'pending', $4)
            RETURNING order_id, created_at, updated_at
            """,
            user_id,
            request.shipping_address_id,
            total_amount,
            "cod_pending" if request.payment_method == "cod" else "unpaid"
        )

        order_id = order["order_id"]

        # Insert order items
        order_items = []
        for item in items_data:
            await db.execute(
                """
                INSERT INTO order_items (order_id, variant_id, product_name, price, quantity)
                VALUES ($1, $2, $3, $4, $5)
                """,
                order_id,
                item["variant_id"],
                item["product_name"],
                item["price"],
                item["quantity"]
            )

            # Only deduct stock for direct orders (not cart orders)
            # Cart orders have stock already reserved when items were added to cart
            if not is_cart_order:
                await db.execute(
                    """
                    UPDATE product_variants
                    SET stock_quantity = stock_quantity - $1
                    WHERE variant_id = $2
                    """,
                    item["quantity"],
                    item["variant_id"]
                )

            order_items.append({
                "variant_id": item["variant_id"],
                "product_name": item["product_name"],
                "price": item["price"],
                "quantity": item["quantity"],
                "image_url": item["image_url"]
            })

        # Create payment record
        payment = await db.fetchrow(
            """
            INSERT INTO payments (order_id, method, amount, status)
            VALUES ($1, $2, $3, $4)
            RETURNING payment_id
            """,
            order_id,
            request.payment_method,
            total_amount,
            "pending"
        )

        # Create shipment record
        address_snapshot = f"{address['recipient_name']}\n{address['phone_number']}\n{address['address_line']}\n{address['subdistrict']}, {address['district']}, {address['province']} {address['postal_code']}"

        await db.execute(
            """
            INSERT INTO shipments (order_id, address_snapshot, status)
            VALUES ($1, $2, 'preparing')
            """,
            order_id,
            address_snapshot
        )

        # Clear cart (don't return stock — it's now owned by the order)
        if is_cart_order:
            await db.execute(
                "DELETE FROM cart_items WHERE cart_id = $1",
                cart["cart_id"]
            )

        # Log order status (pending)
        try:
            await db.execute(
                """INSERT INTO order_status_logs (order_id, previous_status, new_status, changed_by, note)
                   VALUES ($1, NULL, 'pending', $2, 'สร้างคำสั่งซื้อใหม่')""",
                order_id, user_id,
            )
        except Exception:
            pass  # ไม่ให้ log error กระทบ flow หลัก

    # Return order response
    return OrderResponse(
        order_id=order_id,
        total_amount=total_amount,
        status="pending",
        payment_status="cod_pending" if request.payment_method == "cod" else "unpaid",
        payment_method=request.payment_method,
        shipping_address={
            "recipient_name": address["recipient_name"],
            "phone_number": address["phone_number"],
            "address_line": address["address_line"],
            "subdistrict": address["subdistrict"],
            "district": address["district"],
            "province": address["province"],
            "postal_code": address["postal_code"]
        },
        items=[OrderItemResponse(**item) for item in order_items],
        created_at=order["created_at"],
        updated_at=order["updated_at"]
    )


@router.get("/", response_model=List[OrderListItem])
async def get_order_history(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get user's order history"""
    user_id = current_user["user_id"]

    orders = await db.fetch(
        """
        SELECT o.order_id, o.total_amount, o.status, o.payment_status, o.created_at,
               COUNT(oi.id) as items_count
        FROM orders o
        LEFT JOIN order_items oi ON o.order_id = oi.order_id
        WHERE o.user_id = $1
        GROUP BY o.order_id
        ORDER BY o.created_at DESC
        """,
        user_id
    )

    return [OrderListItem(**dict(order)) for order in orders]


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order_detail(
    order_id: int,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get detailed order information"""
    user_id = current_user["user_id"]

    # Get order
    order = await db.fetchrow(
        """
        SELECT o.order_id, o.total_amount, o.status, o.payment_status,
               o.created_at, o.updated_at,
               p.method as payment_method,
               ua.recipient_name, ua.phone_number, ua.address_line,
               ua.subdistrict, ua.district, ua.province, ua.postal_code
        FROM orders o
        LEFT JOIN payments p ON o.order_id = p.order_id
        LEFT JOIN user_addresses ua ON o.shipping_address_id = ua.address_id
        WHERE o.order_id = $1 AND o.user_id = $2
        """,
        order_id, user_id
    )

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    # Get order items
    items = await db.fetch(
        """
        SELECT oi.variant_id, oi.product_name, oi.price, oi.quantity,
               pv.image_url
        FROM order_items oi
        LEFT JOIN product_variants pv ON oi.variant_id = pv.variant_id
        WHERE oi.order_id = $1
        """,
        order_id
    )

    return OrderResponse(
        order_id=order["order_id"],
        total_amount=order["total_amount"],
        status=order["status"],
        payment_status=order["payment_status"],
        payment_method=order["payment_method"],
        shipping_address={
            "recipient_name": order["recipient_name"],
            "phone_number": order["phone_number"],
            "address_line": order["address_line"],
            "subdistrict": order["subdistrict"],
            "district": order["district"],
            "province": order["province"],
            "postal_code": order["postal_code"]
        },
        items=[OrderItemResponse(**dict(item)) for item in items],
        created_at=order["created_at"],
        updated_at=order["updated_at"]
    )


@router.post("/{order_id}/cancel")
async def cancel_order(
    order_id: int,
    cancel_reason: str = "Customer requested cancellation",
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Cancel an order (only if status is pending or confirmed)"""
    user_id = current_user["user_id"]

    async with db.transaction():
        # Check order exists and belongs to user
        order = await db.fetchrow(
            """
            SELECT order_id, status, payment_status
            FROM orders
            WHERE order_id = $1 AND user_id = $2
            """,
            order_id, user_id
        )

        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )

        # Check if order can be cancelled
        if order["status"] not in ["pending", "confirmed"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot cancel order with status: {order['status']}"
            )

        # Restore stock quantities
        await db.execute(
            """
            UPDATE product_variants pv
            SET stock_quantity = stock_quantity + oi.quantity
            FROM order_items oi
            WHERE oi.variant_id = pv.variant_id AND oi.order_id = $1
            """,
            order_id
        )

        # Update order status
        await db.execute(
            """
            UPDATE orders
            SET status = 'cancelled', cancel_reason = $1, updated_at = NOW()
            WHERE order_id = $2
            """,
            cancel_reason, order_id
        )

        # Update payment status if applicable
        if order["payment_status"] == "paid":
            await db.execute(
                """
                UPDATE orders
                SET payment_status = 'refunded'
                WHERE order_id = $1
                """,
                order_id
            )

        # Log order status change
        try:
            await db.execute(
                """INSERT INTO order_status_logs (order_id, previous_status, new_status, changed_by, note)
                   VALUES ($1, $2, 'cancelled', $3, $4)""",
                order_id, order["status"], user_id, cancel_reason,
            )
        except Exception:
            pass

    return {"message": "Order cancelled successfully", "order_id": order_id}
