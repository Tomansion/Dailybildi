from fastapi import APIRouter, Depends, HTTPException, status, Query, Header
from sqlalchemy.orm import Session
from app.db import get_db
from app.schemas import CommunityWorldResponse, PaginatedResponse
from app.services.world_service import WorldService
from app.services.universe_service import UniverseService
from app.services.block_loader import BlockLoader
from app.services.like_service import LikeService
from app.utils.jwt import verify_token

router = APIRouter(prefix="/api/community", tags=["community"])


def get_optional_user_id(authorization: str = Header(None)) -> str:
    """Extract user ID from JWT token in Authorization header (optional)"""
    if not authorization:
        return None
    
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    
    token = parts[1]
    payload = verify_token(token)
    if not payload:
        return None
    return payload.get("sub")


def _enrich_world_for_community(world):
    """Enrich a world with block metadata and universe config"""
    try:
        # Enrich placed blocks with metadata
        block_metadata_map = {}
        universes = UniverseService.list_universes()
        
        for universe in universes:
            blocks = BlockLoader.load_blocks(universe['id'])
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
        universe_config = UniverseService.get_universe_config(world.universe_id)
        world.universeConfig = {
            "backgroundColor": universe_config.get("backgroundColor", "#ffffff"),
            "blockSize": universe_config.get("blockSize", 64),
            "worldImageScale": universe_config.get("worldImageScale", 1.0)
        }
    except Exception as e:
        print(f"Error loading universe config: {str(e)}")
    
    return world


@router.get("/worlds", response_model=PaginatedResponse)
def get_community_worlds(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    sort_by: str = Query("recent", regex="^(recent|likes)$"),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_optional_user_id)
):
    """Get paginated community worlds"""
    try:
        worlds, total = WorldService.get_community_worlds(db, skip, limit, sort_by, user_id)
        
        # Enrich each world with metadata and universe config
        enriched_worlds = [_enrich_world_for_community(world) for world in worlds]
        
        return {
            "items": enriched_worlds,
            "total": total,
            "skip": skip,
            "limit": limit,
            "has_more": (skip + limit) < total
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
