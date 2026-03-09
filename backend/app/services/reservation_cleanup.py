"""
Reservation Cleanup Service
Background task that releases expired cart reservations and returns stock.
Runs every 60 seconds via asyncio (no external scheduler needed).
"""

import asyncio
from app.database import get_db_pool

RESERVATION_TTL_MINUTES = 30
CLEANUP_INTERVAL_SECONDS = 60


async def cleanup_expired_reservations():
    """Background task: periodically release expired cart reservations."""
    # Wait for app startup to complete
    await asyncio.sleep(5)

    while True:
        try:
            pool = await get_db_pool()
            async with pool.acquire() as conn:
                async with conn.transaction():
                    # Atomic: delete expired items + return stock in one operation
                    expired = await conn.fetch(
                        """
                        WITH expired AS (
                            DELETE FROM cart_items
                            WHERE reserved_at IS NOT NULL
                              AND reserved_at < NOW() - INTERVAL '30 minutes'
                            RETURNING variant_id, quantity
                        )
                        UPDATE product_variants pv
                        SET stock_quantity = stock_quantity + e.total_qty
                        FROM (
                            SELECT variant_id, SUM(quantity) as total_qty
                            FROM expired
                            GROUP BY variant_id
                        ) e
                        WHERE pv.variant_id = e.variant_id
                        RETURNING pv.variant_id, e.total_qty
                        """
                    )

                    if expired:
                        print(f"[CLEANUP] Released {len(expired)} expired reservation(s)")
                        # Log inventory transactions for expired reservations
                        try:
                            for row in expired:
                                stock = await conn.fetchval(
                                    "SELECT stock_quantity FROM product_variants WHERE variant_id = $1",
                                    row["variant_id"],
                                )
                                qty = int(row["total_qty"])
                                await conn.execute(
                                    """INSERT INTO inventory_transactions
                                       (variant_id, quantity_changed, previous_quantity, new_quantity,
                                        transaction_type, reference_type, notes)
                                       VALUES ($1, $2, $3, $4, 'reservation_expired', 'cart',
                                               'Stock reservation หมดอายุ (30 นาที)')""",
                                    row["variant_id"], qty,
                                    (stock or 0) - qty, stock or 0,
                                )
                        except Exception as log_err:
                            print(f"[CLEANUP WARN] Failed to log inventory: {log_err}")

        except asyncio.CancelledError:
            raise
        except Exception as e:
            print(f"[CLEANUP ERROR] {e}")

        await asyncio.sleep(CLEANUP_INTERVAL_SECONDS)
