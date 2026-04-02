import random
from datetime import datetime, date
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models import BlockCatalog, DailyBlockSelection
from app.config import get_settings

settings = get_settings()


class BlockService:
    """Service for managing block catalog and daily selections"""

    @staticmethod
    def get_catalog(db: Session, universe_id: str = None) -> list:
        """Get all blocks from catalog"""
        if universe_id is None:
            universe_id = settings.UNIVERSE_ID

        blocks = db.query(BlockCatalog).filter(BlockCatalog.universe_id == universe_id).all()
        return blocks

    @staticmethod
    def get_daily_blocks(db: Session, universe_id: str = None) -> list:
        """Get or create today's daily block selection"""
        if universe_id is None:
            universe_id = settings.UNIVERSE_ID

        today = str(date.today())

        # Check if today's selection already exists
        daily_selection = db.query(DailyBlockSelection).filter(
            DailyBlockSelection.date == today
        ).first()

        if daily_selection:
            return daily_selection.selected_blocks

        # Create today's selection if it doesn't exist
        return BlockService.create_daily_blocks(db, universe_id)

    @staticmethod
    def create_daily_blocks(db: Session, universe_id: str = None) -> list:
        """Create and store today's daily block selection using weighted randomization"""
        if universe_id is None:
            universe_id = settings.UNIVERSE_ID

        today = str(date.today())

        # Get all blocks for this universe
        all_blocks = db.query(BlockCatalog).filter(
            BlockCatalog.universe_id == universe_id
        ).all()

        if not all_blocks:
            raise ValueError(f"No blocks found for universe {universe_id}")

        # Create weighted selection based on rarity
        # Lower rarity values should have higher weight
        weights = []
        for block in all_blocks:
            rarity_weight = settings.RARITY_WEIGHTS.get(block.rarity, 1)
            weights.append(rarity_weight)

        # Randomly select 10 blocks using weighted selection
        total_weight = sum(weights)
        selected_count = min(settings.DAILY_BLOCKS_COUNT, len(all_blocks))

        selected_blocks = random.choices(
            all_blocks,
            weights=weights,
            k=selected_count
        )

        # Store the selection
        daily_selection = DailyBlockSelection(date=today)
        daily_selection.selected_blocks = selected_blocks
        db.add(daily_selection)
        db.commit()
        db.refresh(daily_selection)

        return daily_selection.selected_blocks

    @staticmethod
    def seed_block_catalog(db: Session, blocks_data: list[dict]) -> None:
        """Seed the block catalog with block definitions"""
        for block_data in blocks_data:
            # Check if block already exists
            existing = db.query(BlockCatalog).filter(
                BlockCatalog.block_id == block_data["block_id"],
                BlockCatalog.universe_id == block_data.get("universe_id", settings.UNIVERSE_ID)
            ).first()

            if not existing:
                new_block = BlockCatalog(
                    block_id=block_data["block_id"],
                    layer=block_data.get("layer", 0),
                    rarity=block_data.get("rarity", 0),
                    universe_id=block_data.get("universe_id", settings.UNIVERSE_ID),
                    image_path=block_data.get("image_path", "")
                )
                db.add(new_block)

        db.commit()
