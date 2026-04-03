from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from app.db import get_db
from app.services.universe_service import UniverseService
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


@router.get("/")
def list_universes(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    """Get list of all available universes with user's available and placed block counts"""
    try:
        universes = UniverseService.list_universes()
        
        # Get user's inventory total (available blocks)
        inventory = db.query(UserInventory).filter(
            UserInventory.user_id == user_id
        ).first()
        
        total_available_blocks = 0
        if inventory and inventory.blocks:
            total_available_blocks = sum(block.quantity for block in inventory.blocks)
        
        # For each universe, include both available and placed block counts
        for universe in universes:
            # Get placed blocks count for this universe
            world = db.query(World).filter(
                World.user_id == user_id,
                World.universe_id == universe["id"]
            ).first()
            
            placed_block_count = 0
            if world:
                placed_block_count = len(world.placed_blocks) if world.placed_blocks else 0
            
            # Include both counts
            universe["available_blocks"] = total_available_blocks
            universe["placed_blocks"] = placed_block_count
        
        return {
            "universes": universes,
            "count": len(universes),
            "total_available_blocks": total_available_blocks
        }
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


@router.post("/{universe_id}/seed")
def seed_universe(
    universe_id: str,
    db: Session = Depends(get_db)
):
    """
    DEPRECATED: Blocks are now loaded from config.json files in public/univers/{universe_id}/
    This endpoint is kept for backwards compatibility but does nothing.
    """
    return {
        "universe_id": universe_id,
        "message": "Blocks are loaded from filesystem config.json files. No database seeding needed.",
        "blocks_seeded": 0
    }
