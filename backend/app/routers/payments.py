"""
Payment API endpoints
Handles PromptPay QR generation and payment verification
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.middleware.auth import get_current_user
from app.database import get_db
from app.utils.payment import generate_promptpay_qr, verify_payment, omise_service

router = APIRouter(prefix="/api/payments", tags=["Payments"])


# =============================================
# Pydantic Models
# =============================================

class QRCodeResponse(BaseModel):
    source_id: str
    qr_code_url: str
    expires_at: Optional[datetime]
    amount: float
    demo_mode: bool = False


class VerifyPaymentRequest(BaseModel):
    charge_id: str


class PaymentCallbackRequest(BaseModel):
    order_id: int
    charge_id: str


# =============================================
# Endpoints
# =============================================

@router.post("/{order_id}/generate-qr", response_model=QRCodeResponse)
async def generate_payment_qr(
    order_id: int,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Generate PromptPay QR code for order payment

    Flow:
    1. Verify order belongs to user
    2. Check payment is still pending
    3. Generate QR code via Omise
    4. Update payment record with source_id
    5. Return QR code URL
    """
    user_id = current_user["user_id"]

    # Verify order and get payment info
    order = await db.fetchrow(
        """
        SELECT o.order_id, o.total_amount, o.payment_status, p.payment_id
        FROM orders o
        LEFT JOIN payments p ON o.order_id = p.order_id
        WHERE o.order_id = $1 AND o.user_id = $2
        """,
        order_id, user_id
    )

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    if order["payment_status"] not in ["unpaid", "pending"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Payment already {order['payment_status']}"
        )

    # Generate QR code
    try:
        qr_data = await generate_promptpay_qr(
            amount=order["total_amount"],
            order_id=order_id
        )

        # Update payment record with source_id
        await db.execute(
            """
            UPDATE payments
            SET omise_source_id = $1, status = 'pending'
            WHERE payment_id = $2
            """,
            qr_data["source_id"],
            order["payment_id"]
        )

        return QRCodeResponse(
            source_id=qr_data["source_id"],
            qr_code_url=qr_data["qr_code_url"],
            expires_at=qr_data.get("expires_at"),
            amount=float(qr_data["amount"]),
            demo_mode=qr_data.get("demo_mode", False)
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate QR code: {str(e)}"
        )


@router.post("/{order_id}/verify")
async def verify_order_payment(
    order_id: int,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Verify payment status for an order

    Used for manual verification or webhook callback
    """
    user_id = current_user["user_id"]

    # Get order and payment info
    payment = await db.fetchrow(
        """
        SELECT p.payment_id, p.transaction_ref, p.omise_source_id, p.status, o.user_id
        FROM payments p
        JOIN orders o ON p.order_id = o.order_id
        WHERE o.order_id = $1
        """,
        order_id
    )

    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )

    if payment["user_id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )

    if payment["status"] == "successful":
        return {
            "paid": True,
            "status": "successful",
            "message": "Payment already verified"
        }

    # Use transaction_ref or fallback to omise_source_id (for demo mode)
    ref = payment["transaction_ref"] or payment["omise_source_id"]
    if not ref:
        return {
            "paid": False,
            "status": "pending",
            "message": "No transaction reference found"
        }

    # Verify with Omise (or demo mode)
    try:
        is_paid = await verify_payment(ref)

        if is_paid:
            async with db.transaction():
                # Update payment status
                await db.execute(
                    """
                    UPDATE payments
                    SET status = 'successful', paid_at = NOW()
                    WHERE payment_id = $1
                    """,
                    payment["payment_id"]
                )

                # Update order payment status
                await db.execute(
                    """
                    UPDATE orders
                    SET payment_status = 'paid', status = 'confirmed', updated_at = NOW()
                    WHERE order_id = $1
                    """,
                    order_id
                )

            return {
                "paid": True,
                "status": "successful",
                "message": "Payment verified successfully"
            }
        else:
            return {
                "paid": False,
                "status": "pending",
                "message": "Payment not yet confirmed"
            }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Payment verification failed: {str(e)}"
        )


@router.post("/callback")
async def payment_callback(
    callback: PaymentCallbackRequest,
    db = Depends(get_db)
):
    """
    Webhook callback from Omise after payment

    This endpoint should be public (no auth) as it's called by Omise
    """
    order_id = callback.order_id
    charge_id = callback.charge_id

    # Get payment info
    payment = await db.fetchrow(
        """
        SELECT p.payment_id
        FROM payments p
        JOIN orders o ON p.order_id = o.order_id
        WHERE o.order_id = $1
        """,
        order_id
    )

    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )

    # Verify payment with Omise
    try:
        is_paid = await verify_payment(charge_id)

        if is_paid:
            async with db.transaction():
                # Update payment
                await db.execute(
                    """
                    UPDATE payments
                    SET transaction_ref = $1, status = 'successful', paid_at = NOW()
                    WHERE payment_id = $2
                    """,
                    charge_id,
                    payment["payment_id"]
                )

                # Update order
                await db.execute(
                    """
                    UPDATE orders
                    SET payment_status = 'paid', status = 'confirmed', updated_at = NOW()
                    WHERE order_id = $1
                    """,
                    order_id
                )

            return {"status": "success", "message": "Payment processed"}
        else:
            return {"status": "pending", "message": "Payment not confirmed"}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/{order_id}/confirm-cod")
async def confirm_cod_payment(
    order_id: int,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Mark COD order as ready for shipment

    Only for orders with COD payment method
    """
    user_id = current_user["user_id"]

    # Get order info
    order = await db.fetchrow(
        """
        SELECT o.order_id, o.payment_status, p.method, p.payment_id
        FROM orders o
        JOIN payments p ON o.order_id = p.order_id
        WHERE o.order_id = $1 AND o.user_id = $2
        """,
        order_id, user_id
    )

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    if order["method"] != "cod":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This endpoint is only for COD orders"
        )

    # Update order status
    async with db.transaction():
        await db.execute(
            """
            UPDATE orders
            SET status = 'confirmed', updated_at = NOW()
            WHERE order_id = $1
            """,
            order_id
        )

        await db.execute(
            """
            UPDATE payments
            SET status = 'pending'
            WHERE payment_id = $1
            """,
            order["payment_id"]
        )

    return {
        "message": "COD order confirmed, ready for shipment",
        "order_id": order_id
    }
