# Universe System Implementation

## Overview
The universe system allows users to explore multiple universes, each with its own set of blocks and canvas. After login, users can see all available universes and enter them. When entering a universe for the first time, a new world is created with the user receiving 30 initial blocks.

## Features

### 1. Universe Discovery
- **Endpoint**: `GET /api/universes/`
- Lists all available universes with their metadata
- Returns universe name, block count, and configuration
- Universes are auto-discovered from the `public/univers/` directory structure

### 2. Universe Blocks
- **Endpoint**: `GET /api/universes/{universe_id}/blocks`
- Lists all blocks available in a universe
- Blocks are auto-discovered from tile files: `tile_<block_id>_<layer>_<rarity>.png`
- Each block includes ID, layer, rarity, and image path

### 3. Enter Universe
- **Endpoint**: `POST /api/universes/{universe_id}/enter/auth`
- Requires authentication (Bearer token in Authorization header)
- Initializes user in a universe:
  - Creates a new world if user doesn't have one in that universe
  - Creates inventory if user doesn't have one
  - Distributes 30 initial blocks (weighted randomization based on rarity)
- Returns `world_id` for use in canvas

## Backend Architecture

### UniverseService (`app/services/universe_service.py`)
```python
UniverseService.list_universes()              # Discover all universes
UniverseService.get_universe_blocks()         # Get blocks for a universe
UniverseService.seed_universe_blocks()        # Seed blocks to database
UniverseService.initialize_user_in_universe() # Initialize user in universe
```

### Routes (`app/routes/universes.py`)
- `GET /api/universes/` - List all universes
- `GET /api/universes/{universe_id}/blocks` - List blocks
- `POST /api/universes/{universe_id}/enter/auth` - Enter universe (authenticated)
- `POST /api/universes/{universe_id}/seed` - Seed blocks (admin)

### Database Changes
No new tables required. Uses existing:
- `World` - User worlds per universe
- `BlockCatalog` - Seeded with universe blocks
- `UserInventory` - User inventory (one per user)
- `InventoryBlock` - User's blocks in inventory

## Frontend Architecture

### New View: `Universes.vue`
- Displays all available universes
- Shows universe name and block count
- "Enter" button to initialize world in that universe
- Loads universes via `GET /api/universes/`
- Calls `POST /api/universes/{universe_id}/enter/auth` on enter
- Redirects to `/canvas?world_id=<id>` on successful entry

### Updated Routes
- `/universes` - Universe selection (authenticated)
- Login/Register now redirect to `/universes` instead of `/canvas`

### Updated Components
- **App.vue** - Added "Universes" link to navbar
- **Login.vue** - Redirects to `/universes` after login
- **Register.vue** - Redirects to `/universes` after registration
- **Canvas.vue** - Accepts `world_id` query parameter

## Block Naming Convention
Blocks are discovered from tile files in the format:
```
tile_<block_id>_<layer>_<rarity>.png
```

Example:
- `tile_0_0_1.png` → Block ID: 0, Layer: 0, Rarity: 1
- `tile_5_1_4.png` → Block ID: 5, Layer: 1, Rarity: 4

## Asset Structure
```
public/univers/
└── ink_castle/
    ├── config.json              # Universe configuration
    ├── InkCastle.xcf            # Source file (Krita)
    ├── tileset.png              # Full tileset image
    ├── tiles/                   # Individual block tiles
    │   ├── tile_0_0_1.png
    │   ├── tile_1_0_1.png
    │   └── ...
    ├── world/                   # Background layers
    │   ├── clouds.png
    │   ├── ground.png
    │   ├── light.png
    │   ├── world1.png
    │   ├── world2.png
    │   └── world3.png
    └── world.xcf                # World source file
```

The same structure is copied to `frontend/public/univers/` for serving by the frontend.

## Setup Instructions

### 1. Backend Setup
```bash
cd backend

# Seed all universes and blocks
python seed_universes.py

# Start the server
python -m uvicorn app.main:app --reload
```

### 2. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

### 3. Database Initialization
- On first backend startup, SQLite database is created automatically
- `seed_universes.py` populates universe blocks from the filesystem

## Usage Flow

1. **User Registers/Logs In**
   - Navigate to `/login` or `/register`
   - After successful auth, redirected to `/universes`

2. **Browse Universes**
   - View all available universes
   - Each shows block count and name
   - Universes visible to all users (old and new)

3. **Enter Universe**
   - Click "Enter" on a universe
   - Backend initializes world + inventory if needed
   - 30 blocks distributed (weighted random)
   - Redirected to canvas for that universe

4. **Canvas Editing**
   - Can place blocks on the infinite canvas
   - Switch universes by going back to `/universes`

## Future Enhancements

1. **Multiple Universes** - Add more universe directories
2. **Universe-Specific Features** - Custom rules per universe
3. **Block Graphics** - Display actual block preview images
4. **Universe Stats** - Show community stats per universe
5. **Universe Events** - Time-limited events per universe
6. **Progression** - Track progress separately per universe

## Environment Variables

Backend (.env):
```
DATABASE_URL=sqlite:///./dailybildi.db
JWT_SECRET=your-secret-key
FRONTEND_URL=http://localhost:3000
```

Frontend: Uses environment-aware API client (proxied via Vite)

## API Response Examples

### List Universes
```json
{
  "universes": [
    {
      "id": "ink_castle",
      "name": "Ink Castle",
      "block_count": 21,
      "config": {
        "backgroundColor": "#fff6e7",
        "blockSize": 40,
        "worldImages": [...]
      }
    }
  ],
  "count": 1
}
```

### Get Universe Blocks
```json
{
  "universe_id": "ink_castle",
  "blocks": [
    {
      "block_id": "0",
      "layer": 0,
      "rarity": 1,
      "image_path": "univers/ink_castle/tiles/tile_0_0_1.png",
      "filename": "tile_0_0_1.png"
    }
  ],
  "count": 21
}
```

### Enter Universe
```json
{
  "world_id": "550e8400-e29b-41d4-a716-446655440000",
  "universe_id": "ink_castle",
  "is_new": true
}
```
