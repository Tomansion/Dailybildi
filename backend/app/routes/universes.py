from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from app.db import get_db
from app.services.universe_service import UniverseService
from app.utils.jwt import verify_token

router = APIRouter(prefix="/api/universes", tags=["universes"])


@router.get("/")
def list_universes():
    """Get list of all available universes"""
    try:
        universes = UniverseService.list_universes()
        return {
            "universes": universes,
            "count": len(universes)
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
    """Seed blocks for a universe (admin endpoint)"""
    try:
        count = UniverseService.seed_universe_blocks(db, universe_id)
        return {
            "universe_id": universe_id,
            "blocks_seeded": count
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
