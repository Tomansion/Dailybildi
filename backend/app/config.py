import os
from functools import lru_cache
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()


class Settings:
    # Database - use absolute path to project root
    _PROJECT_ROOT = Path(__file__).parent.parent.parent
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{_PROJECT_ROOT}/dailybildi.db")
    
    # JWT Configuration
    JWT_SECRET: str = os.getenv("JWT_SECRET", "your-secret-key-change-this-in-production")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_EXPIRATION_HOURS: int = int(os.getenv("JWT_EXPIRATION_HOURS", "720"))
    
    # Server
    DEBUG: bool = os.getenv("DEBUG", "True").lower() == "true"
    API_TITLE: str = os.getenv("API_TITLE", "Dailybildi API")
    API_VERSION: str = os.getenv("API_VERSION", "0.1.0")
    
    # Frontend
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    
    # Timezone
    TIMEZONE: str = os.getenv("TIMEZONE", "UTC")
    
    # Game Constants
    INITIAL_BLOCKS_COUNT: int = 30
    DAILY_BLOCKS_COUNT: int = 10
    UNIVERSE_ID: str = "ink_castle"
    RARITY_WEIGHTS: dict = {
        0: 10,  # common
        1: 9,
        2: 8,
        3: 7,
        4: 6,
        5: 5,
        6: 4,
        7: 3,
        8: 2,   # rare
    }


@lru_cache()
def get_settings() -> Settings:
    return Settings()
