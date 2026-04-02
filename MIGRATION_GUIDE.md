# Dailybildi Migration Guide - Vue.js + Python

This document outlines the migration from Next.js+React to Vue.js+Python with SQLite database.

## Project Structure

```
/backend/              # Python FastAPI backend
├── app/
│   ├── models.py      # SQLAlchemy models
│   ├── schemas.py     # Pydantic request/response schemas
│   ├── config.py      # Application configuration
│   ├── db.py          # Database setup
│   ├── scheduler.py   # APScheduler for daily blocks
│   ├── main.py        # FastAPI application entry point
│   ├── services/      # Business logic services
│   │   ├── auth_service.py
│   │   ├── block_service.py
│   │   ├── inventory_service.py
│   │   ├── world_service.py
│   │   └── like_service.py
│   ├── routes/        # API route handlers
│   │   ├── auth.py
│   │   ├── blocks.py
│   │   ├── inventory.py
│   │   ├── worlds.py
│   │   ├── community.py
│   │   └── likes.py
│   └── utils/         # Utility functions
│       ├── jwt.py
│       └── security.py
├── pyproject.toml     # Python dependencies
├── .env               # Environment variables
└── .env.example       # Example env file

/frontend/             # Vue.js frontend
├── src/
│   ├── components/    # Reusable Vue components
│   ├── views/         # Page components
│   │   ├── Home.vue
│   │   ├── Login.vue
│   │   ├── Register.vue
│   │   ├── Canvas.vue
│   │   ├── Community.vue
│   │   └── WorldView.vue
│   ├── stores/        # Pinia state management
│   │   ├── auth.js
│   │   └── inventory.js
│   ├── services/      # API service layer
│   │   └── api.js
│   ├── utils/         # Utility functions
│   │   └── PhaserGame.js
│   ├── router.js      # Vue Router configuration
│   ├── App.vue        # Root component
│   ├── main.js        # Entry point
│   └── style.css      # Global styles
├── index.html         # HTML template
├── package.json       # Node.js dependencies
├── vite.config.js     # Vite configuration
├── tailwind.config.js # Tailwind CSS configuration
├── postcss.config.js  # PostCSS configuration
└── .gitignore
```

## Setup Instructions

### 1. Backend Setup (Python)

#### Prerequisites
- Python 3.9+
- pip or poetry

#### Installation

```bash
# Navigate to backend directory
cd backend

# Create a Python virtual environment (optional but recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -e .

# Or using pip with requirements
pip install fastapi uvicorn sqlalchemy pydantic python-dotenv pyjwt bcrypt apscheduler
```

#### Configuration

Create or update `.env` file in the `backend/` directory:

```env
DATABASE_URL=sqlite:///./dailybildi.db
JWT_SECRET=your-secret-key-change-this-in-production
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=720
DEBUG=True
API_TITLE=Dailybildi API
API_VERSION=0.1.0
FRONTEND_URL=http://localhost:3000
TIMEZONE=UTC
```

#### Running the Backend

```bash
# Start the development server
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Or with uvicorn directly
uvicorn app.main:app --reload
```

The API will be available at: `http://localhost:8000`
API Docs: `http://localhost:8000/docs`

### 2. Frontend Setup (Vue.js)

#### Prerequisites
- Node.js 16+ and npm/yarn

#### Installation

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install
# or
yarn install
```

#### Running the Frontend (Development)

```bash
# Start the development server
npm run dev
# or
yarn dev
```

The frontend will be available at: `http://localhost:3000`

The Vite dev server is configured to proxy API calls to the Python backend at `http://localhost:8000`.

### 3. Running Both Together

#### Option 1: Separate Terminals

Terminal 1 (Backend):
```bash
cd backend
python -m uvicorn app.main:app --reload
```

Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```

Then open your browser to `http://localhost:3000`

#### Option 2: Using Docker (if you create docker-compose.yml)

