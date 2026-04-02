from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from app.db import get_db
from app.schemas import UserInventoryResponse
from app.services.inventory_service import InventoryService
from app.utils.jwt import verify_token

router = APIRouter(prefix="/api/inventory", tags=["inventory"])


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


@router.get("", response_model=UserInventoryResponse)
def get_inventory(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    """Get user's inventory"""
    try:
        inventory = InventoryService.get_user_inventory(db, user_id)
        if not inventory:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory not found")
        return inventory
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/add-block")
def add_block_to_inventory(
    block_id: str,
    quantity: int = 1,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """Add a block to user's inventory (admin/testing)"""
    try:
        block = InventoryService.add_block_to_inventory(db, user_id, block_id, quantity)
        return {"message": "Block added successfully", "block_id": block.id}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
