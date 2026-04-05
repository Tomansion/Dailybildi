from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from app.models import World, PlacedBlock, BlockCatalog, User
from app.services.inventory_service import InventoryService
from app.config import get_settings

settings = get_settings()


class WorldService:
    """Service for managing worlds and placed blocks"""

    @staticmethod
    def create_world(db: Session, user_id: str, universe_id: str = None) -> World:
        """Create a new world for a user"""
        if universe_id is None:
            universe_id = settings.UNIVERSE_ID

        world = World(
            user_id=user_id,
            universe_id=universe_id
        )
        db.add(world)
        db.commit()
        db.refresh(world)
        return world

    @staticmethod
    def get_user_world(db: Session, user_id: str) -> World:
        """Get the user's primary world"""
        world = db.query(World).filter(World.user_id == user_id).first()
        return world

    @staticmethod
    def get_world_by_id(db: Session, world_id: str) -> World:
        """Get a world by ID"""
        world = db.query(World).filter(World.id == world_id).first()
        return world

    @staticmethod
    def place_block(
        db: Session,
        world_id: str,
        block_catalog_id: str,
        grid_x: int,
        grid_y: int,
        z_order: int,
        rotation: int = 0,
        flip_x: bool = False,
        flip_y: bool = False,
        user_id: str = None
    ) -> PlacedBlock:
        """Place a block on the world"""
        # Note: Block existence is verified by the route handler against inventory
        # No need to query BlockCatalog since blocks are now filesystem-based

        # Create placed block
        placed_block = PlacedBlock(
            world_id=world_id,
            block_catalog_id=block_catalog_id,
            grid_x=grid_x,
            grid_y=grid_y,
            rotation=rotation,
            flip_x=flip_x,
            flip_y=flip_y,
            z_order=z_order
        )
        db.add(placed_block)

        # Remove block from inventory if user_id is provided
        if user_id:
            InventoryService.remove_block_from_inventory(
                db,
                user_id,
                block_catalog_id,
                quantity=1
            )

        # Update world timestamp
        world = WorldService.get_world_by_id(db, world_id)
        if world:
            world.updated_at = datetime.utcnow()

        db.commit()
        db.refresh(placed_block)
        return placed_block

    @staticmethod
    def update_placed_block(
        db: Session,
        block_id: str,
        grid_x: int = None,
        grid_y: int = None,
        rotation: int = None,
        flip_x: bool = None,
        flip_y: bool = None,
        z_order: int = None
    ) -> PlacedBlock:
        """Update a placed block's position and properties"""
        placed_block = db.query(PlacedBlock).filter(PlacedBlock.id == block_id).first()
        if not placed_block:
            raise ValueError("Block not found")

        if grid_x is not None:
            placed_block.grid_x = grid_x
        if grid_y is not None:
            placed_block.grid_y = grid_y
        if rotation is not None:
            placed_block.rotation = rotation
        if flip_x is not None:
            placed_block.flip_x = flip_x
        if flip_y is not None:
            placed_block.flip_y = flip_y
        if z_order is not None:
            placed_block.z_order = z_order

        # Update world timestamp
        world = WorldService.get_world_by_id(db, placed_block.world_id)
        if world:
            world.updated_at = datetime.utcnow()

        db.commit()
        db.refresh(placed_block)
        return placed_block

    @staticmethod
    def remove_placed_block(db: Session, block_id: str) -> bool:
        """Remove a placed block from the world"""
        placed_block = db.query(PlacedBlock).filter(PlacedBlock.id == block_id).first()
        if not placed_block:
            return False

        world_id = placed_block.world_id
        db.delete(placed_block)

        # Update world timestamp
        world = WorldService.get_world_by_id(db, world_id)
        if world:
            world.updated_at = datetime.utcnow()

        db.commit()
        return True

    @staticmethod
    def get_community_worlds(
        db: Session,
        skip: int = 0,
        limit: int = 20,
        sort_by: str = "recent"
    ) -> tuple[list, int]:
        """Get paginated community worlds"""
        from sqlalchemy.orm import selectinload
        
        # Query all worlds (including orphaned ones)
        base_query = db.query(World)
        total = base_query.count()
        
        # Sort
        if sort_by == "likes":
            base_query = base_query.order_by(desc(World.like_count))
        else:  # "recent"
            base_query = base_query.order_by(desc(World.updated_at))
        
        # Paginate first to get IDs
        paginated_worlds = base_query.offset(skip).limit(limit).all()
        
        if not paginated_worlds:
            return [], total
        
        world_ids = [w.id for w in paginated_worlds]
        
        # Load worlds with relationships (user may be None for orphaned worlds)
        worlds = db.query(World).filter(
            World.id.in_(world_ids)
        ).options(
            selectinload(World.user),
            selectinload(World.placed_blocks).selectinload(PlacedBlock.block_catalog)
        ).all()
        
        # Sort results to match original order
        if sort_by == "likes":
            worlds = sorted(worlds, key=lambda w: w.like_count, reverse=True)
        else:
            worlds = sorted(worlds, key=lambda w: w.updated_at, reverse=True)

        return worlds, total
