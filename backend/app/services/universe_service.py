import os
import json
from pathlib import Path
from sqlalchemy.orm import Session
from app.models import BlockCatalog, World, UserInventory
from app.config import get_settings

settings = get_settings()


class UniverseService:
    """Service for managing universes and their configuration"""
    
    # Path to the public assets folder (one level up from backend, then into public)
    UNIVERSES_BASE_PATH = Path(__file__).parent.parent.parent.parent / "public" / "univers"
    
    @staticmethod
    def get_universe_path(universe_id: str) -> Path:
        """Get the path for a specific universe"""
        return UniverseService.UNIVERSES_BASE_PATH / universe_id
    
    @staticmethod
    def get_universe_config(universe_id: str) -> dict:
        """Load the universe configuration from config.json"""
        universe_path = UniverseService.get_universe_path(universe_id)
        config_path = universe_path / "config.json"
        
        if not config_path.exists():
            raise FileNotFoundError(f"Config not found for universe {universe_id}")
        
        with open(config_path, 'r') as f:
            config = json.load(f)
        
        # Add universe ID to config
        config["id"] = universe_id
        return config
    
    @staticmethod
    def list_universes() -> list[dict]:
        """List all available universes"""
        universes = []
        
        if not UniverseService.UNIVERSES_BASE_PATH.exists():
            return universes
        
        for universe_dir in UniverseService.UNIVERSES_BASE_PATH.iterdir():
            if universe_dir.is_dir():
                universe_id = universe_dir.name
                
                try:
                    config = UniverseService.get_universe_config(universe_id)
                    universes.append({
                        "id": universe_id,
                        "name": config.get("name", universe_id.replace("_", " ").title()),
                        "config": config,
                        "block_count": len(config.get("blocks", []))
                    })
                except Exception as e:
                    print(f"Error loading universe {universe_id}: {e}")
        
        return universes
    
    @staticmethod
    def get_universe_blocks(universe_id: str) -> list[dict]:
        """Get all blocks for a specific universe from its config"""
        try:
            config = UniverseService.get_universe_config(universe_id)
            return config.get("blocks", [])
        except FileNotFoundError:
            return []
    
    @staticmethod
    def initialize_user_in_universe(
        db: Session,
        user_id: str,
        universe_id: str
    ) -> dict:
        """Initialize a user in a universe - creates world, inventory, and distributes blocks"""
        from app.services.world_service import WorldService
        from app.services.inventory_service import InventoryService
        from app.services.block_service import BlockService
        
        # Check if user already has a world in this universe
        existing_world = db.query(World).filter(
            World.user_id == user_id,
            World.universe_id == universe_id
        ).first()
        
        if existing_world:
            return {
                "world_id": existing_world.id,
                "is_new": False
            }
        
        # Create new world for this universe
        world = WorldService.create_world(db, user_id, universe_id)
        
        # Check if user has inventory - create if needed
        inventory = db.query(UserInventory).filter(
            UserInventory.user_id == user_id
        ).first()
        
        if not inventory:
            inventory = InventoryService.create_inventory(db, user_id)
        
        # Get blocks available for this universe
        all_blocks = db.query(BlockCatalog).filter(
            BlockCatalog.universe_id == universe_id
        ).all()
        
        if all_blocks:
            # Load universe config for daily selections
            try:
                universe_config = UniverseService.get_universe_config(universe_id)
            except Exception:
                universe_config = None
            
            # Distribute blocks with date tracking (30 first time, 10 per day)
            BlockService.distribute_blocks_to_user(
                db,
                inventory.id,
                all_blocks,
                universe_config
            )
        
        return {
            "world_id": world.id,
            "universe_id": universe_id,
            "is_new": True
        }
