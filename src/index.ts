import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import fs from 'fs';
import path from 'path';
import { startBot, stopBot, getBotStatus } from './bot.js';
import { loadMCPConfigs, startAllMCPServers, startMCPServer, stopMCPServer, mcpClients, fullMcpConfig } from './mcp.js';
import { logger } from './logger.js';
import { searchSemanticMemory, wipeSemanticMemory } from './memory/pinecone.js';
import { generateGraphData } from './memory/graph.js';
import { getRecentMessages, getDailyRequestCount, getMessageRows, clearMessages } from './memory/sqlite.js';
import { generateResponse, registerLatencyHook, updateCachedPersona } from './llm.js';

const app = express();
const PORT = 3000;
const startTime = Date.now();

// Track last LLM latency
export let lastLatencyMs = 0;
export function setLastLatency(ms: number) { lastLatencyMs = ms; }

// Register latency hook to llm.ts (avoids circular import)
registerLatencyHook((ms) => { lastLatencyMs = ms; });

// Middleware
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // For the dashboard build output

// ─── 1. Real-Time Log Streaming (SSE) ───────────────────────────────────────
app.get('/api/logs', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  // Send an immediate connection confirmation
  res.write(`data: ${JSON.stringify('[SYSTEM] Dashboard log stream connected.')}\n\n`);

  // Send recent history first
  const history = logger.getRecentLogs();
  history.forEach(log => res.write(`data: ${JSON.stringify(log)}\n\n`));

  const onLog = (msg: string) => {
    res.write(`data: ${JSON.stringify(msg)}\n\n`);
  };

  logger.on('log', onLog);

  // Send heartbeat every 15s to keep the SSE connection alive over proxies/Tailscale
  const heartbeat = setInterval(() => {
    res.write(': keep-alive\n\n');
  }, 15000);

  req.on('close', () => {
    logger.off('log', onLog);
    clearInterval(heartbeat);
  });
});

// ─── 2. MCP Server Health & Control ─────────────────────────────────────────
app.get('/api/mcp/status', async (req, res) => {
  const result: Record<string, any> = {};
  
  // Use memory-cached full config from mcp.ts (hot-reloaded via fs.watch)
  const allConfigured = Object.keys(fullMcpConfig);
  
  for (const name of allConfigured) {
    const client = mcpClients[name];
    let toolCount = 0;
    if (client) {
      try {
        // Use cached tool list if available from client
        const tools = await client.listTools();
        toolCount = tools.tools.length;
      } catch { toolCount = 0; }
    }
    const isDisabled = fullMcpConfig[name]?.disabled === true;
    
    result[name] = {
      status: client && !isDisabled ? 'online' : isDisabled ? 'offline' : 'connecting',
      tools: toolCount,
      disabled: isDisabled
    };
  }
  res.json(result);
});

