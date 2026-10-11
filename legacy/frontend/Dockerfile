# Multi-stage Dockerfile for Next.js frontend (supports both dev and prod)
FROM node:22-alpine AS base

# Install necessary packages
RUN apk add --no-cache libc6-compat git wget \
  && apk upgrade --no-cache

# Development stage
FROM base AS development
WORKDIR /app
# Copy package files
COPY package*.json ./
# Install all dependencies (including dev dependencies)
RUN npm ci --frozen-lockfile
# Copy source code
COPY . .
# Create logs directory
RUN mkdir -p logs
# Expose port
EXPOSE 3000
# Default command for development
CMD ["npm", "run", "dev"]

# Dependencies stage for production
FROM base AS deps
WORKDIR /app
# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci --frozen-lockfile

# Builder stage for production
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build the application with optimizations
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# Production image, copy all the files and run next
FROM base AS production
WORKDIR /app

# Install security updates
RUN apk upgrade --no-cache

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Create logs directory
RUN mkdir -p logs && chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Run the application
CMD ["node", "server.js"]
