from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from app.db import get_db
from app.services.universe_service import UniverseService
from app.services.block_loader import BlockLoader
from app.utils.jwt import verify_token
from app.models import World, UserInventory

router = APIRouter(prefix="/api/universes", tags=["universes"])


def get_current_user_id(authorization: str = Header(None)) -> str:
    """Extract user ID from JWT token in Authorization header"""
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")
    
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token format")
    
    token = parts[1]
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return payload.get("sub")


def _enrich_world_for_preview(world, universe_id: str):
    """Enrich a world with block metadata and universe config for preview"""
    if not world:
        return None
    
    try:
        # Enrich placed blocks with metadata
        block_metadata_map = {}
        blocks = BlockLoader.load_blocks(universe_id)
        for block in blocks:
            block_metadata_map[block.id] = {
                'block_id': block.block_id,
                'layer': block.layer,
                'rarity': block.rarity,
                'image_path': block.image_path,
                'width': block.width,
                'height': block.height
            }
        
        # Enrich each placed block
        for block in world.placed_blocks:
            metadata = block_metadata_map.get(block.block_catalog_id, {})
            block.block_id = metadata.get('block_id', '')
            block.layer = metadata.get('layer', 0)
            block.rarity = metadata.get('rarity', 0)
            block.image_path = metadata.get('image_path', '')
            block.width = metadata.get('width', 1)
            block.height = metadata.get('height', 1)
    except Exception as e:
        print(f"Error enriching placed blocks: {str(e)}")
    
    # Add universe config
    try:
        universe_config = UniverseService.get_universe_config(universe_id)
        world.universeConfig = {
            "backgroundColor": universe_config.get("backgroundColor", "#ffffff"),
            "textColor": universe_config.get("textColor"),
            "blockSize": universe_config.get("blockSize", 64),
            "worldImageScale": universe_config.get("worldImageScale", 1.0)
        }
    except Exception as e:
        print(f"Error loading universe config: {str(e)}")
    
    return world


@router.get("/")
def list_universes(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    """Get list of all available universes with user's available and placed block counts"""
    try:
        from app.services.block_service import BlockService
        
        universes = UniverseService.list_universes()
        
        # Get user's inventory
        inventory = db.query(UserInventory).filter(
            UserInventory.user_id == user_id
        ).first()
        
        if not inventory:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User inventory not found"
            )
        
        # Distribute blocks for each universe first
        for universe in universes:
            try:
                BlockService.distribute_blocks_to_user(
                    db,
                    inventory.id,
                    universe["id"]
                )
            except Exception:
                # Continue even if distribution fails for a universe
                pass
        
        # Now get the total available blocks after distribution
        from sqlalchemy import func
        from app.models import InventoryBlock
        
        total_available_blocks = db.query(func.sum(InventoryBlock.quantity)).filter(
            InventoryBlock.inventory_id == inventory.id
        ).scalar() or 0
        
        # For each universe, include both available and placed block counts, plus a preview of user's world
        for universe in universes:
            # Get user's world in this universe
            world = db.query(World).filter(
                World.user_id == user_id,
                World.universe_id == universe["id"]
            ).first()
            
            placed_block_count = 0
            if world:
                placed_block_count = len(world.placed_blocks) if world.placed_blocks else 0
                # Enrich world for preview
                world = _enrich_world_for_preview(world, universe["id"])
            
            # Include both counts and the world for preview
            universe["available_blocks"] = total_available_blocks
            universe["placed_blocks"] = placed_block_count
            universe["world"] = world
        
        return {
            "universes": universes,
            "count": len(universes),
            "total_available_blocks": total_available_blocks
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/{universe_id}/blocks")
def get_universe_blocks(universe_id: str):
    """Get all blocks for a specific universe"""
    try:
        blocks = UniverseService.get_universe_blocks(universe_id)
        if not blocks:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Universe {universe_id} not found or has no blocks"
            )
        return {
            "universe_id": universe_id,
            "blocks": blocks,
            "count": len(blocks)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/{universe_id}/enter")
def enter_universe(
    universe_id: str
):
    """Enter a universe - returns availability"""
    try:
        # Return a response that indicates the universe is available
        return {
            "universe_id": universe_id,
            "status": "available"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/{universe_id}/enter/auth")
def enter_universe_auth(
    universe_id: str,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """Enter a universe with authentication - initializes world if needed"""
    try:
        if not authorization:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing authorization header"
            )
        
        # Extract token
        token = authorization.replace("Bearer ", "")
        
        # Verify token and get user_id
        payload = verify_token(token)
        user_id = payload.get("sub")
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        
        # Initialize user in universe
        result = UniverseService.initialize_user_in_universe(db, user_id, universe_id)
        
        return {
            "world_id": result["world_id"],
            "universe_id": universe_id,
            "is_new": result["is_new"]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

