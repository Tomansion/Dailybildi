from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db import get_db
from app.schemas import BlockCatalogResponse
from app.services.block_service import BlockService

router = APIRouter(prefix="/api/blocks", tags=["blocks"])


@router.get("/catalog", response_model=list[BlockCatalogResponse])
def get_block_catalog(db: Session = Depends(get_db)):
    """Get all blocks from the catalog"""
    try:
        blocks = BlockService.get_catalog(db)
        return blocks
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/daily", response_model=list[BlockCatalogResponse])
def get_daily_blocks(db: Session = Depends(get_db)):
    """Get today's daily blocks"""
    try:
        blocks = BlockService.get_daily_blocks(db)
        return blocks
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
