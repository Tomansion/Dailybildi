# DailyBildi

Build block by block as days go by.

## Quick Start

### Prerequisites

- Node.js 22+ and npm

### Installation

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Configure environment variables:**

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` and fill in:
   - `DATABASE_URL` - SQLite database file path (default: file:./dev.db)
   - `NEXTAUTH_SECRET` - Generate with: `openssl rand -base64 32`
   - `NEXTAUTH_URL` - Your app URL (default: http://localhost:3000)

3. **Initialize the database:**

   ```bash
   npx prisma migrate dev
   ```

4. **Seed the block catalog:**

   ```bash
   npm run db:seed
   ```

5. **Start the development server:**

   ```bash
   npm run dev
   ```

6. **Open your browser:**
   Navigate to http://localhost:3000

### Database Management

Prisma provides several useful commands:

```bash
# View and edit your data in a browser
npm run db:studio

# Create a new migration after schema changes
npm run db:migrate

# Reset database (WARNING: deletes all data)
npm run db:reset
```

### Usage

1. **Register** a new account at `/register`
2. **Login** and you'll receive 30 initial blocks
3. **Build** on the canvas by selecting blocks from your inventory
4. **Manipulate** blocks with rotate, flip, and drag controls
5. **Explore** other users' worlds in the Community page
6. **Like** worlds you enjoy

### Daily Block System

The app automatically selects 10 new blocks every day at midnight UTC using node-cron. The scheduler starts automatically when the Next.js app starts.

## Production Deployment

### Self-Hosted (VPS/Cloud)

1. **Build the application:**

   ```bash
   npm run build
   ```

2. **Set production environment variables**

   For production, you can use SQLite (simple) or PostgreSQL (recommended for scale):
   
   **SQLite:**
   ```
   DATABASE_URL="file:./prod.db"
   ```
   
   **PostgreSQL:**
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/dailybildi"
   ```
   
   Then run migrations:
   ```bash
   npx prisma migrate deploy
   ```

3. **Run the production server:**

   ```bash
   npm start
   ```

4. **Set up a reverse proxy (nginx example):**

   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

5. **Set up SSL with Let's Encrypt:**
   ```bash
   sudo certbot --nginx -d your-domain.com
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
