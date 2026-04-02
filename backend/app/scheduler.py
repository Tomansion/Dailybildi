from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from app.config import get_settings
from app.db import SessionLocal
from app.services.block_service import BlockService
from app.services.inventory_service import InventoryService
import logging

logger = logging.getLogger(__name__)
settings = get_settings()


scheduler = AsyncIOScheduler()


def distribute_daily_blocks():
    """Job function to distribute daily blocks to all users"""
    try:
        db = SessionLocal()
        
        # Get today's blocks
        daily_blocks = BlockService.get_daily_blocks(db)
        block_ids = [block.id for block in daily_blocks]
        
        # Distribute to all users
        InventoryService.distribute_daily_blocks(db, block_ids)
        
        logger.info(f"Successfully distributed {len(block_ids)} daily blocks to all users")
        db.close()
    except Exception as e:
        logger.error(f"Error distributing daily blocks: {e}")


def start_scheduler():
    """Start the background scheduler"""
    if not scheduler.running:
        # Schedule daily block distribution at 00:00 UTC
        scheduler.add_job(
            distribute_daily_blocks,
            CronTrigger(hour=0, minute=0, timezone=settings.TIMEZONE),
            id='daily_block_distribution',
            name='Distribute daily blocks',
            replace_existing=True
        )
        scheduler.start()
        logger.info("Scheduler started")


def stop_scheduler():
    """Stop the background scheduler"""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped")
