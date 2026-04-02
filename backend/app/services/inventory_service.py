from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models import UserInventory, InventoryBlock, BlockCatalog, User
from app.config import get_settings

settings = get_settings()


class InventoryService:
    """Service for managing user inventory and blocks"""

    @staticmethod
    def initialize_inventory(db: Session, user_id: str) -> UserInventory:
        """Create an empty inventory for a new user"""
        inventory = UserInventory(user_id=user_id)
        db.add(inventory)
        db.commit()
        db.refresh(inventory)
        return inventory

    @staticmethod
    def get_user_inventory(db: Session, user_id: str) -> UserInventory:
        """Get user's inventory with all blocks"""
        inventory = db.query(UserInventory).filter(
            UserInventory.user_id == user_id
        ).first()
        return inventory

    @staticmethod
    def add_block_to_inventory(
        db: Session,
        user_id: str,
        block_catalog_id: str,
        quantity: int = 1
    ) -> InventoryBlock:
        """Add a block to user's inventory"""
        inventory = InventoryService.get_user_inventory(db, user_id)
        if not inventory:
            raise ValueError("User inventory not found")

        # Check if block already in inventory
        existing_block = db.query(InventoryBlock).filter(
            InventoryBlock.inventory_id == inventory.id,
            InventoryBlock.block_catalog_id == block_catalog_id
        ).first()

        if existing_block:
            existing_block.quantity += quantity
            db.commit()
            db.refresh(existing_block)
            return existing_block

        # Create new inventory block
        inventory_block = InventoryBlock(
            inventory_id=inventory.id,
            block_catalog_id=block_catalog_id,
            quantity=quantity
        )
        db.add(inventory_block)
        db.commit()
        db.refresh(inventory_block)
        return inventory_block

    @staticmethod
    def remove_block_from_inventory(
        db: Session,
        user_id: str,
        block_catalog_id: str,
        quantity: int = 1
    ) -> bool:
        """Remove a block from user's inventory"""
        inventory = InventoryService.get_user_inventory(db, user_id)
        if not inventory:
            raise ValueError("User inventory not found")

        inventory_block = db.query(InventoryBlock).filter(
            InventoryBlock.inventory_id == inventory.id,
            InventoryBlock.block_catalog_id == block_catalog_id
        ).first()

        if not inventory_block:
            return False

        inventory_block.quantity -= quantity

        if inventory_block.quantity <= 0:
            db.delete(inventory_block)
        
        db.commit()
        return True

    @staticmethod
    def give_initial_blocks(db: Session, user_id: str) -> None:
        """Give user their initial blocks on first registration"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user or user.received_initial_blocks:
            return

        # Get all blocks for the universe
        all_blocks = db.query(BlockCatalog).filter(
            BlockCatalog.universe_id == settings.UNIVERSE_ID
        ).all()

        if not all_blocks:
            raise ValueError(f"No blocks found for universe {settings.UNIVERSE_ID}")

        # Calculate how many of each block to give
        blocks_per_type = settings.INITIAL_BLOCKS_COUNT // len(all_blocks)
        remainder = settings.INITIAL_BLOCKS_COUNT % len(all_blocks)

        # Add blocks to inventory
        for i, block in enumerate(all_blocks):
            quantity = blocks_per_type + (1 if i < remainder else 0)
            if quantity > 0:
                InventoryService.add_block_to_inventory(db, user_id, block.id, quantity)

        # Mark user as having received initial blocks
        user.received_initial_blocks = True
        db.commit()

    @staticmethod
    def distribute_daily_blocks(db: Session, block_ids: list[str]) -> None:
        """Distribute today's blocks to all users"""
        from app.services.block_service import BlockService

        # Get all users
        all_users = db.query(User).all()

        for user in all_users:
            # Clear previous daily blocks and add new ones
            inventory = InventoryService.get_user_inventory(db, user.id)
            if inventory:
                # Delete old inventory blocks (just daily ones)
                # For simplicity, we clear all inventory blocks
                db.query(InventoryBlock).filter(
                    InventoryBlock.inventory_id == inventory.id
                ).delete()

            # Add new daily blocks
            for block_id in block_ids:
                InventoryService.add_block_to_inventory(db, user.id, block_id, 1)

        db.commit()
