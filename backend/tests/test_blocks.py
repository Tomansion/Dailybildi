"""Tests for block distribution logic"""
import pytest
from datetime import date
from sqlalchemy.orm.attributes import flag_modified
from app.services.block_service import BlockService
from app.services.inventory_service import InventoryService
from app.models import InventoryBlock, UserInventory


class TestBlockDistributionLogic:
    """Test the block distribution system"""
    
    def test_first_distribution_gives_30_blocks(self, db, test_inventory):
        """First distribution should give 30 blocks"""
        result = BlockService.distribute_blocks_to_user(
            db,
            test_inventory.id,
            "test_universe"
        )
        
        # Check distribution result
        assert result["is_first_time"] is True
        assert result["action"] == "initial"
        assert result["blocks_added"] == 30
        
        # Verify inventory was updated
        db.refresh(test_inventory)
        total_blocks = sum(b.quantity for b in test_inventory.blocks)
        assert total_blocks == 30, f"Expected 30 blocks, got {total_blocks}"
        
        # Verify distribution date was stored
        assert "test_universe" in test_inventory.last_distributions
        assert test_inventory.last_distributions["test_universe"] == str(date.today())
    
    def test_same_day_no_distribution(self, db, test_inventory):
        """Same day should not distribute blocks"""
        # First distribution
        BlockService.distribute_blocks_to_user(
            db,
            test_inventory.id,
            "test_universe"
        )
        
        db.refresh(test_inventory)
        first_total = sum(b.quantity for b in test_inventory.blocks)
        
        # Second distribution on same day
        result = BlockService.distribute_blocks_to_user(
            db,
            test_inventory.id,
            "test_universe"
        )
        
        assert result["action"] == "skipped"
        assert result["blocks_added"] == 0
        
        db.refresh(test_inventory)
        second_total = sum(b.quantity for b in test_inventory.blocks)
        
        # Amount should not change
        assert first_total == second_total
        assert second_total == 30
    
    def test_inventory_decreases_on_block_removal(self, db, test_inventory):
        """When removing a block, inventory should decrease"""
        # Initial distribution: 30 blocks
        BlockService.distribute_blocks_to_user(
            db,
            test_inventory.id,
            "test_universe"
        )
        
        db.refresh(test_inventory)
        before_remove = sum(b.quantity for b in test_inventory.blocks)
        assert before_remove == 30
        
        # Simulate placing a block (remove from inventory)
        block_to_remove = test_inventory.blocks[0]
        InventoryService.remove_block_from_inventory(
            db,
            test_inventory.user_id,
            block_to_remove.block_catalog_id,
            quantity=1
        )
        
        db.refresh(test_inventory)
        after_remove = sum(b.quantity for b in test_inventory.blocks)
        
        # Should have decreased
        assert after_remove == 29, f"Expected 29, got {after_remove}"
        assert after_remove < before_remove, "Inventory should decrease after removal"


