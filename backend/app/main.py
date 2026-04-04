from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
import logging
from pathlib import Path

from app.config import get_settings
from app.db import init_db
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
    try:
        logger.info("Initializing database...")
        init_db()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Database initialization error: {e}")
    
    logger.info("Application startup complete")
    yield
    # Shutdown
    logger.info("Shutting down application...")


# Create FastAPI app
app = FastAPI(
    title=settings.API_TITLE,
    version=settings.API_VERSION,
    lifespan=lifespan
)

# Setup CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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

# Mount frontend public assets (fonts, icons, logo, etc.) - MUST come before catch-all route
frontend_public_path = Path(__file__).parent.parent.parent / "frontend" / "public"
if frontend_public_path.exists():
    # Mount fonts at the root
    fonts_path = frontend_public_path / "fonts"
    if fonts_path.exists():
        app.mount("/fonts", StaticFiles(directory=str(fonts_path)), name="fonts")
    
    # Mount icons at the root
    icons_path = frontend_public_path / "icons"
    if icons_path.exists():
        app.mount("/icons", StaticFiles(directory=str(icons_path)), name="icons")
    
    # Serve individual root-level assets (logo.png, etc.)
    logo_path = frontend_public_path / "logo.png"
    if logo_path.exists():
        @app.get("/logo.png")
        async def serve_logo():
            return FileResponse(logo_path)

# Mount frontend static files from dist directory
frontend_dist_path = Path(__file__).parent.parent.parent / "backend" / "public" / "static" / "frontend"
if frontend_dist_path.exists():
    # This serves all assets (CSS, JS, images, etc.) from the frontend dist folder
    app.mount("/assets", StaticFiles(directory=str(frontend_dist_path / "assets")), name="assets")
    # Also mount favicon if it exists
    if (frontend_dist_path / "favicon.ico").exists():
        @app.get("/favicon.ico")
        async def favicon():
            return FileResponse(frontend_dist_path / "favicon.ico")



@app.get("/")
async def root():
    """Root endpoint - serve frontend SPA"""
    frontend_index = Path(__file__).parent.parent.parent / "backend" / "public" / "static" / "frontend" / "index.html"
    if frontend_index.exists():
        return FileResponse(frontend_index)
    # Fallback API info if frontend not built
    return {
        "message": "Dailybildi API",
        "version": settings.API_VERSION,
        "docs": "/docs"
    }


@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "ok"}


@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    """Serve SPA frontend for all unmatched routes except /api and static files"""
    # Don't serve frontend for API routes
    if full_path.startswith("api"):
        raise HTTPException(status_code=404, detail=f"API endpoint /{full_path} not found")
    
    # Don't serve frontend for known static paths (these should be handled by mounts)
    static_paths = ["icons", "fonts", "logo.png", "assets", "univers", "tiles", "favicon.ico"]
    if any(full_path.startswith(path) for path in static_paths):
        raise HTTPException(status_code=404, detail=f"File not found: /{full_path}")
    
    frontend_index = Path(__file__).parent.parent.parent / "backend" / "public" / "static" / "frontend" / "index.html"
    if frontend_index.exists():
        return FileResponse(frontend_index)
    # Fallback if frontend not built
    return {"message": "Frontend not found. Please build the frontend first."}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
