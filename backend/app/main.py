from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import asyncio
import os

# Load environment variables (override=True to pick up changes)
load_dotenv(override=True)

# Import database functions
from app.database import init_db, cleanup_db


async def seed_chatbot_prompt():
    """Seed default system prompt for chatbot if not exists"""
    from app.database import execute_one, execute_insert
    from app.services.chat_service import DEFAULT_SYSTEM_PROMPT

    existing = await execute_one(
        "SELECT prompt_id FROM chatbot_prompts WHERE prompt_type = 'system' AND is_active = TRUE"
    )
    if not existing:
        await execute_insert(
            "INSERT INTO chatbot_prompts (prompt_type, prompt_text, is_active) VALUES ('system', $1, TRUE)",
            DEFAULT_SYSTEM_PROMPT,
        )
        print("[OK] Seeded default chatbot system prompt")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Starting A-Commerce API...")
    await init_db()
    await seed_chatbot_prompt()

    # Start reservation cleanup background task
    from app.services.reservation_cleanup import cleanup_expired_reservations
    cleanup_task = asyncio.create_task(cleanup_expired_reservations())
    print("[OK] Reservation cleanup task started (30-min TTL, checks every 60s)")

    yield

    # Shutdown
    print("Shutting down A-Commerce API...")
    cleanup_task.cancel()
    try:
        await cleanup_task
    except asyncio.CancelledError:
        pass
    await cleanup_db()


app = FastAPI(
    title=os.getenv("APP_NAME", "A-Commerce"),
    description="E-commerce system with AI chatbot for local convenience stores",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration
origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
]
# Also add any from env
env_origins = os.getenv("CORS_ORIGINS", "")
if env_origins:
    for origin in env_origins.split(","):
        origin = origin.strip()
        if origin and origin not in origins:
            origins.append(origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "message": "A-Commerce API",
        "status": "running",
        "environment": os.getenv("ENVIRONMENT", "development")
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Routers
from app.routers import auth, products, cart, orders, addresses, payments
app.include_router(auth.router)
app.include_router(products.router)
app.include_router(cart.router)
app.include_router(orders.router)
app.include_router(addresses.router)
app.include_router(payments.router)

from app.routers import chat
app.include_router(chat.router)

from app.routers import admin
app.include_router(admin.router)

from app.routers import uploads
app.include_router(uploads.router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
