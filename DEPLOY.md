# IRIS — CasaOS Homeserver Deployment Guide

## Prerequisites
- CasaOS running on a Linux server
- Docker & Docker Compose installed (CasaOS includes these)
- Tailscale installed on the server for remote access
- Git installed on the server

## Quick Start

### 1. Clone the Repository
```bash
# SSH into your CasaOS server
ssh <your-server>

# Clone IRIS
cd /opt
git clone <your-repo-url> iris
cd iris
```

### 2. Prepare Placeholder Config
Docker needs these files to exist before it can mount them:
```bash
touch .env
mkdir -p .agent && touch .agent/persona.md
```

### 3. Build & Launch
```bash
docker compose up -d --build
```
First build takes ~3-5 minutes (compiles TypeScript backend & Vite frontend).

### 4. Configure via Dashboard 👁️
You don't need to edit files in the terminal! Just open the dashboard and use the UI:
1.  **Open**: `http://<your-server-ip>:3000`
2.  **Settings**: Click the ⚙️ icon to paste your API keys (Telegram, OpenRouter, etc.).
3.  **Persona**: Click the 🎭 icon to write your IRIS persona.
4.  **Restart**: Click "Offline/Online" to reboot IRIS with the new keys.

### 5. Verify
```bash
# Check container is running
docker compose ps

# Check logs
docker compose logs -f iris

# Test the API
curl http://localhost:3000/api/agent/status
```

## Accessing the Dashboard

| Method | URL |
|--------|-----|
| **Local (LAN)** | `http://<server-ip>:3000` |
| **Remote (Tailscale)** | `http://<tailscale-ip>:3000` |

## Common Operations

### View Logs
```bash
docker compose logs -f iris
```

### Restart IRIS
```bash
docker compose restart iris
```

### Update IRIS
```bash
git pull
docker compose up -d --build
```

### Stop IRIS
```bash
docker compose down
```

### Backup Data
```bash
# SQLite database
cp data/memory.db data/memory.db.backup

# Full backup
tar -czf iris-backup-$(date +%Y%m%d).tar.gz data/ .agent/ .env mcp_config.json
```

## Troubleshooting

### Container won't start
```bash
docker compose logs iris     # Check for errors
docker compose down          # Stop everything
docker compose up --build    # Rebuild from scratch
```

### MCP servers not connecting
Check `mcp_config.json` — Python MCP servers use Linux paths inside the container:
- `notebooklm-mcp` → installed globally via pip
- `duckduckgo-mcp-server` → installed globally via pip
- Zapier/Pinecone → use `npx`, work automatically

### Telegram bot not responding
1. Verify `TELEGRAM_BOT_TOKEN` in `.env`
2. Check only one instance of the bot is running (stop local dev server first!)
3. Check container logs for Telegram errors
