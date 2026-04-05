from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Boolean, ForeignKey, UniqueConstraint, JSON
from sqlalchemy.orm import relationship
from app.db import Base
import uuid


class User(Base):
    __tablename__ = "user"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String, unique=True, nullable=False, index=True)
    display_name = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    first_login_at = Column(DateTime, nullable=True)
    received_initial_blocks = Column(Boolean, default=False)

    # Relationships
    inventory = relationship("UserInventory", back_populates="user", cascade="all, delete-orphan")
    worlds = relationship("World", back_populates="user", cascade="all, delete-orphan")
    likes = relationship("Like", back_populates="user", cascade="all, delete-orphan")


class BlockCatalog(Base):
    __tablename__ = "block_catalog"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    block_id = Column(String, nullable=False)
    layer = Column(Integer, nullable=False)
    rarity = Column(Integer, nullable=False)
    universe_id = Column(String, nullable=False)
    image_path = Column(String, nullable=False)

    # Relationships
    inventory_blocks = relationship("InventoryBlock", back_populates="block_catalog")
    placed_blocks = relationship("PlacedBlock", back_populates="block_catalog")


class UserInventory(Base):
    __tablename__ = "user_inventory"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("user.id", ondelete="CASCADE"), unique=True, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    initial_blocks_received = Column(Boolean, default=False)
    last_blocks_provided_date = Column(String, nullable=True)  # Legacy: Format: YYYY-MM-DD
    last_distributions = Column(JSON, default=dict)  # Per-universe distribution dates: {universe_id: YYYY-MM-DD}

    # Relationships
    user = relationship("User", back_populates="inventory")
    blocks = relationship("InventoryBlock", back_populates="inventory", cascade="all, delete-orphan")


class InventoryBlock(Base):
    __tablename__ = "inventory_block"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    inventory_id = Column(String, ForeignKey("user_inventory.id", ondelete="CASCADE"), nullable=False)
    block_catalog_id = Column(String, ForeignKey("block_catalog.id"), nullable=False)
    quantity = Column(Integer, default=1)
    acquired_date = Column(DateTime, default=datetime.utcnow)

    # Unique constraint on (inventoryId, blockCatalogId)
    __table_args__ = (UniqueConstraint('inventory_id', 'block_catalog_id'),)

    # Relationships
    inventory = relationship("UserInventory", back_populates="blocks")
    block_catalog = relationship("BlockCatalog", back_populates="inventory_blocks")


class World(Base):
    __tablename__ = "world"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    universe_id = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    like_count = Column(Integer, default=0)

    # Relationships
    user = relationship("User", back_populates="worlds")
    placed_blocks = relationship("PlacedBlock", back_populates="world", cascade="all, delete-orphan")
    likes = relationship("Like", back_populates="world", cascade="all, delete-orphan")


class PlacedBlock(Base):
    __tablename__ = "placed_block"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    world_id = Column(String, ForeignKey("world.id", ondelete="CASCADE"), nullable=False)
    block_catalog_id = Column(String, ForeignKey("block_catalog.id"), nullable=False)
    grid_x = Column(Integer, nullable=False)
    grid_y = Column(Integer, nullable=False)
    rotation = Column(Integer, default=0)  # 0, 90, 180, 270
    flip_x = Column(Boolean, default=False)
    flip_y = Column(Boolean, default=False)
    z_order = Column(Integer, nullable=False)
    placed_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    world = relationship("World", back_populates="placed_blocks")
    block_catalog = relationship("BlockCatalog", back_populates="placed_blocks")


class Like(Base):
    __tablename__ = "like"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    world_id = Column(String, ForeignKey("world.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Unique constraint on (userId, worldId)
    __table_args__ = (UniqueConstraint('user_id', 'world_id'),)

    # Relationships
    user = relationship("User", back_populates="likes")
    world = relationship("World", back_populates="likes")
