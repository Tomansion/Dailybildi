"""Test daily block distribution logic"""
import pytest
from datetime import date, timedelta
from unittest.mock import patch, MagicMock
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.services.block_service import BlockService
from app.services.block_loader import BlockLoader
from app.models import User, UserInventory, InventoryBlock, BlockCatalog
from app.db import SessionLocal, Base, engine
from app.config import get_settings

settings = get_settings()


@pytest.fixture(scope="module")
def setup_test_db():
    """Create test database and seed with blocks"""
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    # Seed BlockCatalog from loader
    db = SessionLocal()
    all_blocks = BlockLoader.load_blocks(settings.UNIVERSE_ID)
    
    for block in all_blocks:
        existing = db.query(BlockCatalog).filter(BlockCatalog.id == block.id).first()
        if not existing:
            catalog_block = BlockCatalog(
                id=block.id,
                block_id=block.block_id,
                layer=block.layer,
                rarity=block.rarity,
                universe_id=settings.UNIVERSE_ID,
                image_path=block.image_path
            )
            db.add(catalog_block)
    
    db.commit()
    db.close()
    
    yield
    
    # Cleanup
    Base.metadata.drop_all(bind=engine)


class TestDailyBlockDistribution:
    """Test block distribution scenarios"""
    
    def test_case_1_first_login_gets_30_blocks(self, setup_test_db):
        """Scenario 1: First login should get 30 initial blocks"""
        db = SessionLocal()
        
        # Create test user
        user = User(username="test_user_1", display_name="Test User 1", password_hash="hashed_pass")
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Create inventory (no last_distributions set)
        inventory = UserInventory(user_id=user.id)
        db.add(inventory)
        db.commit()
        db.refresh(inventory)
        
        # Load blocks
        all_blocks = BlockLoader.load_blocks(settings.UNIVERSE_ID)
        block_models = db.query(BlockCatalog).filter(
            BlockCatalog.universe_id == settings.UNIVERSE_ID
        ).all()
        
        # Distribute blocks
        result = BlockService.distribute_blocks_to_user(
            db,
            inventory.id,
            settings.UNIVERSE_ID
        )
        
        # Verify
        db.refresh(inventory)
        total_quantity = db.query(InventoryBlock).filter(
            InventoryBlock.inventory_id == inventory.id
        ).with_entities(func.sum(InventoryBlock.quantity)).scalar() or 0
        
        assert result["action"] == "initial"
        assert result["blocks_added"] == 30
        assert total_quantity == 30
        assert inventory.last_distributions[settings.UNIVERSE_ID] == str(date.today())
        
        print(f"✅ CASE 1: First login - Got {result['blocks_added']} blocks")
        
        db.close()
    
    def test_case_2_same_day_skip_distribution(self, setup_test_db):
        """Scenario 2: Accessing inventory same day should skip"""
        db = SessionLocal()
        
        # Create test user
        user = User(username="test_user_2", display_name="Test User 2", password_hash="hashed_pass")
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Create inventory with today's distribution
        inventory = UserInventory(
            user_id=user.id,
            last_distributions={settings.UNIVERSE_ID: str(date.today())}
        )
        db.add(inventory)
        db.commit()
        db.refresh(inventory)
        
        # Add some blocks
        block_models = db.query(BlockCatalog).filter(
            BlockCatalog.universe_id == settings.UNIVERSE_ID
        ).first()
        
        inv_block = InventoryBlock(
            inventory_id=inventory.id,
            block_catalog_id=block_models.id,
            quantity=15
        )
        db.add(inv_block)
        db.commit()
        
        # Try to distribute (should skip)
        result = BlockService.distribute_blocks_to_user(
            db,
            inventory.id,
            settings.UNIVERSE_ID
        )
        
        # Verify
        assert result["action"] == "skipped"
        assert result["blocks_added"] == 0
        
        print(f"✅ CASE 2: Same day - Skipped (action: {result['action']})")
        
        db.close()
    
    def test_case_3a_new_day_with_few_blocks_stacks(self, setup_test_db):
        """Scenario 3a: New day with 3 blocks should stack to 13"""
        db = SessionLocal()
        
        # Create test user
        user = User(username="test_user_3a", display_name="Test User 3a", password_hash="hashed_pass")
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Create inventory with yesterday's distribution
        yesterday = str(date.today() - timedelta(days=1))
        inventory = UserInventory(
            user_id=user.id,
            last_distributions={settings.UNIVERSE_ID: yesterday}
        )
        db.add(inventory)
        db.commit()
        db.refresh(inventory)
        
        # Add 3 blocks
        block_models = db.query(BlockCatalog).filter(
            BlockCatalog.universe_id == settings.UNIVERSE_ID
        ).limit(1).all()
        
        inv_block = InventoryBlock(
            inventory_id=inventory.id,
            block_catalog_id=block_models[0].id,
            quantity=3
        )
        db.add(inv_block)
        db.commit()
        
        # Verify starting state
        from sqlalchemy import func
        start_qty = db.query(InventoryBlock).filter(
            InventoryBlock.inventory_id == inventory.id
        ).with_entities(func.sum(InventoryBlock.quantity)).scalar() or 0
        assert start_qty == 3
        
        # Distribute blocks
        result = BlockService.distribute_blocks_to_user(
            db,
            inventory.id,
            settings.UNIVERSE_ID
        )
        
        # Verify
        db.refresh(inventory)
        end_qty = db.query(InventoryBlock).filter(
            InventoryBlock.inventory_id == inventory.id
        ).with_entities(func.sum(InventoryBlock.quantity)).scalar() or 0
        
        assert result["action"] == "daily_stack"
        assert result["blocks_added"] == 10
        assert result["previous_count"] == 3
        assert result["new_count"] == 13
        assert end_qty == 13
        assert inventory.last_distributions[settings.UNIVERSE_ID] == str(date.today())
        
        print(f"✅ CASE 3a: New day with 3 blocks - Stacked: {result['previous_count']} + {result['blocks_added']} = {result['new_count']}")
        
        db.close()
    
    def test_case_3b_new_day_with_many_blocks_stacks_to_cap(self, setup_test_db):
        """Scenario 3b: New day with 23 blocks should stack to 30 (capped)"""
        db = SessionLocal()
        
        # Create test user
        user = User(username="test_user_3b", display_name="Test User 3b", password_hash="hashed_pass")
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Create inventory with yesterday's distribution
        yesterday = str(date.today() - timedelta(days=1))
        inventory = UserInventory(
            user_id=user.id,
            last_distributions={settings.UNIVERSE_ID: yesterday}
        )
        db.add(inventory)
        db.commit()
        db.refresh(inventory)
        
        # Add 23 blocks
        block_models = db.query(BlockCatalog).filter(
            BlockCatalog.universe_id == settings.UNIVERSE_ID
        ).limit(3).all()
        
        for i, block in enumerate(block_models):
            inv_block = InventoryBlock(
                inventory_id=inventory.id,
                block_catalog_id=block.id,
                quantity=8 if i < 2 else 7
            )
            db.add(inv_block)
        db.commit()
        
        # Verify starting state
        from sqlalchemy import func
        start_qty = db.query(InventoryBlock).filter(
            InventoryBlock.inventory_id == inventory.id
        ).with_entities(func.sum(InventoryBlock.quantity)).scalar() or 0
        assert start_qty == 23
        
        # Distribute blocks
        result = BlockService.distribute_blocks_to_user(
            db,
            inventory.id,
            settings.UNIVERSE_ID
        )
        
        # Verify
        db.refresh(inventory)
        end_qty = db.query(InventoryBlock).filter(
            InventoryBlock.inventory_id == inventory.id
        ).with_entities(func.sum(InventoryBlock.quantity)).scalar() or 0
        
        assert result["action"] == "daily_stack"
        assert result["blocks_added"] == 7  # 23 + 10 = 33, but capped at 30, so only 7 added
        assert result["previous_count"] == 23
        assert result["new_count"] == 30
        assert end_qty == 30
        assert inventory.last_distributions[settings.UNIVERSE_ID] == str(date.today())
        
        print(f"✅ CASE 3b: New day with 23 blocks - Stacked: {result['previous_count']} + {result['blocks_added']} = {result['new_count']} (capped at 30)")
        
        db.close()
    
    def test_case_3c_new_day_already_at_max_adds_nothing(self, setup_test_db):
        """Scenario 3c: New day with 30 blocks (at max) should add nothing"""
        db = SessionLocal()
        
        # Create test user
        user = User(username="test_user_3c", display_name="Test User 3c", password_hash="hashed_pass")
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Create inventory with yesterday's distribution
        yesterday = str(date.today() - timedelta(days=1))
        inventory = UserInventory(
            user_id=user.id,
            last_distributions={settings.UNIVERSE_ID: yesterday}
        )
        db.add(inventory)
        db.commit()
        db.refresh(inventory)
        
        # Add 30 blocks (at max)
        block_models = db.query(BlockCatalog).filter(
            BlockCatalog.universe_id == settings.UNIVERSE_ID
        ).limit(4).all()
        
        qty_per_block = [8, 8, 8, 6]
        for i, block in enumerate(block_models):
            inv_block = InventoryBlock(
                inventory_id=inventory.id,
                block_catalog_id=block.id,
                quantity=qty_per_block[i]
            )
            db.add(inv_block)
        db.commit()
        
        # Verify starting state
        from sqlalchemy import func
        start_qty = db.query(InventoryBlock).filter(
            InventoryBlock.inventory_id == inventory.id
        ).with_entities(func.sum(InventoryBlock.quantity)).scalar() or 0
        assert start_qty == 30
        
        # Distribute blocks
        result = BlockService.distribute_blocks_to_user(
            db,
            inventory.id,
            settings.UNIVERSE_ID
        )
        
        # Verify
        db.refresh(inventory)
        end_qty = db.query(InventoryBlock).filter(
            InventoryBlock.inventory_id == inventory.id
        ).with_entities(func.sum(InventoryBlock.quantity)).scalar() or 0
        
        assert result["action"] == "daily_stack"
        assert result["blocks_added"] == 0
        assert result["previous_count"] == 30
        assert result["new_count"] == 30
        assert end_qty == 30
        assert inventory.last_distributions[settings.UNIVERSE_ID] == str(date.today())
        
        print(f"✅ CASE 3c: New day with 30 blocks - Already at max, added 0")
        
        db.close()
    
    def test_case_4a_missed_2_days_gets_20_blocks(self, setup_test_db):
        """Scenario 4a: User who didn't connect for 2 days should receive 20 blocks (2×10)"""
        db = SessionLocal()
        
        # Create test user
        user = User(username="test_user_4a", display_name="Test User 4a", password_hash="hashed_pass")
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Create inventory with distribution 2 days ago, no blocks
        two_days_ago = str(date.today() - timedelta(days=2))
        inventory = UserInventory(
            user_id=user.id,
            last_distributions={settings.UNIVERSE_ID: two_days_ago}
        )
        db.add(inventory)
        db.commit()
        db.refresh(inventory)
        
        # Distribute blocks
        result = BlockService.distribute_blocks_to_user(
            db,
            inventory.id,
            settings.UNIVERSE_ID
        )
        
        # Verify
        from sqlalchemy import func
        end_qty = db.query(InventoryBlock).filter(
            InventoryBlock.inventory_id == inventory.id
        ).with_entities(func.sum(InventoryBlock.quantity)).scalar() or 0
        
        assert result["action"] == "daily_stack"
        assert result["blocks_added"] == 20  # 2 days × 10 blocks
        assert result["previous_count"] == 0
        assert result["new_count"] == 20
        assert end_qty == 20
        assert inventory.last_distributions[settings.UNIVERSE_ID] == str(date.today())
        
        print(f"✅ CASE 4a: Missed 2 days - Caught up: {result['previous_count']} + {result['blocks_added']} = {result['new_count']}")
        
        db.close()
    
    def test_case_4b_missed_3_days_gets_30_blocks(self, setup_test_db):
        """Scenario 4b: User who didn't connect for 3 days should receive 30 blocks (capped)"""
        db = SessionLocal()
        
        # Create test user
        user = User(username="test_user_4b", display_name="Test User 4b", password_hash="hashed_pass")
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Create inventory with distribution 3 days ago, no blocks
        three_days_ago = str(date.today() - timedelta(days=3))
        inventory = UserInventory(
            user_id=user.id,
            last_distributions={settings.UNIVERSE_ID: three_days_ago}
        )
        db.add(inventory)
        db.commit()
        db.refresh(inventory)
        
        # Distribute blocks
        result = BlockService.distribute_blocks_to_user(
            db,
            inventory.id,
            settings.UNIVERSE_ID
        )
        
        # Verify
        from sqlalchemy import func
        end_qty = db.query(InventoryBlock).filter(
            InventoryBlock.inventory_id == inventory.id
        ).with_entities(func.sum(InventoryBlock.quantity)).scalar() or 0
        
        assert result["action"] == "daily_stack"
        assert result["blocks_added"] == 30  # 3 days × 10 blocks = 30, capped at 30
        assert result["previous_count"] == 0
        assert result["new_count"] == 30
        assert end_qty == 30
        assert inventory.last_distributions[settings.UNIVERSE_ID] == str(date.today())
        
        print(f"✅ CASE 4b: Missed 3 days - Caught up to max: {result['previous_count']} + {result['blocks_added']} = {result['new_count']}")
        
        db.close()
    
    def test_case_4c_missed_5_days_gets_30_blocks_capped(self, setup_test_db):
        """Scenario 4c: User who didn't connect for 5 days should receive 30 blocks (capped)"""
        db = SessionLocal()
        
        # Create test user
        user = User(username="test_user_4c", display_name="Test User 4c", password_hash="hashed_pass")
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Create inventory with distribution 5 days ago, no blocks
        five_days_ago = str(date.today() - timedelta(days=5))
        inventory = UserInventory(
            user_id=user.id,
            last_distributions={settings.UNIVERSE_ID: five_days_ago}
        )
        db.add(inventory)
        db.commit()
        db.refresh(inventory)
        
        # Distribute blocks
        result = BlockService.distribute_blocks_to_user(
            db,
            inventory.id,
            settings.UNIVERSE_ID
        )
        
        # Verify
        from sqlalchemy import func
        end_qty = db.query(InventoryBlock).filter(
            InventoryBlock.inventory_id == inventory.id
        ).with_entities(func.sum(InventoryBlock.quantity)).scalar() or 0
        
        assert result["action"] == "daily_stack"
        assert result["blocks_added"] == 30  # 5 days × 10 blocks = 50, but capped at 30
        assert result["previous_count"] == 0
        assert result["new_count"] == 30
        assert end_qty == 30
        assert inventory.last_distributions[settings.UNIVERSE_ID] == str(date.today())
        
        print(f"✅ CASE 4c: Missed 5 days - Caught up to max: {result['previous_count']} + {result['blocks_added']} = {result['new_count']} (would be 50, capped at 30)")
        
        db.close()


if __name__ == "__main__":
    # Run with: pytest tests/test_distribution.py -v -s
    pytest.main([__file__, "-v", "-s"])
