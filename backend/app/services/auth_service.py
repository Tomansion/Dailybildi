from datetime import datetime
from sqlalchemy.orm import Session
from app.models import User, UserInventory
from app.utils.security import hash_password, verify_password
from app.utils.jwt import create_access_token


class AuthService:
    """Authentication service for user registration and login"""

    @staticmethod
    def register_user(db: Session, username: str, password: str) -> dict:
        """Register a new user and create their inventory and initial world"""
        # Check if user already exists
        existing_user = db.query(User).filter(User.username == username).first()
        if existing_user:
            raise ValueError("Username already exists")

        # Create new user
        hashed_password = hash_password(password)
        new_user = User(
            username=username,
            password_hash=hashed_password,
            received_initial_blocks=False
        )
        db.add(new_user)
        db.flush()

        # Create inventory for user
        from app.services.inventory_service import InventoryService
        InventoryService.initialize_inventory(db, new_user.id)

        # Create initial world for user
        from app.services.world_service import WorldService
        from app.config import get_settings
        settings = get_settings()
        WorldService.create_world(db, new_user.id, settings.UNIVERSE_ID)

        # Give initial blocks
        from app.services.inventory_service import InventoryService
        InventoryService.give_initial_blocks(db, new_user.id)

        db.commit()
        db.refresh(new_user)

        return {"user_id": new_user.id, "username": new_user.username}

    @staticmethod
    def login_user(db: Session, username: str, password: str) -> dict:
        """Authenticate user and return JWT token"""
        user = db.query(User).filter(User.username == username).first()
        if not user:
            raise ValueError("Invalid username or password")

        if not verify_password(password, user.password_hash):
            raise ValueError("Invalid username or password")

        # Update first login timestamp if not set
        if user.first_login_at is None:
            user.first_login_at = datetime.utcnow()
            db.commit()

        # Create JWT token
        token = create_access_token({"sub": user.id, "username": user.username})

        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "username": user.username,
                "created_at": user.created_at,
                "first_login_at": user.first_login_at,
                "received_initial_blocks": user.received_initial_blocks
            }
        }

    @staticmethod
    def get_user_by_id(db: Session, user_id: str) -> User:
        """Get user by ID"""
        return db.query(User).filter(User.id == user_id).first()
