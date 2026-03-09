"""
Chat Router
จัดการ endpoints เกี่ยวกับ AI chatbot
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional, List, Any
import asyncpg

from app.database import get_db
from app.middleware.auth import get_optional_user, require_admin
from app.services.chat_service import (
    get_or_create_session,
    get_chat_history,
    process_message,
)
from app.services.embedding_service import generate_all_product_embeddings

router = APIRouter(prefix="/api/chat", tags=["Chat"])


# =============================================
# Request/Response Models
# =============================================

class CreateSessionRequest(BaseModel):
    session_token: Optional[str] = None

class SessionResponse(BaseModel):
    session_id: int
    session_token: Optional[str]

class SendMessageRequest(BaseModel):
    message: str

class ProductInChat(BaseModel):
    product_id: int
    variant_id: Optional[int] = None
    name: str
    description: Optional[str]
    category_name: Optional[str]
    min_price: float
    max_price: float
    image_url: Optional[str]
    total_stock: int
    size: Optional[str] = None
    unit: Optional[str] = None
    similarity: Optional[float] = None

class VariantInChat(BaseModel):
    variant_id: int
    sku: Optional[str]
    price: float
    stock_quantity: int
    unit: Optional[str]
    size: Optional[str]
    color: Optional[str]
    image_url: Optional[str]

class ChatMessageResponse(BaseModel):
    message_id: Optional[int] = None
    role: str
    content: str
    products: List[ProductInChat] = []
    action: Optional[str] = None  # "add_to_cart", "select_variant", "show_addresses"
    order_product: Optional[ProductInChat] = None
    variants: List[VariantInChat] = []
    quantity: Optional[int] = None
    created_at: Optional[str] = None

class MessageHistoryItem(BaseModel):
    message_id: int
    role: str
    content: str
    metadata: Optional[Any] = None
    created_at: str

class EmbeddingResultResponse(BaseModel):
    status: str
    total_products: Optional[int] = None
    created: Optional[int] = None
    updated: Optional[int] = None
    errors: Optional[int] = None
    message: Optional[str] = None


# =============================================
# Endpoints
# =============================================

@router.post("/sessions", response_model=SessionResponse)
async def create_or_resume_session(
    body: CreateSessionRequest,
    db: asyncpg.Connection = Depends(get_db),
    user: Optional[dict] = Depends(get_optional_user),
):
    """Create a new chat session or resume existing one"""
    user_id = user["user_id"] if user else None
    session = await get_or_create_session(
        db, user_id=user_id, session_token=body.session_token
    )
    return SessionResponse(
        session_id=session["session_id"],
        session_token=session["session_token"],
    )


@router.post("/sessions/{session_id}/messages", response_model=ChatMessageResponse)
async def send_message(
    session_id: int,
    body: SendMessageRequest,
    db: asyncpg.Connection = Depends(get_db),
    user: Optional[dict] = Depends(get_optional_user),
):
    """Send a message to the chatbot and get a response"""
    if not body.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    # Verify session exists
    session = await db.fetchrow(
        "SELECT session_id, user_id FROM chat_sessions WHERE session_id = $1",
        session_id,
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Process message and get AI response
    user_id = user["user_id"] if user else session.get("user_id")
    result = await process_message(db, session_id, body.message.strip(), user_id=user_id)

    response = ChatMessageResponse(
        role=result["role"],
        content=result["content"],
        products=[ProductInChat(**p) for p in result.get("products", [])],
    )

    # Add action metadata if present
    if result.get("action") == "add_to_cart":
        response.action = "add_to_cart"
        # Strip variants key before passing to ProductInChat
        op = {k: v for k, v in result["order_product"].items() if k != "variants"}
        response.order_product = ProductInChat(**op)
        response.quantity = result.get("quantity", 1)
    elif result.get("action") == "select_variant":
        response.action = "select_variant"
        op = {k: v for k, v in result["order_product"].items() if k != "variants"}
        response.order_product = ProductInChat(**op)
        response.variants = [VariantInChat(**v) for v in result.get("variants", [])]
    elif result.get("action") == "show_addresses":
        response.action = "show_addresses"

    return response


@router.get("/sessions/{session_id}/messages", response_model=List[MessageHistoryItem])
async def get_messages(
    session_id: int,
    limit: int = Query(20, le=50),
    db: asyncpg.Connection = Depends(get_db),
    user: Optional[dict] = Depends(get_optional_user),
):
    """Get chat message history for a session"""
    session = await db.fetchrow(
        "SELECT session_id FROM chat_sessions WHERE session_id = $1",
        session_id,
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    messages = await get_chat_history(db, session_id, limit=limit)
    return [MessageHistoryItem(**m) for m in messages]


@router.post("/embeddings/generate", response_model=EmbeddingResultResponse)
async def generate_embeddings(
    db: asyncpg.Connection = Depends(get_db),
    user: dict = Depends(require_admin),
):
    """Generate embeddings for all products (admin only)"""
    result = await generate_all_product_embeddings(db)
    return EmbeddingResultResponse(**result)
