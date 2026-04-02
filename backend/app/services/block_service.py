import random
from datetime import date
from sqlalchemy.orm import Session
from app.models import BlockCatalog
from app.config import get_settings
from app.daily_selection import DailySelectionManager

settings = get_settings()


class BlockService:
    """Service for managing block catalog and daily selections"""

    @staticmethod
    def get_catalog(db: Session, universe_id: str = None) -> list:
        """Get all blocks from catalog (stored in database, sourced from config.json)"""
        if universe_id is None:
            universe_id = settings.UNIVERSE_ID

        blocks = db.query(BlockCatalog).filter(BlockCatalog.universe_id == universe_id).all()
        return blocks

    @staticmethod
    def get_daily_block_ids(universe_config: dict) -> list:
        """
        Get or create today's daily block selection.
        
        Args:
            universe_config: Universe configuration dict with 'id' and 'blocks' keys
            
        Returns:
            List of block IDs selected for today
        """
        universe_id = universe_config.get("id")
        available_blocks = universe_config.get("blocks", [])
        
        if not universe_id or not available_blocks:
            raise ValueError("Invalid universe config: missing 'id' or 'blocks'")
        
        return DailySelectionManager.get_or_create_daily_blocks(
            universe_id,
            available_blocks
        )
    
    @staticmethod
    def distribute_blocks_to_user(
        db: Session,
        inventory_id: str,
        all_blocks: list,
        universe_config: dict = None
    ) -> dict:
        """
        Distribute blocks to user based on date and first-time status.
        Returns 30 blocks on first time, 10 blocks on new days.
        
        Args:
            db: Database session
            inventory_id: User's inventory ID
            all_blocks: List of BlockCatalog objects
            universe_config: Universe config (needed for daily selections)
            
        Returns:
            Dict with distribution info: {
                "blocks_added": int,
                "is_first_time": bool,
                "distribution_date": str
            }
        """
        from app.models import UserInventory
        from app.services.inventory_service import InventoryService
        
        if not all_blocks:
            raise ValueError("No blocks available")
        
        # Get inventory
        inventory = db.query(UserInventory).filter(UserInventory.id == inventory_id).first()
        if not inventory:
            raise ValueError("Inventory not found")
        
        today = str(date.today())
        is_first_time = not inventory.initial_blocks_received
        last_provided_date = inventory.last_blocks_provided_date
        
        # Check if we should provide blocks
        blocks_to_add = []
        
        if is_first_time:
            # First time: give 30 blocks from weighted random of all blocks
            blocks_to_add = all_blocks
            count = settings.INITIAL_BLOCKS_COUNT
        elif last_provided_date != today:
            # New day: give 10 blocks from today's daily selection
            if universe_config:
                try:
                    daily_block_ids = BlockService.get_daily_block_ids(universe_config)
                    # Get the actual block objects for these IDs
                    for block_id in daily_block_ids:
                        block = next((b for b in all_blocks if str(b.block_id) == str(block_id)), None)
                        if block:
                            blocks_to_add.append(block)
                except Exception as e:
                    print(f"Error getting daily blocks: {e}")
                    # Fallback: just use weighted random from all blocks
                    blocks_to_add = all_blocks
                    count = settings.DAILY_BLOCKS_COUNT
            else:
                blocks_to_add = all_blocks
                count = settings.DAILY_BLOCKS_COUNT
        else:
            # Same day, no new blocks
            return {
                "blocks_added": 0,
                "is_first_time": False,
                "distribution_date": today,
                "reason": "Already received blocks today"
            }
        
        # If we have daily blocks, use that count, otherwise use the determined count
        if is_first_time:
            count = settings.INITIAL_BLOCKS_COUNT
        else:
            count = len(blocks_to_add) if blocks_to_add else settings.DAILY_BLOCKS_COUNT
        
        # Distribute blocks
        distributed = BlockService.select_and_add_blocks(
            db,
            inventory_id,
            blocks_to_add,
            count
        )
        
        # Update inventory tracking
        inventory.initial_blocks_received = True
        inventory.last_blocks_provided_date = today
        db.commit()
        
        return {
            "blocks_added": distributed,
            "is_first_time": is_first_time,
            "distribution_date": today
        }
    
    @staticmethod
    def select_and_add_blocks(
        db: Session,
        inventory_id: str,
        blocks: list,
        count: int
    ) -> int:
        """Select and add random blocks to inventory using weighted selection"""
        from app.services.inventory_service import InventoryService
        
        if not blocks:
            raise ValueError("No blocks available")
        
        distributed = 0
        for _ in range(count):
            selected_block = BlockService.select_random_block(blocks)
            InventoryService.add_block_to_inventory(
                db,
                inventory_id=inventory_id,
                block_catalog_id=selected_block.id,
                quantity=1
            )
            distributed += 1
        
        return distributed

    @staticmethod
    def select_random_block(blocks: list) -> BlockCatalog:
        """Select a random block from a list, weighted by rarity"""
        if not blocks:
            raise ValueError("No blocks available")
        
        # Create weighted selection based on rarity
        weights = []
        for block in blocks:
            rarity_weight = settings.RARITY_WEIGHTS.get(block.rarity, 1)
            weights.append(rarity_weight)
        
        # Select one block using weighted selection
        selected_block = random.choices(blocks, weights=weights, k=1)[0]
        return selected_block

    @staticmethod
    def distribute_initial_blocks(db: Session, inventory_id: str, blocks: list, count: int) -> int:
        """Distribute initial blocks to user using weighted random selection"""
        return BlockService.select_and_add_blocks(db, inventory_id, blocks, count)
