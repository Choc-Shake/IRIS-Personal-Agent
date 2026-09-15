# IRIS: Intelligent Response and Insight System



> *Project temporarily on hold*

IRIS is a sophisticated AI agent system built for extreme performance, reliability, and modularity. IRIS bridges the gap between conversational AI and practical automation.
The goal of this project is to learn how we can transition AI from underwhelming conversation bots into practical tools to better our lives.
---

## ✨ Key Features

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

### 🖥️ Next-Gen Dashboard (Work in Progress)
A premium, real-time control center built with React and Framer Motion.
- **Live Terminal**: Integrated SSE log streamer with log virtualization.
- **Native Chat**: Direct agent interaction with Markdown support and tab-to-autocomplete slash commands.
- **Memory Visualizer**: A beautiful, interactive physics-based hub showing your agent's cognitive graph.
- **System Health**: Real-time monitoring of MCP servers, latency, and daily request quotas.


## 🛠️ Deployment & Hosting

### Windows / Local
```bash
npm install
npm run dev
```
---

## 📂 Project Structure
- `.agent/`: Personality, skills, and cognitive constraints.
- `src/`: Core TypeScript logic (LLM loops, MCP client, routers).
- `IRIS Frontend Design/`: The high-performance React dashboard.
- `data/`: Persistent SQLite & backup storage.

---

## 📝 License
Copyright © 2026. Built with precision for the modern agentic era.
