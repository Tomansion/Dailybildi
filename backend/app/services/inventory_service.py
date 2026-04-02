from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models import UserInventory, InventoryBlock, BlockCatalog, User
from app.config import get_settings

settings = get_settings()


class InventoryService:
    """Service for managing user inventory and blocks"""

    @staticmethod
    def create_inventory(db: Session, user_id: str) -> UserInventory:
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
        user_id: str = None,
        block_catalog_id: str = None,
        quantity: int = 1,
        inventory_id: str = None,
        ignore_unique: bool = False
    ) -> InventoryBlock:
        """Add a block to user's inventory"""
        # Support both user_id and inventory_id
        if inventory_id is None:
            if user_id is None:
                raise ValueError("Either user_id or inventory_id must be provided")
            inventory = InventoryService.get_user_inventory(db, user_id)
            if not inventory:
                raise ValueError("User inventory not found")
            inventory_id = inventory.id
        
        # Check if block already in inventory
        existing_block = db.query(InventoryBlock).filter(
            InventoryBlock.inventory_id == inventory_id,
            InventoryBlock.block_catalog_id == block_catalog_id
        ).first()

        if existing_block:
            existing_block.quantity += quantity
            db.commit()
            db.refresh(existing_block)
            return existing_block

        # Create new inventory block
        try:
            inventory_block = InventoryBlock(
                inventory_id=inventory_id,
                block_catalog_id=block_catalog_id,
                quantity=quantity
            )
            db.add(inventory_block)
            db.commit()
            db.refresh(inventory_block)
            return inventory_block
        except IntegrityError as e:
            # If unique constraint violation and we're ignoring it, just increment quantity
            if ignore_unique:
                db.rollback()
                # Try to get the existing block again
                existing_block = db.query(InventoryBlock).filter(
                    InventoryBlock.inventory_id == inventory_id,
                    InventoryBlock.block_catalog_id == block_catalog_id
                ).first()
                if existing_block:
                    existing_block.quantity += quantity
                    db.commit()
                    db.refresh(existing_block)
                    return existing_block
            raise

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
