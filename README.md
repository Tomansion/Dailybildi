# DailyBildi

Build block by block as days go by.

## Dev setup

### Prerequisites

- **Python 3.9+** and pip
- **Node.js 16+** and npm

### Installation

1. **Clone and navigate to the project:**

   ```bash
   cd Dailybildi
   ```

2. **Backend Setup (Python):**

   ```bash
   cd backend

   # Create virtual environment (optional but recommended)
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate

   # Install dependencies
   pip install -e .

   # Configure environment
   cp .env.example .env
   # Edit .env and ensure DATABASE_URL and JWT_SECRET are set

   cd ..
   ```

3. **Frontend Setup (Vue.js):**

   ```bash
   cd frontend

   # Install dependencies
   npm install

   cd ..
   ```

4. **Start the Development Servers:**

   **Option A (Easiest):**

   ```bash
   chmod +x dev-server.sh
   ./dev-server.sh
   ```

   **Option B (Manual):**

   Terminal 1 - Start backend:

   ```bash
   cd backend
   python -m uvicorn app.main:app --reload
   ```

   Terminal 2 - Start frontend:

   ```bash
   cd frontend
   npm run serve
   ```

5. **Open your browser:**
   - Frontend: http://localhost:3000
   - API Documentation: http://localhost:8000/docs

### Database

SQLite database is automatically initialized on first backend start.

To seed the block catalog, create a Python script in `backend/` with:

```python
from app.db import SessionLocal
from app.services.block_service import BlockService

db = SessionLocal()
blocks = [
    {
        "block_id": "block_1",
        "layer": 0,
        "rarity": 0,
        "universe_id": "ink_castle",
        "image_path": "/univers/ink_castle/tiles/tile_1_0_0.png"
    },
    # Add more blocks...
]
BlockService.seed_block_catalog(db, blocks)
print("Block catalog seeded!")
```

### Usage

1. **Register** a new account at the login page
2. **Login** and you'll automatically receive:
   - An inventory with 30 initial blocks
   - A personal world to start building on
3. **Build** on the infinite canvas:
   - Use **middle mouse drag** to pan
   - Use **scroll wheel** to zoom in/out
   - Click blocks in the inventory to select them
   - Click on the canvas to place selected blocks
   - Rotate (±90°), flip, and move blocks as needed
4. **Daily Blocks**: Every day at 00:00 UTC, 10 random blocks are distributed to all users
5. **Explore** other users' worlds in the Community page
6. **Like** worlds you enjoy - top liked worlds appear at the top

### Daily Block System

The application automatically distributes 10 new random blocks to all users every day at 00:00 UTC using APScheduler.

The distribution is deterministic - all users receive the same blocks on the same day, selected using weighted randomization based on block rarity.

The scheduler starts automatically when the backend launches.

## Production Deployment

### Building for Production

1. **Build the Frontend:**

   ```bash
   cd frontend
   npm run build
   # Output: dist/ directory
   cd ..
   ```

2. **Prepare the Backend:**

   The backend is production-ready. Configure environment variables for production:

   ```env
   DATABASE_URL=sqlite:///./dailybildi.db  # Or use PostgreSQL
   JWT_SECRET=your-production-secret-key
   JWT_ALGORITHM=HS256
   JWT_EXPIRATION_HOURS=720
   DEBUG=False
   FRONTEND_URL=https://your-domain.com
   ```

### Self-Hosted Deployment (Linux VPS/Cloud)

1. **Backend Setup on Server:**

   ```bash
   # Install Python and create virtual environment
   python3 -m venv venv
   source venv/bin/activate

   # Install dependencies
   pip install -e .

   # Set environment variables
   export DATABASE_URL="sqlite:///./dailybildi.db"
   export JWT_SECRET="your-production-secret"
   ```

2. **Run Backend with Gunicorn:**

   ```bash
   pip install gunicorn
   gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
   ```

3. **Serve Frontend Statically:**

   ```bash
   # Copy built files to web server directory
   cp -r frontend/dist/* /var/www/dailybildi/
   ```

