import random
from datetime import date, datetime
from collections import Counter
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
        - If new day for this universe: add 10 blocks, capped at 30
          - Example: 3 blocks → add 10 → 13 blocks
          - Example: 23 blocks → add 10 → 30 blocks (capped)
          - Example: 30 blocks → add 0 → 30 blocks (already at max)
        
        Args:
            db: Database session
            inventory_id: User's inventory ID
            universe_id: Universe ID (e.g. 'ink_castle')
            
        Returns:
            Dict with distribution info
        """
        from app.models import UserInventory, InventoryBlock, BlockCatalog
        from app.services.inventory_service import InventoryService
        
        if not universe_id:
            raise ValueError("Universe ID required")
        
        # Load blocks from filesystem
        all_blocks = BlockLoader.load_blocks(universe_id)
        if not all_blocks:
            raise ValueError(f"No blocks found for universe '{universe_id}'. Check config.json in public/univers/{universe_id}/")
        
        # Ensure all blocks exist in block_catalog (foreign key requirement)
        BlockService._ensure_blocks_in_catalog(db, universe_id, all_blocks)
        
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
            
            # Count block IDs for batch addition
            block_id_counts = Counter(block_ids)
            
            # Add all blocks in a single batch operation
            added_count = InventoryService.add_blocks_batch(
                db,
                inventory.id,
                dict(block_id_counts)
            )
            
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
        
        # Case 3: New day(s) - stack blocks up to the limit
        # Count current inventory blocks
        current_count = db.query(InventoryBlock).filter(
            InventoryBlock.inventory_id == inventory_id
        ).with_entities(
            func.sum(InventoryBlock.quantity)
        ).scalar() or 0
        
        # Calculate days passed since last distribution
        last_dist_date = datetime.strptime(last_distribution_date, "%Y-%m-%d").date()
        today_date = date.today()
        days_passed = (today_date - last_dist_date).days
        
        # Calculate blocks to add: 10 per day, but cap total at INITIAL_BLOCKS_COUNT
        blocks_to_add_per_day = settings.DAILY_BLOCKS_COUNT * days_passed
        new_target = min(current_count + blocks_to_add_per_day, settings.INITIAL_BLOCKS_COUNT)
        blocks_to_add = new_target - current_count
        
        if blocks_to_add > 0:
            # Add blocks to reach the new target
            distributed = BlockService.select_and_add_blocks(
                db,
                inventory_id,
                all_blocks,
                blocks_to_add
            )
        else:
            # Already at max capacity
            distributed = 0
        
        inventory.last_distributions[universe_id] = today
        flag_modified(inventory, "last_distributions")
        db.commit()
        
        return {
            "blocks_added": distributed,
            "is_first_time": False,
            "action": "daily_stack",
            "previous_count": current_count,
            "new_count": new_target,
            "days_passed": days_passed,
            "distribution_date": today
        }
    
    @staticmethod
    def select_and_add_blocks(
        db: Session,
        inventory_id: str,
        blocks: list,
        count: int
    ) -> int:
        """Select and add random blocks to inventory using weighted selection in batch"""
        from app.services.inventory_service import InventoryService
        
        if not blocks:
            raise ValueError("No blocks available")
        
        # Create weighted selection based on rarity for all blocks at once
        weights = []
        for block in blocks:
            rarity_weight = settings.RARITY_WEIGHTS.get(block.rarity, 1)
            weights.append(rarity_weight)
        
        # Select all blocks at once using weighted selection
        selected_indices = random.choices(
            range(len(blocks)),
            weights=weights,
            k=count
        )
        
        # Count occurrences of each block ID
        block_id_counts = Counter(blocks[i].id for i in selected_indices)
        
        # Add all blocks in a single batch operation
        return InventoryService.add_blocks_batch(
            db,
            inventory_id,
            dict(block_id_counts)
        )

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
    def _ensure_blocks_in_catalog(db: Session, universe_id: str, blocks: list) -> None:
        """Ensure all blocks exist in block_catalog table (required for foreign keys)"""
        from app.models import BlockCatalog
        
        for block in blocks:
            # Check if block already exists
            existing = db.query(BlockCatalog).filter(
                BlockCatalog.id == block.id,
                BlockCatalog.universe_id == universe_id
            ).first()
            
            if not existing:
                # Create block in catalog
                catalog_entry = BlockCatalog(
                    id=block.id,
                    block_id=block.block_id,
                    layer=block.layer,
                    rarity=block.rarity,
                    universe_id=universe_id,
                    image_path=block.image_path
                )
                db.add(catalog_entry)
        
        # Commit all new blocks to catalog
        try:
            db.commit()
        except Exception as e:
            # If there's a unique constraint violation, just rollback
            db.rollback()


