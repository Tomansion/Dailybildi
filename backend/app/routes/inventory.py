from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from app.db import get_db
from app.schemas import UserInventoryResponse, InventoryBlockResponse
from app.services.inventory_service import InventoryService
from app.services.block_service import BlockService
from app.services.block_loader import BlockLoader
from app.utils.jwt import verify_token
from app.models import World
from app.config import get_settings

settings = get_settings()

router = APIRouter(prefix="/api/inventory", tags=["inventory"])


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


@router.get("", response_model=UserInventoryResponse)
def get_inventory(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    """Get user's inventory with daily block distribution check"""
    try:
        inventory = InventoryService.get_user_inventory(db, user_id)
        if not inventory:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory not found")
        
        # Check and distribute daily blocks for all universes user has entered
        _distribute_daily_blocks_if_needed(db, user_id)
        
        # Refresh inventory to get updated blocks
        db.refresh(inventory)
        
        # Build a map of block_id -> block metadata from all universes
        block_metadata_map = {}
        from app.services.universe_service import UniverseService
        universes = UniverseService.list_universes()
        
        for universe in universes:
            blocks = BlockLoader.load_blocks(universe['id'])
            for block in blocks:
                block_metadata_map[block.id] = {
                    'block_id': block.block_id,
                    'layer': block.layer,
                    'rarity': block.rarity,
                    'image_path': block.image_path
                }
        
        # Calculate total blocks and enrich block data
        total_blocks = 0
        blocks_response = []
        
        for block in inventory.blocks:
            total_blocks += block.quantity
            
            # Get block metadata
            metadata = block_metadata_map.get(block.block_catalog_id, {})
            
            block_response = InventoryBlockResponse(
                id=block.id,
                block_catalog_id=block.block_catalog_id,
                quantity=block.quantity,
                acquired_date=block.acquired_date,
                block_id=metadata.get('block_id', ''),
                layer=metadata.get('layer', 0),
                rarity=metadata.get('rarity', 0),
                image_path=metadata.get('image_path', '')
            )
            blocks_response.append(block_response)
        
        # Build response
        response = UserInventoryResponse(
            id=inventory.id,
            user_id=inventory.user_id,
            updated_at=inventory.updated_at,
            blocks=blocks_response,
            total_blocks=total_blocks
        )
        
        return response
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


def _distribute_daily_blocks_if_needed(db: Session, user_id: str):
    """Check and distribute daily blocks for all universes user has entered or could enter"""
    try:
        # First, try to distribute for universes with worlds
        worlds = db.query(World).filter(World.user_id == user_id).all()
        
        universe_ids = set(world.universe_id for world in worlds) if worlds else set()
        
        # If no worlds, also try default universe
        if not universe_ids:
            universe_ids.add(settings.UNIVERSE_ID)
        
        # For each universe, check if we should distribute daily blocks
        for universe_id in universe_ids:
            try:
                # Get user's inventory
                inventory = InventoryService.get_user_inventory(db, user_id)
                if not inventory:
                    continue
                
                # Distribute blocks if needed (loads blocks from filesystem/config.json)
                BlockService.distribute_blocks_to_user(
                    db,
                    inventory.id,
                    universe_id
                )
            except ValueError as e:
                # Log but don't fail - continue with other universes
                continue
            except Exception as e:
                # Log but don't fail - continue with other universes
                continue
    except Exception as e:
        # Don't raise - this is a non-critical operation
        pass


@router.post("/add-block")
def add_block_to_inventory(
    block_id: str,
    quantity: int = 1,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """Add a block to user's inventory (admin/testing)"""
    try:
        block = InventoryService.add_block_to_inventory(db, user_id, block_id, quantity)
        return {"message": "Block added successfully", "block_id": block.id}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
