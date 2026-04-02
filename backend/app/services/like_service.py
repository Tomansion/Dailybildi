from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models import Like, World
from datetime import datetime


class LikeService:
    """Service for managing world likes"""

    @staticmethod
    def like_world(db: Session, user_id: str, world_id: str) -> Like:
        """Like a world"""
        # Check if world exists
        world = db.query(World).filter(World.id == world_id).first()
        if not world:
            raise ValueError("World not found")

        # Check if already liked
        existing_like = db.query(Like).filter(
            Like.user_id == user_id,
            Like.world_id == world_id
        ).first()

        if existing_like:
            return existing_like

        # Create new like
        like = Like(user_id=user_id, world_id=world_id)
        db.add(like)

        # Increment like count
        world.like_count += 1

        db.commit()
        db.refresh(like)
        return like

    @staticmethod
    def unlike_world(db: Session, user_id: str, world_id: str) -> bool:
        """Unlike a world"""
        like = db.query(Like).filter(
            Like.user_id == user_id,
            Like.world_id == world_id
        ).first()

        if not like:
            return False

        world = db.query(World).filter(World.id == world_id).first()
        if world:
            world.like_count = max(0, world.like_count - 1)

        db.delete(like)
        db.commit()
        return True

    @staticmethod
    def is_world_liked(db: Session, user_id: str, world_id: str) -> bool:
        """Check if user has liked a world"""
        like = db.query(Like).filter(
            Like.user_id == user_id,
            Like.world_id == world_id
        ).first()
        return like is not None

    @staticmethod
    def get_user_liked_worlds(db: Session, user_id: str) -> list:
        """Get list of world IDs that user has liked"""
        likes = db.query(Like).filter(Like.user_id == user_id).all()
        return [like.world_id for like in likes]

    @staticmethod
    def get_world_liked_by_count(db: Session, world_id: str) -> int:
        """Get number of likes for a world"""
        count = db.query(Like).filter(Like.world_id == world_id).count()
        return count
