#!/bin/sh

# Exit on error
set -e

echo "Starting DailyBildi..."

# Ensure data directory exists
mkdir -p /app/data

# Run database migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Seed the database if needed
if [ ! -f /app/data/.seeded ]; then
  echo "Seeding database..."
  npm run db:seed || true
  touch /app/data/.seeded
fi

echo "Starting Next.js server..."
npm start
echo "Everything is up and running!"