"""Tests for block placement duplication bug"""
import pytest
from app.services.world_service import WorldService
from app.services.inventory_service import InventoryService
from app.models import World, PlacedBlock
from app.config import get_settings


class TestDuplicatePlacement:
    """Test that placing blocks respects inventory quantities"""
    
    def test_cannot_place_block_without_inventory(self, db, test_user, test_inventory, test_blocks_catalog):
        """
        REGRESSION TEST: Should not be able to place a block when it's not in inventory.
        
        This test will FAIL with the current bug (where inventory validation is missing).
        Once fixed, it should PASS.
        """
        settings = get_settings()
        first_block = test_blocks_catalog[0]
        
        # Setup: Create a world but DON'T add block to inventory
        world = World(
            id="world-1",
            user_id=test_user.id,
            universe_id=settings.UNIVERSE_ID
        )
        db.add(world)
        db.commit()
        db.refresh(world)
        
        # Attempt to place a block that is NOT in inventory
        # This should raise a ValueError
        with pytest.raises(ValueError, match="not found in inventory|out of stock"):
            WorldService.place_block(
                db,
                world.id,
                first_block.id,
                grid_x=0,
                grid_y=0,
                rotation=0,
                flip_x=False,
                flip_y=False,
                z_order=0,
                user_id=test_user.id
            )
    
    def test_cannot_place_block_twice_with_quantity_one(self, db, test_user, test_inventory, test_blocks_catalog):
        """
        REGRESSION TEST: Should not be able to place the same block twice when only 1 is available.
        
        This test verifies inventory is properly managed:
        1. Add 1 block to inventory
        2. Place it (depletes inventory)
        3. Should not be able to place a second copy
        
        Will FAIL with current bug, PASS when fixed.
        """
        settings = get_settings()
        first_block = test_blocks_catalog[0]
        
        # Add exactly 1 block to inventory
        InventoryService.add_block_to_inventory(
            db,
            inventory_id=test_inventory.id,
            block_catalog_id=first_block.id,
            quantity=1
        )
        
        db.refresh(test_inventory)
        assert test_inventory.blocks[0].quantity == 1
        
        # Create world
        world = World(
            id="world-1",
            user_id=test_user.id,
            universe_id=settings.UNIVERSE_ID
        )
        db.add(world)
        db.commit()
        db.refresh(world)
        
        # First placement should succeed (we have 1 block)
        placed_block_1 = WorldService.place_block(
            db,
            world.id,
            first_block.id,
            grid_x=0,
            grid_y=0,
            rotation=0,
            flip_x=False,
            flip_y=False,
            z_order=0,
            user_id=test_user.id
        )
        assert placed_block_1 is not None
        
        # Second placement should FAIL (no blocks left in inventory)
        with pytest.raises(ValueError, match="not found in inventory|out of stock"):
            WorldService.place_block(
                db,
                world.id,
                first_block.id,
                grid_x=1,
                grid_y=0,
                rotation=0,
                flip_x=False,
                flip_y=False,
                z_order=0,
                user_id=test_user.id
            )
    
    def test_can_place_multiple_blocks_if_quantity_allows(self, db, test_user, test_inventory, test_blocks_catalog):
        """
        REGRESSION TEST: Should be able to place multiple copies if quantity in inventory allows it.
        
        Verifies the correct positive case - with 2 blocks, you should be able to place 2.
        """
        settings = get_settings()
        first_block = test_blocks_catalog[0]
        
        # Add 2 blocks to inventory
        InventoryService.add_block_to_inventory(
            db,
            inventory_id=test_inventory.id,
            block_catalog_id=first_block.id,
            quantity=2
        )
        
        db.refresh(test_inventory)
        assert test_inventory.blocks[0].quantity == 2
        
        # Create a world
        world = World(
            id="world-2",
            user_id=test_user.id,
            universe_id=settings.UNIVERSE_ID
        )
        db.add(world)
        db.commit()
        db.refresh(world)
        
        # Place first block - should succeed
        placed_1 = WorldService.place_block(
            db,
            world.id,
            first_block.id,
            grid_x=0,
            grid_y=0,
            rotation=0,
            flip_x=False,
            flip_y=False,
            z_order=0,
            user_id=test_user.id
        )
        assert placed_1 is not None
        
        # Place second copy of same block - should also succeed
        placed_2 = WorldService.place_block(
            db,
            world.id,
            first_block.id,
            grid_x=1,
            grid_y=0,
            rotation=0,
            flip_x=False,
            flip_y=False,
            z_order=0,
            user_id=test_user.id
        )
        assert placed_2 is not None
        
        # Verify we have 2 placed blocks
        world_placed = db.query(PlacedBlock).filter(PlacedBlock.world_id == world.id).all()
        assert len(world_placed) == 2, "Should have 2 placed blocks"
    
    def test_placement_decrements_inventory(self, db, test_user, test_inventory, test_blocks_catalog):
        """
        REGRESSION TEST: Placing a block should decrement inventory quantity.
        """
        settings = get_settings()
        first_block = test_blocks_catalog[0]
        
        # Add 5 blocks to inventory
        InventoryService.add_block_to_inventory(
            db,
            inventory_id=test_inventory.id,
            block_catalog_id=first_block.id,
            quantity=5
        )
        
        db.refresh(test_inventory)
        initial_quantity = test_inventory.blocks[0].quantity
        assert initial_quantity == 5, "Should start with 5 blocks"
        
        # Create world
        world = World(
            id="world-3",
            user_id=test_user.id,
            universe_id=settings.UNIVERSE_ID
        )
        db.add(world)
        db.commit()
        
        # Place a block
        WorldService.place_block(
            db,
            world.id,
            first_block.id,
            grid_x=0,
            grid_y=0,
            rotation=0,
            flip_x=False,
            flip_y=False,
            z_order=0,
            user_id=test_user.id
        )
        
        # Verify inventory was decremented
        db.refresh(test_inventory)
        final_quantity = test_inventory.blocks[0].quantity
        
        assert final_quantity == 4, (
            f"Inventory should be decremented after placement. "
            f"Expected 4, got {final_quantity}"
        )
