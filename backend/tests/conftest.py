"""Pytest configuration and fixtures"""
import pytest
import os
import sys
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from unittest.mock import patch, MagicMock

# Add backend to path
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

# Set test database BEFORE importing app modules
# This ensures all database connections use the test database
project_root = Path(__file__).parent.parent.parent
test_db_path = project_root / "dailybildi-test.db"
os.environ["DATABASE_URL"] = f"sqlite:///{test_db_path}"

from app.db import Base
from app.models import User, UserInventory, BlockCatalog, InventoryBlock
from app.config import get_settings
from app.services.block_loader import BlockConfig, BlockLoader


@pytest.fixture(scope="session", autouse=True)
def cleanup_test_db():
    """Clean up test database after all tests complete"""
    yield
    # After all tests, remove the test database file
    test_db_path = Path(__file__).parent.parent.parent / "dailybildi-test.db"
    if test_db_path.exists():
        test_db_path.unlink()


@pytest.fixture(scope="session")
def test_db():
    """Create an in-memory test database"""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    SessionLocal.bind = engine
    return SessionLocal


@pytest.fixture
def db(test_db):
    """Provide a fresh database for each test"""
    connection = test_db.bind.connect()
    transaction = connection.begin()
    session = test_db(bind=connection)
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def test_user(db):
    """Create a test user"""
    user = User(
        id="test-user-1",
        username="testuser",
        display_name="Test User",
        password_hash="hashed_password"
    )
    db.add(user)
    db.commit()
    return user


@pytest.fixture
def test_inventory(db, test_user):
    """Create a test inventory"""
    inventory = UserInventory(
        id="inv-1",
        user_id=test_user.id,
        initial_blocks_received=False,
        last_blocks_provided_date=None,
        last_distributions={}
    )
    db.add(inventory)
    db.commit()
    db.refresh(inventory)
    return inventory


@pytest.fixture
def test_blocks_catalog(db):
    """Create test blocks in catalog"""
    blocks = [
        BlockCatalog(
            id=f"block-{i}",
            block_id=str(i),
            layer=0,
            rarity=0,
            universe_id="test_universe",
            image_path=f"/tiles/block_{i}.png"
        )
        for i in range(1, 6)
    ]
    db.add_all(blocks)
    db.commit()
    return blocks


@pytest.fixture(autouse=True)
def mock_block_loader():
    """Mock BlockLoader to return test blocks for test universes"""
    original_load = BlockLoader.load_blocks
    
    def mock_load(universe_id: str):
        # For test_universe or ink_castle, return test blocks
        if universe_id in ["test_universe", "ink_castle"]:
            blocks = [
                BlockConfig(
                    block_id=str(i),
                    layer=0,
                    rarity=0,
                    image_path=f"/tiles/block_{i}.png",
                    universe_id=universe_id
                )
                for i in range(1, 6)
            ]
            return blocks
        return []
    
    # Patch BlockLoader.load_blocks
    with patch.object(BlockLoader, 'load_blocks', side_effect=mock_load):
        yield
