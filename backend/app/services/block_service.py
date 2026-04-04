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
            added_count = 0
            for block_id in block_ids:
                try:
                    InventoryService.add_block_to_inventory(
                        db,
                        inventory_id=inventory_id,
                        block_catalog_id=str(block_id),
                        quantity=1
                    )
                    added_count += 1
                except Exception as e:
                    pass
            
            inventory.last_distributions[universe_id] = today
            flag_modified(inventory, "last_distributions")
            db.commit()
            
            return {
                "blocks_added": added_count,
                "is_first_time": True,
                "action": "initial",
                "distribution_date": today
            }
        
        # Case 2: Same day
        elif last_distribution_date == today:
            return {
                "blocks_added": 0,
                "is_first_time": False,
                "action": "skipped",
                "reason": "Already received blocks today",
                "distribution_date": today
            }
        
        # Case 3: New day OR underfunded user (fall-through from Case 2)
        # Count current inventory blocks
        current_count = db.query(InventoryBlock).filter(
            InventoryBlock.inventory_id == inventory_id
        ).with_entities(
            func.sum(InventoryBlock.quantity)
        ).scalar() or 0
        
        # If <= 10 blocks, clear them all and add 10 new
        if current_count <= 10:
            db.query(InventoryBlock).filter(
                InventoryBlock.inventory_id == inventory_id
            ).delete()
            db.commit()
            
            # Add 10 new blocks
            count = settings.DAILY_BLOCKS_COUNT
            
            distributed = BlockService.select_and_add_blocks(
                db,
                inventory_id,
                all_blocks,
                count
            )
            
            inventory.last_distributions[universe_id] = today
            flag_modified(inventory, "last_distributions")
            db.commit()
            
            return {
                "blocks_added": distributed,
                "is_first_time": False,
                "action": "daily_reset",
                "cleared_old_inventory": True,
                "previous_count": current_count,
                "distribution_date": today
            }
        else:
            # > 10 blocks: keep all, don't add or remove
            inventory.last_distributions[universe_id] = today
            flag_modified(inventory, "last_distributions")
            db.commit()
            
            return {
                "blocks_added": 0,
                "is_first_time": False,
                "action": "daily_keep",
                "reason": "Inventory > 10 blocks, keeping all blocks",
                "current_count": current_count,
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


