from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.db import get_db
from app.schemas import CommunityWorldResponse, PaginatedResponse
from app.services.world_service import WorldService

router = APIRouter(prefix="/api/community", tags=["community"])


@router.get("/worlds", response_model=PaginatedResponse)
def get_community_worlds(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    sort_by: str = Query("recent", regex="^(recent|likes)$"),
    db: Session = Depends(get_db)
):
    """Get paginated community worlds"""
    try:
        worlds, total = WorldService.get_community_worlds(db, skip, limit, sort_by)
        
        return {
            "items": worlds,
            "total": total,
            "skip": skip,
            "limit": limit,
            "has_more": (skip + limit) < total
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
