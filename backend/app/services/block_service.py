import random
from datetime import date
from sqlalchemy import func
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from app.config import get_settings
from app.daily_selection import DailySelectionManager
from app.services.block_loader import BlockLoader

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
        universe_id: str
    ) -> dict:
        """
        Distribute blocks to user based on per-universe dates.
        Loads blocks from config.json in public folder (filesystem source of truth).
        
        Logic:
        - If no distribution date for this universe: give 30 blocks (first time)
        - If new day for this universe:
          - If current inventory <= 10 blocks: clear all blocks then add 10 new
          - If current inventory > 10 blocks: keep all, add 10 new
        
        Args:
            db: Database session
            inventory_id: User's inventory ID
            universe_id: Universe ID (e.g. 'ink_castle')
            
        Returns:
            Dict with distribution info
        """
        from app.models import UserInventory, InventoryBlock
        from app.services.inventory_service import InventoryService
        
        if not universe_id:
            raise ValueError("Universe ID required")
        
        # Load blocks from filesystem
        all_blocks = BlockLoader.load_blocks(universe_id)
        if not all_blocks:
            raise ValueError(f"No blocks found for universe '{universe_id}'. Check config.json in public/univers/{universe_id}/")
        
        # Get inventory
        inventory = db.query(UserInventory).filter(UserInventory.id == inventory_id).first()
        if not inventory:
            raise ValueError("Inventory not found")
        
        today = str(date.today())
        
        # Initialize last_distributions if needed
        if not inventory.last_distributions:
            inventory.last_distributions = {}
        
        last_distribution_date = inventory.last_distributions.get(universe_id)
        
        # Case 1: First time for this universe - give 30 blocks
        if last_distribution_date is None:
            # Get today's initial block selection (cached deterministically per universe/date)
            block_ids = DailySelectionManager.get_or_create_initial_blocks(
                universe_id,
                [{"id": b.id, "rarity": b.rarity} for b in all_blocks]
            )
            
            # Add the selected blocks to inventory
            for block_id in block_ids:
                InventoryService.add_block_to_inventory(
                    db,
                    inventory_id=inventory_id,
                    block_catalog_id=str(block_id),
                    quantity=1
                )
            
            inventory.last_distributions[universe_id] = today
            flag_modified(inventory, "last_distributions")
            db.commit()
            
            return {
                "blocks_added": len(block_ids),
                "is_first_time": True,
                "action": "initial",
                "distribution_date": today
            }
        
        # Case 2: Same day - no distribution
        elif last_distribution_date == today:
            return {
                "blocks_added": 0,
                "is_first_time": False,
                "action": "skipped",
                "reason": "Already received blocks today",
                "distribution_date": today
            }
        
        # Case 3: New day - conditional clearing + 10 new blocks
        else:
            # Count current inventory blocks
            current_count = db.query(InventoryBlock).filter(
                InventoryBlock.inventory_id == inventory_id
            ).with_entities(
                func.sum(InventoryBlock.quantity)
            ).scalar() or 0
            
            # If <= 10 blocks, clear them all
            if current_count <= 10:
                db.query(InventoryBlock).filter(
                    InventoryBlock.inventory_id == inventory_id
                ).delete()
                db.commit()
            
            # Add 10 new blocks
            count = settings.DAILY_BLOCKS_COUNT
            
            # Get today's daily selection if available
            blocks_to_add = all_blocks
            try:
                universe_config = {"id": universe_id, "blocks": []}
                daily_block_ids = BlockService.get_daily_block_ids(universe_config)
                daily_blocks = [
                    b for b in all_blocks 
                    if str(b.block_id) in [str(id) for id in daily_block_ids]
                ]
                if daily_blocks:
                    blocks_to_add = daily_blocks
            except Exception as e:
                print(f"Error getting daily blocks: {e}")
            
            distributed = BlockService.select_and_add_blocks(
                db,
                inventory_id,
                blocks_to_add,
                count
            )
            
            inventory.last_distributions[universe_id] = today
            flag_modified(inventory, "last_distributions")
            db.commit()
            
            return {
                "blocks_added": distributed,
                "is_first_time": False,
                "action": "daily",
                "cleared_old_inventory": current_count <= 10,
                "previous_count": current_count,
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
    def select_random_block(blocks: list):
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
