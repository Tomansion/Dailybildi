from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.db import get_db
from app.models import BlockCatalog
from app.schemas import BlockCatalogResponse
from app.services.block_service import BlockService
from app.services.universe_service import UniverseService
from app.config import get_settings

settings = get_settings()
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
def get_daily_blocks(universe_id: str = Query(default=None), db: Session = Depends(get_db)):
    """Get today's daily blocks"""
    if universe_id is None:
        universe_id = settings.UNIVERSE_ID
    
    try:
        # Load universe config
        universe_config = UniverseService.get_universe_config(universe_id)
        
        # Get today's daily block IDs
        daily_block_ids = BlockService.get_daily_block_ids(universe_config)
        
        # Convert block IDs to database records and return
        # Block IDs are stored as strings in the database (0, 1, 2, etc.)
        daily_blocks = []
        for block_id in daily_block_ids:
            block = db.query(BlockCatalog).filter(
                BlockCatalog.block_id == str(block_id),
                BlockCatalog.universe_id == universe_id
            ).first()
            if block:
                daily_blocks.append(block)
        
        return daily_blocks
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
