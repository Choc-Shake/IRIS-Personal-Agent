# 👁️ IRIS: Intelligent Response and Insight System

> *The deterministic, high-efficiency personal agentic backbone.*

IRIS is a sophisticated AI agent system built for extreme performance, reliability, and modularity. Powered by the **B.L.A.S.T. Architecture**, IRIS seamlessly bridges the gap between conversational AI and practical automation.

---

## ⚡ B.L.A.S.T. Architecture
IRIS is engineered for speed and precision using five core pillars:
- **B**ehavioral Logic: Deterministic personality via `.agent/persona.md`.
- **L**atency Awareness: Built-in `[PERF]` tracking and payload compression.
- **A**gentic Nesting: Self-healing loops and recursive tool discovery.
- **S**chema Simplification: Lightweight tool injection to crush token bloat.
- **T**ool Isolation: Secure, modular MCP server execution.

---

## ✨ Key Features

### 🖥️ Next-Gen Dashboard
A premium, real-time control center built with React and Framer Motion.
- **Live Terminal**: Integrated SSE log streamer with log virtualization.
- **Native Chat**: Direct agent interaction with Markdown support and tab-to-autocomplete slash commands.
- **Memory Visualizer**: A beautiful, interactive physics-based hub showing your agent's cognitive graph.
- **System Health**: Real-time monitoring of MCP servers, latency, and daily request quotas.

### 🧠 Cognitive Engine
- **Hybrid Memory**: SQLite for exact history + Pinecone for long-term semantic RAG.
- **Zero-Latency Routing**: Sub-millisecond intent routing filters 65+ tools down to exactly what's needed.
- **Proactive Insights**: IRIS doesn't just respond; she thinks, saves memories, and recalls relevant context automatically.

### 🔌 Model Context Protocol (MCP)
IRIS is a first-class MCP citizen, connecting natively to:
- **Zapier**: Automate Google Tasks, Calendar, Gmail, and 6000+ other apps.
- **Documentation**: Direct access to local repositories or technical docs.
- **Web Intelligence**: Real-time search and weather tracking.

---

## 🚀 Speed & Optimization
- **Backend Compression**: Gzip/Deflate middleware for lightning-fast graph and log transfers.
- **DB Indexing**: Composite indices for instant metrics and history retrieval.
- **DOM Virtualization**: "Sliding window" rendering ensures the UI stays buttery smooth even after 1000+ entries.
- **WAL Mode**: SQLite Write-Ahead Logging for high-concurrency memory access.

---

## 🛠️ Deployment & Hosting

### Windows / Local
```bash
npm install
npm run dev
```

### CasaOS / Docker (Recommended)
IRIS is production-ready for homeservers.
1. Copy `.env.example` to `.env` and add your keys.
2. Run `docker compose up -d --build`.
3. Access your dashboard at `http://<tailscale-ip>:3000`.

See [DEPLOY.md](DEPLOY.md) for the full guide.

---

## 📂 Project Structure
- `.agent/`: Personality, skills, and cognitive constraints.
- `src/`: Core TypeScript logic (LLM loops, MCP client, routers).
- `IRIS Frontend Design/`: The high-performance React dashboard.
- `data/`: Persistent SQLite & backup storage.

---

## 📝 License
Copyright © 2026. Built with precision for the modern agentic era.
