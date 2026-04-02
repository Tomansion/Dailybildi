from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from app.db import get_db
from app.services.like_service import LikeService
from app.utils.jwt import verify_token

router = APIRouter(prefix="/api/likes", tags=["likes"])


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


@router.post("/{world_id}")
def like_world(
    world_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """Like a world"""
    try:
        like = LikeService.like_world(db, user_id, world_id)
        return {"message": "World liked successfully", "like_id": like.id}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.delete("/{world_id}")
def unlike_world(
    world_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """Unlike a world"""
    try:
        success = LikeService.unlike_world(db, user_id, world_id)
        if not success:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Like not found")
        return {"message": "World unliked successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("")
def get_user_liked_worlds(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """Get list of worlds liked by user"""
    try:
        liked_world_ids = LikeService.get_user_liked_worlds(db, user_id)
        return {"liked_world_ids": liked_world_ids}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