```bash
docker-compose up
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user and get JWT token

### Blocks
- `GET /api/blocks/catalog` - Get all blocks in the catalog
- `GET /api/blocks/daily` - Get today's daily blocks

### Inventory
- `GET /api/inventory` - Get current user's inventory
- `POST /api/inventory/add-block` - Add a block to inventory (admin/testing)

### Worlds
- `GET /api/world` - Get current user's world
- `POST /api/world` - Place a block on the world
- `GET /api/world/{worldId}` - Get a specific world (read-only)
- `PATCH /api/world/blocks/{blockId}` - Update a placed block
- `DELETE /api/world/blocks/{blockId}` - Remove a placed block

### Community
- `GET /api/community/worlds?skip=0&limit=20&sort_by=recent` - Get paginated worlds

### Likes
- `POST /api/likes/{worldId}` - Like a world
- `DELETE /api/likes/{worldId}` - Unlike a world
- `GET /api/likes` - Get user's liked world IDs

## Authentication

The application uses JWT (JSON Web Tokens) for authentication:

1. User registers or logs in via `/api/auth/register` or `/api/auth/login`
2. Server returns an access token in the response
3. Frontend stores the token in localStorage
4. All protected API requests include the token in the `Authorization` header: `Bearer {token}`
5. Token is automatically included by the axios interceptor in `src/services/api.js`

## Database

The application uses **SQLite** with SQLAlchemy ORM.

### Database Initialization

The database tables are automatically created when the backend starts (via `init_db()` in the lifespan context).

### Seeding Block Catalog

To add blocks to the catalog, you can use the `BlockService.seed_block_catalog()` method or create a migration script.

Example:
```python
from app.db import SessionLocal
from app.services.block_service import BlockService

db = SessionLocal()
blocks = [
    {"block_id": "grass", "layer": 0, "rarity": 0, "universe_id": "ink_castle", "image_path": "/univers/ink_castle/tiles/tile_grass_0_0.png"},
    # ... more blocks
]
BlockService.seed_block_catalog(db, blocks)
```

## Daily Block Distribution

The application uses APScheduler to distribute daily blocks at 00:00 UTC to all users.

The scheduler is started automatically when the backend starts (in the lifespan context).

To test the scheduler:
```python
from app.scheduler import distribute_daily_blocks
distribute_daily_blocks()  # Manually trigger
```

## Building for Production

### Backend

```bash
cd backend
# Prepare your environment
export DATABASE_URL=sqlite:///./dailybildi.db
export JWT_SECRET=your-production-secret-key

# Run with gunicorn (or similar)
pip install gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
```

### Frontend

```bash
cd frontend
npm run build
# Output goes to dist/ directory
npm run preview  # Test the production build locally
```

Then serve the `dist/` folder with a web server (nginx, Apache, etc.).

## Development Tips

### Hot Reload
- **Backend**: Uvicorn with `--reload` automatically reloads on file changes
- **Frontend**: Vite hot module replacement (HMR) provides instant updates

### Debugging
- **Backend**: Add breakpoints or use Python's `pdb` debugger
- **Frontend**: Use Vue DevTools browser extension, or browser DevTools

### API Testing
- Use the interactive Swagger UI at `http://localhost:8000/docs`
- Or use Postman/Insomnia for API testing

## Migration Checklist

- [x] Set up Python FastAPI backend project
- [x] Migrate Prisma schema to SQLAlchemy models
- [x] Port authentication system to Python
- [x] Port all service layers (Block, Inventory, World, Like)
- [x] Implement all API routes
- [x] Set up APScheduler for daily blocks
- [x] Create Vue.js frontend with Vite
- [x] Migrate all pages and components to Vue
- [x] Set up Pinia for state management
- [x] Configure API service with JWT intercept
- [x] Set up Phaser game integration in Vue
- [x] Configure proxy in Vite for API calls
- [ ] Seed initial block catalog data
- [ ] Test all functionality end-to-end
- [ ] Deploy to production

## Common Issues

### CORS Errors
The backend is configured to accept CORS requests from `localhost:3000`. If you're running on a different port, update the `FRONTEND_URL` in the backend `.env` file.

### Token Expired
JWT tokens expire after the duration set in `JWT_EXPIRATION_HOURS` (default: 720 hours = 30 days). Users will be redirected to login if their token expires.

### Database Errors
Make sure the `DATABASE_URL` is set correctly and the directory for SQLite has write permissions.

**For Linux/Mac** (relative path):
```env
DATABASE_URL=sqlite:///./dailybildi.db
```

**For Windows** (absolute path):
```env
DATABASE_URL=sqlite:///C:/path/to/dailybildi.db
```

## Next Steps

1. Seed the block catalog with initial data
2. Test the application thoroughly
3. Add additional features (real-time updates, WebSockets, etc.)
4. Optimize performance and add caching
5. Deploy to a production server

---

For questions or issues, refer to the original Next.js implementation or the framework documentation:
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Vue.js 3 Documentation](https://vuejs.org/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [Phaser Documentation](https://phaser.io/documentation)
