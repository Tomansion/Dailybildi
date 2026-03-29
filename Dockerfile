# Multi-stage build for DailyBildi

# Stage 1: Build =====================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files and prisma schema
COPY package*.json ./
COPY prisma ./prisma

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npm run postinstall

# Build Next.js application
RUN npm run build

# Stage 2: Runtime =====================================================
FROM node:22-alpine

WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Copy package files and prisma schema
COPY package*.json ./
COPY prisma ./prisma

# Install only production dependencies
RUN npm ci --only=production

# Copy built application and assets
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/public ./public
COPY --from=builder /app/src ./src

# Copy docker entrypoint script
COPY docker-entrypoint.sh ./

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Set up data directory with proper permissions for nextjs user
RUN mkdir -p /app/data && \
    chown -R nextjs:nodejs /app/data && \
    chmod 755 /app/data && \
    chmod +x /app/docker-entrypoint.sh

USER nextjs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})" || exit 1

# Expose port
EXPOSE 3000

# Volume for database persistence
VOLUME ["/app/data"]

# Environment defaults
ENV NODE_ENV=production
ENV NEXTAUTH_URL=http://localhost:3000
ENV DATABASE_URL=file:/app/data/dev.db
ENV NEXTAUTH_SECRET=change-me-in-production-please

# Start server with migrations via entrypoint
CMD ["/app/docker-entrypoint.sh"]
