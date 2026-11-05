# ─────────────────────────────────────────────────────────────
# Stage 1 — Dependencies
# Install only production dependencies in an isolated layer
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Copy dependency manifests first (leverages Docker layer cache)
COPY package.json package-lock.json ./

# Install only production dependencies
RUN npm ci --omit=dev && \
    npm cache clean --force


# ─────────────────────────────────────────────────────────────
# Stage 2 — Production image
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS production

# Install dumb-init for proper PID 1 signal handling
RUN apk add --no-cache dumb-init

# Create a non-root user and group for security
RUN addgroup -S appgroup && \
    adduser  -S appuser -G appgroup

WORKDIR /app

# Copy production node_modules from the deps stage
COPY --from=deps --chown=appuser:appgroup /app/node_modules ./node_modules

# Copy application source
COPY --chown=appuser:appgroup src/ ./src/
COPY --chown=appuser:appgroup package.json ./

# Switch to non-root user
USER appuser

# Expose application port
EXPOSE 3000

# Set Node.js production environment
ENV NODE_ENV=production \
    PORT=3000

# Health check — Docker will mark the container unhealthy if this fails
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:3000/health || exit 1

# Use dumb-init as the entry point so Node receives SIGTERM correctly
ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "src/app.js"]
