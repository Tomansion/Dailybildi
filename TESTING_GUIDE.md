# Universe System - Testing Guide

## Quick Start

The universe system is now fully implemented with backend endpoints and frontend UI. Here's how to test it:

### 1. Start the Servers

**Backend:**
```bash
cd /home/tomansion/Documents/autre/jeux/Dailybildi/backend
python -m uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd /home/tomansion/Documents/autre/jeux/Dailybildi/frontend
npm run dev
```

Both servers should be running (backend on :8000, frontend on :3000 or :5173)

### 2. Test Universes API

#### List all universes
```bash
curl http://localhost:8000/api/universes/
```

Response includes all available universes with their metadata and block count.

#### Get blocks for ink_castle
```bash
curl http://localhost:8000/api/universes/ink_castle/blocks
```

Response includes all 21 blocks with their paths and properties.

#### Seed universe blocks (if needed)
```bash
curl -X POST http://localhost:8000/api/universes/ink_castle/seed
```

### 3. Test User Flow

1. **Navigate to frontend:** http://localhost:3000/ or http://localhost:5173/

2. **Register new user:**
   - Click "Register"
   - Choose username and password
   - Submit
   - Redirected to `/universes` page

3. **Browse Universes:**
   - See "Ink Castle" universe with 21 blocks
   - Shows universe preview and block count

4. **Enter Universe:**
   - Click "Enter" button
   - Backend creates:
     - New world for this universe
     - User inventory (if doesn't exist)
     - Distributes 30 random blocks
   - Redirected to Canvas with ?world_id=<id>

5. **Canvas:**
   - Inventory panel shows received blocks
   - Can place blocks on infinite canvas
   - Can return to /universes to select different universe

### 4. Database State

After entering first universe, check database with:

```bash
sqlite3 dailybildi.db

# List universes seeded
SELECT DISTINCT universe_id FROM block_catalog;

# Count blocks in ink_castle
SELECT COUNT(*) FROM block_catalog WHERE universe_id='ink_castle';

# Check user's worlds
SELECT id, universe_id FROM world;

# Check user's inventory
SELECT * FROM inventory_block LIMIT 10;
```

### 5. Test Multiple Universes (Optional)

To add more universes:

1. Create dir: `public/univers/new_universe/`
2. Add `config.json` file
3. Add `tiles/` folder with PNG files: `tile_<id>_<layer>_<rarity>.png`
4. Run `python seed_universes.py`
5. New universe appears in API and frontend

## Current Implementation Status

✅ **Completed:**
- Backend universe discovery from filesystem
- Block auto-discovery from tile files
- Database seeding via UniverseService
- API endpoints for listing universes and blocks
- User initialization in universes (world + inventory creation)
- Initial block distribution (30 blocks, weighted random)
- Frontend universe selection page
- Auth flow redirects to universes
- Canvas page accepts world_id parameter
- Asset files copied to frontend/public/univers/

✅ **Tested:**
- GET /api/universes/ - returns 1 universe
- GET /api/universes/ink_castle/blocks - returns 21 blocks
- Universe API responses with correct structure
- 21 blocks seeded in database from tile files

🚀 **Ready for:**
- User registration and login
- Entering first universe
- Receiving initial 30 blocks
- Placing blocks on canvas

## Common Issues & Solutions

**Issue:** "No universes found"
- Solution: Check that `public/univers/ink_castle/` exists
- Run: `python seed_universes.py`

**Issue:** Blocks show default image
- Solution: Verify image paths: `univers/ink_castle/tiles/tile_*.png`
- Check frontend can access `/univers/` from public folder

**Issue:** User not getting initial blocks
- Solution: Check `block_catalog` table has ink_castle blocks
- Verify `get_daily_blocks()` returns blocks
- Check `inventory_block` inserts succeed

**Issue:** Backend won't start with universes.py import error
- Solution: Ensure app/routes/universes.py has proper imports
- Check for circular imports

## Next Steps

1. **Add more universes** - Create additional universe directories
2. **Customize universes** - Add universe-specific rules/themes
3. **Improve UI** - Add universe icons/banners
4. **Track progress** - Show completion % per universe
5. **Leaderboards** - Show top players per universe

## File Structure Summary

```
Backend Routes:
- app/routes/universes.py ............. New universe endpoints
- app/services/universe_service.py .... Universe discovery & initialization
- app/services/block_service.py ....... Updated with select_random_block()

Frontend Views:
- src/views/Universes.vue ............ New universe selection page
- src/router.js ....................... Updated with /universes route
- src/views/Canvas.vue ............... Updated to accept world_id param
- src/views/Login.vue ................ Updated redirect to /universes
- src/views/Register.vue ............ Updated redirect to /universes
- src/App.vue ........................ Updated navbar with Universes link

Assets:
- public/univers/ .................... Copied from root to frontend/public
- Includes ink_castle universe with 21 blocks

Documentation:
- UNIVERSE_SYSTEM.md ................. Complete system documentation
- TESTING_GUIDE.md ................... This file
```
