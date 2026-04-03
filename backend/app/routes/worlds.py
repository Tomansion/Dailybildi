from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from app.db import get_db
from app.schemas import WorldResponse, CommunityWorldResponse, PlacedBlockRequest, PlacedBlockUpdateRequest, PlacedBlockResponse
from app.services.world_service import WorldService
from app.services.inventory_service import InventoryService
from app.services.block_loader import BlockLoader
from app.services.universe_service import UniverseService
from app.utils.jwt import verify_token

router = APIRouter(prefix="/api/world", tags=["worlds"])


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


def _enrich_placed_blocks_with_metadata(world):
    """Enrich placed blocks with metadata from filesystem"""
    try:
        block_metadata_map = {}
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
        
        # Enrich each placed block
        for block in world.placed_blocks:
            metadata = block_metadata_map.get(block.block_catalog_id, {})
            block.block_id = metadata.get('block_id', '')
            block.layer = metadata.get('layer', 0)
            block.rarity = metadata.get('rarity', 0)
            block.image_path = metadata.get('image_path', '')
    except Exception as e:
        # Log error but don't fail - blocks will just have empty metadata
        print(f"Error enriching placed blocks: {str(e)}")
    
    return world


@router.get("", response_model=WorldResponse)
def get_user_world(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    """Get current user's world"""
    try:
        world = WorldService.get_user_world(db, user_id)
        if not world:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="World not found")
        
        # Enrich placed blocks with metadata from filesystem
        world = _enrich_placed_blocks_with_metadata(world)
        
        return world
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("", response_model=PlacedBlockResponse)
def place_block(
    request: PlacedBlockRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """Place a block on user's world"""
    try:
        # Get user's world
        world = WorldService.get_user_world(db, user_id)
        if not world:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="World not found")

        # Check if user has this block in inventory
        inventory = InventoryService.get_user_inventory(db, user_id)
        if not inventory:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory not found")

        # Verify the block exists in inventory with quantity > 0
        block_in_inventory = None
        for inv_block in inventory.blocks:
            if inv_block.block_catalog_id == request.block_catalog_id and inv_block.quantity > 0:
                block_in_inventory = inv_block
                break
        
        if not block_in_inventory:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Block not found in inventory or out of stock"
            )

        # Place the block
        placed_block = WorldService.place_block(
            db,
            world.id,
            request.block_catalog_id,
            request.grid_x,
            request.grid_y,
            request.z_order,
            request.rotation,
            request.flip_x,
            request.flip_y,
            user_id=user_id
        )
        
        # Enrich with block metadata
        try:
            block_metadata_map = {}
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
            
            metadata = block_metadata_map.get(placed_block.block_catalog_id, {})
            placed_block.block_id = metadata.get('block_id', '')
            placed_block.layer = metadata.get('layer', 0)
            placed_block.rarity = metadata.get('rarity', 0)
            placed_block.image_path = metadata.get('image_path', '')
        except Exception as e:
            print(f"Error enriching placed block: {str(e)}")

        return placed_block
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/{world_id}", response_model=CommunityWorldResponse)
def get_world(world_id: str, db: Session = Depends(get_db)):
    """Get a world by ID (read-only, public)"""
    try:
        world = WorldService.get_world_by_id(db, world_id)
        if not world:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="World not found")
        
        # Enrich placed blocks with metadata from filesystem
        world = _enrich_placed_blocks_with_metadata(world)
        
        return world
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.patch("/blocks/{block_id}", response_model=PlacedBlockResponse)
def update_placed_block(
    block_id: str,
    request: PlacedBlockUpdateRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """Update a placed block's position and properties"""
    try:
        placed_block = WorldService.update_placed_block(
            db,
            block_id,
            request.grid_x,
            request.grid_y,
            request.rotation,
            request.flip_x,
            request.flip_y,
            request.z_order
        )
        
        # Enrich with block metadata
        try:
            block_metadata_map = {}
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
            
            metadata = block_metadata_map.get(placed_block.block_catalog_id, {})
            placed_block.block_id = metadata.get('block_id', '')
            placed_block.layer = metadata.get('layer', 0)
            placed_block.rarity = metadata.get('rarity', 0)
            placed_block.image_path = metadata.get('image_path', '')
        except Exception as e:
            print(f"Error enriching placed block: {str(e)}")
        
        return placed_block
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.delete("/blocks/{block_id}")
def remove_placed_block(
    block_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """Remove a placed block from the world"""
    try:
        success = WorldService.remove_placed_block(db, block_id)
        if not success:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Block not found")
        
        # Return block to inventory
        # This could be implemented if needed
        
        return {"message": "Block removed successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
