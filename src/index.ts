import 'dotenv/config';
import express from 'express';
import { startBot } from './bot.js';
import { loadMCPConfigs } from './mcp.js';

const app = express();
const PORT = 3000;

// AI Studio requires a web server on port 3000 to keep the container alive and pass health checks.
// We expose a simple health endpoint, but the bot itself uses Telegram long-polling.
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'IRIS' });
});

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Health check server running on port ${PORT}`);
  
  // Load MCP configurations (but don't start servers yet)
  loadMCPConfigs();
  
  // Start the Telegram bot
  startBot().catch(console.error);
});
