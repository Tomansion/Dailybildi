# Multi-stage build for Dailybildi

# Stage 1: Build frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend files
COPY frontend/package*.json ./

# Install dependencies
RUN npm install

# Copy frontend source
COPY frontend/ .

# Build frontend with API URL pointing to root (backend on same origin)
ENV VITE_API_URL=/api
RUN npm run build


# Stage 2: Build and run backend with frontend
FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    && rm -rf /var/lib/apt/lists/*

# Copy backend files
COPY backend/ ./backend/
COPY public/ ./public/

# Copy built frontend from previous stage
COPY --from=frontend-builder /app/frontend/dist ./backend/public/static/frontend

# Set working directory for backend
WORKDIR /app/backend

# Install Python dependencies
RUN pip install --no-cache-dir -e .

# Create data directory for database
RUN mkdir -p data

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')" || exit 1

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV FRONTEND_URL=http://localhost:3000

# Default command
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
