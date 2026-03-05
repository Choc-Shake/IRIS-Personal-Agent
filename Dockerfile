# ══════════════════════════════════════════════════════════════════════════════
# IRIS — Multi-Stage Production Dockerfile
# Stage 1: Build the React dashboard frontend
# Stage 2: Production runtime with Node.js + Python (for MCP servers)
# ══════════════════════════════════════════════════════════════════════════════

# ── Stage 1: Build Frontend ──────────────────────────────────────────────────
FROM node:20-slim AS frontend-build

WORKDIR /frontend

# Copy frontend package files for layer caching
COPY "IRIS Frontend Design/package.json" "IRIS Frontend Design/package-lock.json" ./
RUN npm ci

# Copy frontend source and build
COPY "IRIS Frontend Design/" ./
RUN npm run build

# ── Stage 2: Production Runtime ──────────────────────────────────────────────
FROM node:20-slim AS runtime

# Install Python 3 + pip for Python-based MCP servers (notebooklm, duckduckgo)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip python3-venv \
    && rm -rf /var/lib/apt/lists/*

# Install Python MCP packages globally
RUN pip3 install --break-system-packages \
    notebooklm-mcp \
    duckduckgo-mcp-server

WORKDIR /app

# Copy backend package files for layer caching
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy backend source code
COPY src/ ./src/
COPY tsconfig.json ./

# Copy built frontend into the static-serve directory
COPY --from=frontend-build /frontend/dist ./public/

# Copy config files (defaults — overridden via volume mounts in docker-compose)
COPY mcp_config.docker.json ./mcp_config.json
COPY .agent/ ./.agent/

# Create data directory for SQLite persistence
RUN mkdir -p /app/data

# Expose dashboard port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD node -e "fetch('http://localhost:3000/api/agent/status').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Start IRIS
CMD ["npm", "start"]