app.post('/api/mcp/toggle', async (req, res) => {
  const { serverName, action } = req.body;
  if (!serverName) return res.status(400).json({ error: 'serverName required' });
  try {
    const configPath = path.join(process.cwd(), 'mcp_config.json');
    if (!fs.existsSync(configPath)) return res.status(404).json({ error: 'mcp_config.json not found' });
    
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    if (!config.mcpServers[serverName]) return res.status(404).json({ error: `Server ${serverName} not configured` });
    
    let isDisabled = config.mcpServers[serverName].disabled;
    if (action === 'start') isDisabled = false;
    else if (action === 'stop') isDisabled = true;
    else isDisabled = !isDisabled; // Toggle if no specific action provided
    
    config.mcpServers[serverName].disabled = isDisabled;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    
    // Instantly trigger hot-reload so LLM tools update synchronously
    const { hotReloadMCPServers } = await import('./mcp.js');
    await hotReloadMCPServers();
    
    res.json({ status: isDisabled ? 'offline' : 'online', serverName });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 3. Short-Term Memory (SQLite) ──────────────────────────────────────────
app.get('/api/memory/sqlite', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  try {
    const rows = getMessageRows(limit);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 4. Agent Control endpoint has been consolidated ────────────────────────

// ─── 5. Settings (Read/Write .env) ──────────────────────────────────────────
const ENV_PATH = path.join(process.cwd(), '.env');

const EDITABLE_KEYS = [
  'TELEGRAM_BOT_TOKEN', 'TELEGRAM_USER_ID', 'OLLAMA_BASE_URL', 'OLLAMA_EMBEDDING_MODEL',
  'GROQ_API_KEY', 'PINECONE_API_KEY', 'TIMEZONE', 'LLM_ROUTING_MODE',
  'OPENROUTER_MODEL', 'LOCAL_MODEL', 'OPENROUTER_API_KEY', 'MEMORY_VISUALIZER_LIMIT'
];

app.get('/api/settings', (req, res) => {
  try {
    const settings: Record<string, string> = {};
    for (const key of EDITABLE_KEYS) {
      settings[key] = process.env[key] || '';
    }
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings', (req, res) => {
  const updates = req.body as Record<string, string>;
  try {
    let envContent = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf-8') : '';
    for (const [key, value] of Object.entries(updates)) {
      if (!EDITABLE_KEYS.includes(key)) continue; // whitelist only
      process.env[key] = value; // Update in-memory
      // Update or add in .env file
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${key}=${value}`);
      } else {
        envContent += `\n${key}=${value}`;
      }
    }
    fs.writeFileSync(ENV_PATH, envContent);
    res.json({ status: 'saved' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});



// ─── 6. Persona (Read/Write .agent/persona.md) ───────────────────────────────
const PERSONA_PATH = path.join(process.cwd(), '.agent', 'persona.md');

app.get('/api/persona', (req, res) => {
  try {
    const persona = fs.existsSync(PERSONA_PATH) ? fs.readFileSync(PERSONA_PATH, 'utf-8') : 'You are IRIS.';
    res.json({ persona });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/persona', (req, res) => {
  const { persona } = req.body;
  if (typeof persona !== 'string') return res.status(400).json({ error: 'persona required' });
  try {
    fs.mkdirSync(path.dirname(PERSONA_PATH), { recursive: true });
    fs.writeFileSync(PERSONA_PATH, persona, 'utf-8');
    updateCachedPersona(persona); // Update in-memory cache for LLM immediately
    res.json({ status: 'saved' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 7. Agent Identity & Status ──────────────────────────────────────────────
app.get('/api/agent/status', (req, res) => {
  const uptimeMs = Date.now() - startTime;
  const hours = Math.floor(uptimeMs / 3600000);
  const minutes = Math.floor((uptimeMs % 3600000) / 60000);
  res.json({
    status: getBotStatus(),
    model: process.env.OPENROUTER_MODEL || 'IRIS Agent',
    uptime: `${hours}h ${minutes}m`,
    uptimeMs,
    latencyMs: lastLatencyMs,
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  });
});

app.post('/api/agent/toggle', async (req, res) => {
  try {
    const currentStatus = getBotStatus();
    if (currentStatus === 'online') {
      await stopBot();
    } else {
      // Explicitly stop search for any hanging instances first
      await stopBot();
      await startBot();
    }
    res.json({ status: getBotStatus() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// ─── 8. Daily Metrics (OpenRouter quota + local request count) ───────────────
function getUtcResetIn(): string {
  const now = new Date();
  const nextMidnightUtc = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0
  ));
  const diffMs = nextMidnightUtc.getTime() - now.getTime();
  const hours = Math.floor(diffMs / 3600000);
  const minutes = Math.floor((diffMs % 3600000) / 60000);
  return `${hours}H ${minutes}M`;
}

app.get('/api/metrics', async (req, res) => {
  const resetIn = getUtcResetIn();
  // Local SQLite count is our request counter (one per LLM call iteration)
  const requestsToday = getDailyRequestCount();

  if (!process.env.OPENROUTER_API_KEY) {
    return res.json({ requestsToday, dailyQuota: 200, resetIn, source: 'local' });
  }

  try {
    const orRes = await fetch('https://openrouter.ai/api/v1/key', {
      headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` }
    });

    if (!orRes.ok) throw new Error(`OpenRouter returned ${orRes.status}`);
    const orData: any = await orRes.json();
    const data = orData.data ?? orData;

    // OpenRouter daily `:free` model request limits:
    //   - 50 requests/day  if is_free_tier and no credits purchased
    //   - 1000 requests/day if >=10 credits purchased (is_free_tier === false OR limit set)
    let dailyQuota = 50; // default for free users with no credits
    if (data.is_free_tier === false || (data.limit != null && data.limit >= 10)) {
      dailyQuota = 1000;
    }
    // If account has an explicit credit-based limit, surface that too
    const dailySpend = Math.round((data.usage_daily ?? 0) * 10000) / 10000;
    const creditLimit = data.limit ?? null;
    const creditRemaining = data.limit_remaining ?? null;

    return res.json({
      requestsToday,
      dailyQuota,
      dailySpend,
      creditLimit,
      creditRemaining,
      resetIn,
      source: 'openrouter'
    });
  } catch (err: any) {
    console.error('[METRICS] OpenRouter fetch failed, using local count:', err.message);
    return res.json({ requestsToday, dailyQuota: 200, resetIn, source: 'local' });
  }
});


// ─── 9. Pinecone Memory Graph (Visualizer) ───────────────────────────────────
app.get('/api/memory/pinecone', async (req, res) => {
  try {
    const limit = parseInt(process.env.MEMORY_VISUALIZER_LIMIT || '100', 10);
    const graphData = await generateGraphData(limit);
    res.json(graphData);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/memory/pinecone/wipe', async (req, res) => {
  try {
    const success = await wipeSemanticMemory();
    if (success) {
      res.json({ status: 'wiped' });
    } else {
      res.status(500).json({ error: 'Failed to wipe Pinecone index' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


app.post('/api/memory/clear', (req, res) => {
  try {
    clearMessages();
    res.json({ status: 'cleared' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 11. Health Check ────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'IRIS',
    bot: getBotStatus(),
    mcp: Object.keys(mcpClients).map(name => ({ name, status: 'connected' }))
  });
});

// ─── 12. Native Chat API ──────────────────────────────────────────────────────
import { getMessageCount } from './memory/sqlite.js';

function sendSSE(res: any, chunk: string, done: boolean) {
  res.write(`data: ${JSON.stringify({ chunk, done })}\n\n`);
}

async function handleDashboardSlashCommand(cmd: string): Promise<string | null> {
  const trimmed = cmd.trim();
  if (!trimmed.startsWith('/')) return null;
  const [name, ...args] = trimmed.slice(1).split(/\s+/);
  
  console.log(`[DASHBOARD-CMD] Executing: /${name}`);
  
  switch (name.toLowerCase()) {
    case 'status': {
      const model = process.env.OPENROUTER_MODEL || 'openrouter/auto';
      const uptime = process.uptime();
      const h = Math.floor(uptime / 3600), m = Math.floor((uptime % 3600) / 60), s = Math.floor(uptime % 60);
      const msgCount = getMessageCount();
      return `⚙️ IRIS STATUS\n\n🧠 Model: ${model}\n⏱ Uptime: ${h}h ${m}m ${s}s\n💬 Messages in memory: ${msgCount}`;
    }
    case 'new': {
      clearMessages();
      return '🔄 Conversation cleared. Starting fresh.';
    }
    case 'compact': {
      const count = getMessageCount();
      if (count <= 10) return '💬 Context is already compact (≤10 messages). No action needed.';
      clearMessages();
      return `🗜 Compacted. Cleared ${count} messages. Context reset.`;
    }
    case 'model': {
      if (args.length === 0) {
        const current = process.env.OPENROUTER_MODEL || 'openrouter/auto';
        return `🧠 Current model: ${current}\n\nTo switch: /model <model-name>`;
      }
      process.env.OPENROUTER_MODEL = args.join(' ');
      return `🧠 Model switched to: ${process.env.OPENROUTER_MODEL}`;
    }
    case 'usage': {
      const count = getMessageCount();
      const uptime = process.uptime();
      const h = Math.floor(uptime / 3600), m = Math.floor((uptime % 3600) / 60);
      return `📊 USAGE STATISTICS\n\n💬 Total messages: ${count}\n⏱ Session duration: ${h}h ${m}m\n🧠 Model: ${process.env.OPENROUTER_MODEL || 'openrouter/auto'}`;
    }
    case 'brief': {
      const { generateMorningBriefing } = await import('./proactive/scheduler.js');
      const briefing = await generateMorningBriefing();
      return `🌅 MORNING BRIEFING\n\n${briefing}`;
    }
    default:
      return null; // Unknown command — fall through to LLM
  }
}

app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'message required' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Handle slash commands without sending to LLM
  if (message.startsWith('/')) {
    try {
      const result = await handleDashboardSlashCommand(message);
      if (result !== null) {
        sendSSE(res, result, true);
        res.end();
        return;
      }
    } catch (err: any) {
      sendSSE(res, `Error running command: ${err.message}`, true);
      res.end();
      return;
    }
  }

  try {
    let fullResponse = '';
    await generateResponse(message, (chunk) => {
      fullResponse = chunk;
      sendSSE(res, chunk, false);
    });
    sendSSE(res, fullResponse, true);
  } catch (err: any) {
    sendSSE(res, `Error: ${err.message}`, true);
  }
  res.end();
});


// ─── Start Server ─────────────────────────────────────────────────────────────
const server = app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Health check server running on port ${PORT}`);
  loadMCPConfigs();
  startAllMCPServers();
  startBot().catch(console.error);
});

server.on('error', (e: any) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is in use. The health check server could not start, but IRIS will attempt to boot anyway.`);
    loadMCPConfigs();
    startAllMCPServers();
    startBot().catch(console.error);
  } else {
    console.error('Server error:', e);
  }
});
