#!/bin/sh

# Exit on error
set -e

echo "Starting DailyBildi..."

# Ensure data directory exists and has proper permissions
if [ ! -d /app/data ]; then
  mkdir -p /app/data
  chmod 755 /app/data
fi

# Make sure we can write to the directory
if [ ! -w /app/data ]; then
  echo "Warning: /app/data is not writable, attempting to fix permissions..."
  chmod 755 /app/data 2>/dev/null || true
fi

# Run database migrations
echo "Running database migrations..."
npx prisma migrate deploy

echo "Starting Next.js server..."
npm start