class TestInventory:
    """Test inventory operations"""
    
    def test_add_block_to_inventory(self, db, test_inventory, test_blocks_catalog):
        """Adding blocks should increase quantity"""
        first_block = test_blocks_catalog[0]
        
        # Add 5 of first block
        InventoryService.add_block_to_inventory(
            db,
            inventory_id=test_inventory.id,
            block_catalog_id=first_block.id,
            quantity=5
        )
        
        db.refresh(test_inventory)
        assert len(test_inventory.blocks) == 1
        assert test_inventory.blocks[0].quantity == 5
    
    def test_add_same_block_twice_increments(self, db, test_inventory, test_blocks_catalog):
        """Adding same block twice should increment quantity"""
        first_block = test_blocks_catalog[0]
        
        InventoryService.add_block_to_inventory(
            db,
            inventory_id=test_inventory.id,
            block_catalog_id=first_block.id,
            quantity=3
        )
        
        InventoryService.add_block_to_inventory(
            db,
            inventory_id=test_inventory.id,
            block_catalog_id=first_block.id,
            quantity=2
        )
        
        db.refresh(test_inventory)
        assert len(test_inventory.blocks) == 1
        assert test_inventory.blocks[0].quantity == 5
    
    def test_remove_block_decreases_quantity(self, db, test_inventory, test_blocks_catalog):
        """Removing blocks should decrease quantity"""
        first_block = test_blocks_catalog[0]
        
        # Add 5 blocks
        InventoryService.add_block_to_inventory(
            db,
            inventory_id=test_inventory.id,
            block_catalog_id=first_block.id,
            quantity=5
        )
        
        # Remove 2
        InventoryService.remove_block_from_inventory(
            db,
            test_inventory.user_id,
            first_block.id,
            quantity=2
        )
        
        db.refresh(test_inventory)
        assert test_inventory.blocks[0].quantity == 3
    
    def test_remove_block_deletes_when_empty(self, db, test_inventory, test_blocks_catalog):
        """Removing all blocks should delete the entry"""
        first_block = test_blocks_catalog[0]
        
        InventoryService.add_block_to_inventory(
            db,
            inventory_id=test_inventory.id,
            block_catalog_id=first_block.id,
            quantity=1
        )
        
        db.refresh(test_inventory)
        assert len(test_inventory.blocks) == 1
        
        InventoryService.remove_block_from_inventory(
            db,
            test_inventory.user_id,
            first_block.id,
            quantity=1
        )
        
        db.refresh(test_inventory)
        assert len(test_inventory.blocks) == 0


class TestUserRegistration:
    """Test that new users get initial blocks"""
    
    def test_new_user_gets_30_starting_blocks(self, db):
        """New user should get 30 blocks on registration"""
        from app.services.auth_service import AuthService
        from app.models import User
        from app.config import get_settings
        
        settings = get_settings()
        
        # Register a new user
        AuthService.register_user(db, "newuser", "New User", "password123")
        
        # Get the user from database and refresh
        new_user = db.query(User).filter(User.username == "newuser").first()
        assert new_user is not None
        db.refresh(new_user)
        assert new_user.received_initial_blocks is True
        
        # Check inventory was created with 30 blocks
        from app.services.inventory_service import InventoryService
        inventory = InventoryService.get_user_inventory(db, new_user.id)
        
        assert inventory is not None
        db.refresh(inventory)
        total_blocks = sum(block.quantity for block in inventory.blocks)
        assert total_blocks == 30, f"Expected 30 blocks, got {total_blocks}"
    
    def test_two_users_same_day_get_same_blocks(self, db):
        """Two users registering on the same day should get identical blocks"""
        from app.services.auth_service import AuthService
        from app.models import User
        from app.services.inventory_service import InventoryService
        
        # Clear in-memory cache to ensure fresh selection for this test
        from app.daily_selection import DailySelectionManager
        DailySelectionManager.clear_cache()
        
        # Register first user
        AuthService.register_user(db, "user_first", "User First", "password123")
        user1 = db.query(User).filter(User.username == "user_first").first()
        db.refresh(user1)
        
        inventory1 = InventoryService.get_user_inventory(db, user1.id)
        db.refresh(inventory1)
        
        # Get user1's blocks
        blocks1 = {}
        for block in inventory1.blocks:
            blocks1[block.block_catalog_id] = block.quantity
        
        # Register second user on same day
        AuthService.register_user(db, "user_second", "User Second", "password123")
        user2 = db.query(User).filter(User.username == "user_second").first()
        db.refresh(user2)
        
        inventory2 = InventoryService.get_user_inventory(db, user2.id)
        db.refresh(inventory2)
        
        # Get user2's blocks
        blocks2 = {}
        for block in inventory2.blocks:
            blocks2[block.block_catalog_id] = block.quantity
        
        # Both should have 30 blocks total
        total1 = sum(blocks1.values())
        total2 = sum(blocks2.values())
        assert total1 == 30, f"User1: Expected 30, got {total1}"
        assert total2 == 30, f"User2: Expected 30, got {total2}"
        
        # Most importantly: both users should have identical block distributions
        assert blocks1 == blocks2, (
            f"Users should have identical blocks on same day.\n"
            f"User1: {blocks1}\n"
            f"User2: {blocks2}"
        )
