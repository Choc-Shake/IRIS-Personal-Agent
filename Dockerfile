# ══════════════════════════════════════════════════════════════════════════════
# IRIS — Multi-Stage Production Dockerfile
# Stage 1: Build Frontend & Backend
# Stage 2: Production Runtime (Node.js + Python for MCP)
# ══════════════════════════════════════════════════════════════════════════════

# ── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY ["IRIS Frontend Design/package.json", "IRIS Frontend Design/package-lock.json", "./IRIS Frontend Design/"]

# Install all dependencies (including dev for build)
RUN npm install
RUN cd "IRIS Frontend Design" && npm install

# Copy source code
COPY . .

# Build both Backend (tsc) and Frontend (vite)
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

# Copy production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built assets from builder stage
COPY --from=builder /app/dist ./dist/
COPY --from=builder /app/public ./public/

# Copy config files
COPY mcp_config.docker.json ./mcp_config.json
COPY .agent/ ./.agent/

# Ensure necessary directories exist for volume mounts
RUN mkdir -p /app/data /app/.agent

# Expose dashboard port
EXPOSE 3000

# Start IRIS (using node directly on compiled JS)
CMD ["node", "dist/index.js"]
