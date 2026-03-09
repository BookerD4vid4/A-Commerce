"""
Database connection module for A-Commerce
Supports PostgreSQL/Supabase with asyncpg
"""

import asyncpg
from typing import Optional
from app.config import settings

# Global connection pool
_pool: Optional[asyncpg.Pool] = None


async def get_db_pool() -> asyncpg.Pool:
    """
    Get or create database connection pool
    
    Returns:
        asyncpg.Pool: Database connection pool
    """
    global _pool
    
    if _pool is None:
        _pool = await asyncpg.create_pool(
            dsn=settings.DATABASE_URL,
            min_size=5,
            max_size=20,
            command_timeout=60,
            statement_cache_size=0,  # Required for Supabase pgbouncer
        )
    
    return _pool


async def close_db_pool():
    """Close database connection pool"""
    global _pool
    
    if _pool is not None:
        await _pool.close()
        _pool = None


async def get_db():
    """
    Dependency for getting database connection
    
    Usage in FastAPI:
        @router.get("/")
        async def endpoint(db = Depends(get_db)):
            result = await db.fetch("SELECT * FROM users")
    
    Yields:
        asyncpg.Connection: Database connection
    """
    pool = await get_db_pool()
    async with pool.acquire() as connection:
        yield connection


# Helper function for executing queries outside of FastAPI dependencies
async def execute_query(query: str, *args):
    """
    Execute a query and return results
    
    Args:
        query: SQL query string
        *args: Query parameters
        
    Returns:
        Query results
    """
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        return await conn.fetch(query, *args)


async def execute_one(query: str, *args):
    """
    Execute a query and return single row
    
    Args:
        query: SQL query string
        *args: Query parameters
        
    Returns:
        Single row or None
    """
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        return await conn.fetchrow(query, *args)


async def execute_insert(query: str, *args):
    """
    Execute INSERT/UPDATE/DELETE query
    
    Args:
        query: SQL query string
        *args: Query parameters
        
    Returns:
        Status message
    """
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        return await conn.execute(query, *args)


# Lifespan events (for FastAPI app startup/shutdown)
async def init_db():
    """Initialize database connection on app startup"""
    try:
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            # Test connection
            version = await conn.fetchval("SELECT version()")
            print(f"[OK] Database connected: {version[:50]}...")

            # Ensure cart_items has reserved_at column (stock reservation TTL)
            has_reserved_at = await conn.fetchval(
                """SELECT EXISTS(
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'cart_items' AND column_name = 'reserved_at'
                )"""
            )
            if not has_reserved_at:
                await conn.execute(
                    "ALTER TABLE cart_items ADD COLUMN reserved_at TIMESTAMPTZ DEFAULT NOW()"
                )
                print("[OK] Added reserved_at column to cart_items")
            else:
                print("[OK] cart_items.reserved_at column exists")

            # Check if pgvector extension exists
            has_vector = await conn.fetchval(
                "SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector')"
            )
            if has_vector:
                print("[OK] pgvector extension is enabled")
            else:
                print("[WARNING] pgvector extension is not enabled. AI semantic search will not work.")

    except Exception as e:
        print(f"[ERROR] Database connection failed: {e}")
        raise


async def cleanup_db():
    """Cleanup database connection on app shutdown"""
    await close_db_pool()
    print("[OK] Database connection closed")
