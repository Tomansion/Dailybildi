from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import logging
from pathlib import Path

from app.config import get_settings
from app.db import init_db
from app.scheduler import start_scheduler, stop_scheduler
from app.routes import auth, blocks, inventory, worlds, community, likes, universes

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle management"""
    # Startup
    logger.info("Starting up application...")
    init_db()
    start_scheduler()
    yield
    # Shutdown
    logger.info("Shutting down application...")
    stop_scheduler()


# Create FastAPI app
app = FastAPI(
    title=settings.API_TITLE,
    version=settings.API_VERSION,
    lifespan=lifespan
)

# Setup CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(blocks.router)
app.include_router(inventory.router)
app.include_router(worlds.router)
app.include_router(community.router)
app.include_router(likes.router)
app.include_router(universes.router)

# Mount static files (serve public folder at /univers, /world, etc.)
public_path = Path(__file__).parent.parent.parent / "public"
if public_path.exists():
    app.mount("/univers", StaticFiles(directory=str(public_path / "univers")), name="univers")
    
    # Also mount default universe tiles directly at /tiles for convenience
    # This allows direct access like /tiles/tile_0_0_1.png for the default ink_castle universe
    default_tiles_path = public_path / "univers" / "ink_castle" / "tiles"
    if default_tiles_path.exists():
        app.mount("/tiles", StaticFiles(directory=str(default_tiles_path)), name="tiles")


@app.get("/")
def root():
    """Root endpoint"""
    return {
        "message": "Dailybildi API",
        "version": settings.API_VERSION,
        "docs": "/docs"
    }


@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
