from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.db import get_db
from app.schemas import BlockCatalogResponse
from app.services.block_loader import BlockLoader
from app.services.universe_service import UniverseService
from app.daily_selection import DailySelectionManager
from app.config import get_settings

settings = get_settings()
router = APIRouter(prefix="/api/blocks", tags=["blocks"])


@router.get("/catalog", response_model=list[BlockCatalogResponse])
def get_block_catalog(universe_id: str = Query(default=None), db: Session = Depends(get_db)):
    """Get all blocks from the catalog"""
    if universe_id is None:
        universe_id = settings.UNIVERSE_ID
    
    try:
        blocks = BlockLoader.load_blocks(universe_id)
        return [block.to_dict() for block in blocks]
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/daily", response_model=list[BlockCatalogResponse])
def get_daily_blocks(universe_id: str = Query(default=None), db: Session = Depends(get_db)):
    """Get today's daily blocks"""
    if universe_id is None:
        universe_id = settings.UNIVERSE_ID
    
    try:
        # Load all available blocks for this universe
        all_blocks = BlockLoader.load_blocks(universe_id)
        if not all_blocks:
            raise ValueError(f"No blocks found for universe '{universe_id}'")
        
        # Get today's daily block IDs
        available_blocks_config = [{"id": b.id, "rarity": b.rarity} for b in all_blocks]
        daily_block_ids = DailySelectionManager.get_or_create_daily_blocks(
            universe_id,
            available_blocks_config
        )
        
        # Filter to only daily blocks
        daily_blocks = [
            block for block in all_blocks 
            if block.id in daily_block_ids
        ]
        
        return [block.to_dict() for block in daily_blocks]
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
