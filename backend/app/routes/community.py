from fastapi import APIRouter, Depends, HTTPException, status, Query, Header
from sqlalchemy.orm import Session
from app.db import get_db
from app.schemas import CommunityWorldResponse, PaginatedResponse
from app.services.world_service import WorldService
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
        
        return {
            "items": worlds,
            "total": total,
            "skip": skip,
            "limit": limit,
            "has_more": (skip + limit) < total
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
