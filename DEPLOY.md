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

### 2. Configure Environment
```bash
# Create your .env file from the template
cp .env.example .env
nano .env
```

Fill in your API keys:
```
TELEGRAM_BOT_TOKEN=<your-telegram-bot-token>
TELEGRAM_USER_ID=<your-telegram-user-id>
OPENROUTER_API_KEY=<your-openrouter-key>
PINECONE_API_KEY=<your-pinecone-key>
GROQ_API_KEY=<your-groq-key>
TIMEZONE=America/Edmonton
LLM_ROUTING_MODE=CLOUD_ONLY
OPENROUTER_MODEL=openrouter/free
```

### 3. Configure Persona
```bash
# Create your persona file
mkdir -p .agent
nano .agent/persona.md
```

### 4. Build & Launch
```bash
docker compose up -d --build
```

First build takes ~3-5 minutes (downloads Node.js, Python, builds frontend).
Subsequent builds use cached layers and are much faster.

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
