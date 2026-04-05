"""Administrative utilities routes for database maintenance"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db import get_db
from app.utils.db_integrity import DatabaseIntegrity

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.post("/db/cleanup")
def cleanup_database(db: Session = Depends(get_db)):
    """
    Clean up orphaned database records (worlds, inventories, likes without valid users)
    WARNING: This is a destructive operation and should only be run by administrators
    """
    try:
        stats = DatabaseIntegrity.cleanup_orphaned_records(db, dry_run=False)
        return {
            "status": "success",
            "message": "Database cleanup completed",
            "removed": stats
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database cleanup failed: {str(e)}"
        )


@router.get("/db/integrity")
def check_database_integrity(db: Session = Depends(get_db)):
    """
    Check database integrity without making changes
    Returns information about orphaned records that would be cleaned up
    """
    try:
        stats = DatabaseIntegrity.check_integrity(db)
        return {
            "status": "success",
            "orphaned_records": stats
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Integrity check failed: {str(e)}"
        )
