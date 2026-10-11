# Multi-stage Dockerfile for Go backend (supports both dev and prod)
FROM golang:1.25.3-alpine AS base

# Install necessary packages
RUN apk add --no-cache git ca-certificates tzdata curl

# Set working directory
WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Development stage
FROM base AS development
# Install Air for hot reloading
RUN go install github.com/air-verse/air@latest
# Install Delve for debugging
RUN go install github.com/go-delve/delve/cmd/dlv@latest
# Copy source code
COPY . .
# Create logs directory
RUN mkdir -p logs
# Expose ports
EXPOSE 8080 2345
# Default command for development
CMD ["air", "-c", ".air.toml"]

# Production builder stage
FROM base AS builder
# Copy source code
COPY . .
# Build the application with optimizations
RUN CGO_ENABLED=0 GOOS=linux go build \
    -a -installsuffix cgo \
    -ldflags='-w -s -extldflags "-static"' \
    -trimpath \
    -o main .

# Production stage - use specific version for security
FROM alpine:3.20 AS production

# Install ca-certificates for HTTPS requests and security updates
RUN apk --no-cache add ca-certificates tzdata wget \
    && apk upgrade --no-cache

# Create non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

# Set working directory
WORKDIR /app

# Copy binary from builder stage
COPY --from=builder /app/main .

# Copy migration files if they exist
COPY --from=builder /app/migrations ./migrations

# Create logs directory
RUN mkdir -p logs && chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Run the application
CMD ["./main"]