4. **Setup Nginx Reverse Proxy:**

   ```nginx
   upstream backend {
       server localhost:8000;
   }

   server {
       listen 80;
       server_name your-domain.com;

       root /var/www/dailybildi;
       index index.html;

       # Frontend static files
       location / {
           try_files $uri $uri/ /index.html;
       }

       # Backend API proxy
       location /api {
           proxy_pass http://backend;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

5. **Setup SSL with Let's Encrypt:**

   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

### Docker Deployment (Optional)

If using Docker, update the `Dockerfile` for Python:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY backend/pyproject.toml .
RUN pip install -e .

COPY backend/app ./app

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Architecture

- **Frontend**: Vue.js 3 + Vite + Tailwind CSS + Phaser 3
- **Backend**: Python + FastAPI + SQLAlchemy ORM
- **Database**: SQLite (file-based)
- **Authentication**: JWT tokens
- **Scheduling**: APScheduler for daily block distribution

## Development

For detailed development setup and API documentation, see [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)

### Folder Structure

```
backend/                  # Python FastAPI backend
├── app/
│   ├── main.py         # FastAPI app entry point
│   ├── models.py       # SQLAlchemy models
│   ├── schemas.py      # Pydantic schemas
│   ├── services/       # Business logic
│   ├── routes/         # API endpoints
│   └── utils/          # JWT, security functions
├── pyproject.toml      # Python dependencies
└── .env                # Configuration

frontend/               # Vue.js frontend
├── src/
│   ├── views/         # Page components
│   ├── components/    # Reusable components
│   ├── stores/        # Pinia state management
│   ├── services/      # API client
│   ├── utils/         # Phaser game setup
│   ├── App.vue        # Root component
│   └── main.js        # Entry point
├── package.json       # Node.js dependencies
├── vite.config.js     # Vite configuration
└── index.html
```

## Specifications

**V1**:

- **Concept**: as soon as you connect, you receive the 10 blocks of the day, selected from a varied block catalog. You can place them on a canvas following a grid, to freely draw whatever you like. Once you've placed the available blocks, you can come back the next day to place the next 10. As time goes on, you watch your creation grow. You can view other people's constructions and like them. The most liked constructions and the most recently modified ones are visible in a menu.
- **Blocks**: they can be simple or complex, very clear or abstract in shape, look like objects or nothing in particular. They are consistent within a single universe (medieval, sci-fi, modern, abstract, monochrome, colorful, ...). All blocks are the same size, even if it's a smaller object.
- **Block distribution**: blocks distributed on the current day are randomly selected at 00:00. Everyone who connects on the same day therefore receives the same blocks. It's possible to discard blocks. If blocks haven't been placed and remain in inventory, they will be replaced by the next 10 the following day. Each block has a rarity notion, the most common blocks have a higher chance of being selected for the day. Therefore, the same blocks can be provided multiple times in the inventory each day. Upon first arrival, you receive more blocks (30) to allow you to start building.
- **Block placement**: they are placed on a grid sized 1/2 of a block's size. You can move all placed blocks, even past ones. Blocks have a number that allows the editor to know witch block to place on top of the others. Blocks can be rotated in 90° increments, and flipped horizontally and vertically.
- **Layout**: After login / register, you arrive on the canvas. The canvas is infinite, you can scroll in all directions with middle click drag & drop, zoom in & out. A background image set the theme of the world. A home button allows you to quickly return to the center of the canvas, the center of the world image. A menu to the left displays the available, with a badge for the number, if there are more than one. On click, the block is selected and can be placed on the canvas, a phantom display where it lands. Some action butons around the block allow to rotate, flip it and discard it (will be placed back in the inventory). A community button allows you to jump to a new page where you can see the most liked and most recently modified worlds. You can click on them to view them (read only), like them, and see who created them.
- **Technical**: Next.js, Shadcn/ui, Prisma + SQLite, PhaserJs for the editor. Uses classes & divide code into components, hooks, utils, etc, especially for the phaser.js editor.
- **Available media**:
  - `univers/ink_castle/tiles/tile_{id}_{layer}_{rarity}.png`
    - id: 0 to n
    - layer: 0 for the background, the higher the layer, the more in the foreground the block is, and above the others, in display and selection.
    - rarity: 0 for the most common, the higher the rarity, the less likely it is to be selected for the day.
  - `univers/ink_castle/world.png`: the background image of the world, which sets the theme and style of the blocks.

**V2**:

- **Multiple worlds**: it's possible to have multiple "worlds" from the same universe or different universes.
- **Sandbox**: there's a sandbox mode that allows building without limits.

**V3**:

- **Seasons**: addition of temporary worlds. They are created on the first day of the month and closed on the last. The following month, worlds created by all participants are visible, and you can like them. A ranking of the most liked worlds is accessible. The catalog universe changes from month to month.
