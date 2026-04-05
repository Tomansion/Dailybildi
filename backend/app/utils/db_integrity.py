"""Database integrity utilities for handling orphaned records"""
from sqlalchemy.orm import Session
from app.models import World, User, UserInventory, Like


class DatabaseIntegrity:
    """Utility class for checking and fixing database integrity issues"""

    @staticmethod
    def cleanup_orphaned_records(db: Session, dry_run: bool = False) -> dict:
        """
        Clean up orphaned records (worlds, inventories, likes without valid users)
        
        Args:
            db: Database session
            dry_run: If True, only report what would be deleted, don't delete
            
        Returns:
            Dictionary with cleanup statistics
        """
        stats = {
            "orphaned_worlds": 0,
            "orphaned_inventories": 0,
            "orphaned_likes": 0
        }

        # Find orphaned worlds
        orphaned_worlds = db.query(World).filter(
            ~World.user_id.in_(db.query(User.id))
        ).all()
        stats["orphaned_worlds"] = len(orphaned_worlds)
        
        if not dry_run and orphaned_worlds:
            for world in orphaned_worlds:
                db.delete(world)

        # Find orphaned inventories
        orphaned_inventories = db.query(UserInventory).filter(
            ~UserInventory.user_id.in_(db.query(User.id))
        ).all()
        stats["orphaned_inventories"] = len(orphaned_inventories)
        
        if not dry_run and orphaned_inventories:
            for inventory in orphaned_inventories:
                db.delete(inventory)

        # Find orphaned likes
        orphaned_likes = db.query(Like).filter(
            ~Like.user_id.in_(db.query(User.id))
        ).all()
        stats["orphaned_likes"] = len(orphaned_likes)
        
        if not dry_run and orphaned_likes:
            for like in orphaned_likes:
                db.delete(like)

        if not dry_run and (orphaned_worlds or orphaned_inventories or orphaned_likes):
            db.commit()

        return stats

    @staticmethod
    def check_integrity(db: Session) -> dict:
        """
        Check database integrity without making changes
        
        Returns:
            Dictionary with integrity check results
        """
        return DatabaseIntegrity.cleanup_orphaned_records(db, dry_run=True)
