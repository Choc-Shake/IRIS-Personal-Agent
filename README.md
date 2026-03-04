# 👁️ IRIS: Intelligent Response and Insight System

IRIS is a sophisticated, deterministic, and highly-efficient AI agentic bot system designed for personal assistance and automation. Built with Node.js and TypeScript, IRIS leverages the Model Context Protocol (MCP) to interact with various tools and services, providing a seamless and powerful user experience through Telegram.

---

## ✨ Key Features

- 🛠️ **MCP Integration**: Dynamic tool loading and execution via the Model Context Protocol. Supports Zapier, Weather, Context7, and more.
- 📁 **Memory System**: Persistent exact memory using SQLite (`better-sqlite3`) in **WAL Mode** for lightning-fast, parallel I/O.
- 📡 **Telegram Interface**: Full-featured Telegram bot with **Real-Time Response Streaming** (watch IRIS type her answers live).
- 🎤 **Voice Transcription**: Automatic transcription of voice messages for seamless interaction on the go.
- 🧩 **Intent Router**: Sub-millisecond keyword-based routing that filters 65+ MCP tools down to only what's needed, crushing token bloat.
- 🧠 **Cloud LLM Native**: Optimized for high-performance cloud models via OpenRouter (Gemini, Qwen, etc.).
- 🛡️ **B.L.A.S.T. Protocols**: Built on a highly-efficient, self-healing architecture:
  - **B**ehavioral Logic
  - **L**atency Awareness
  - **A**gentic Nesting
  - **S**chema Simplification
  - **T**ool Isolation

---

## 🏗️ Architecture (A.N.T.)

IRIS follows the **Agentic, Nested, Task-oriented (A.N.T.)** structure:

1.  **Orchestrator (`src/llm.ts`)**: The core execution loop that handles planning, tool selection, and stateful response generation with **Streaming support**.
2.  **Intent Router (`src/router.ts`)**: A zero-latency pre-flight layer that determines tool requirements before the LLM even starts thinking.
3.  **MCP Layer (`src/mcp.ts`)**: Manages external server connections and dynamic tool schema injection.
4.  **Memory Layer (`src/memory/`)**: Handles state persistence across conversations using optimized SQLite WAL journals.
5.  **UX Layer (`src/ux/`)**: Manages visual feedback, typing indicators, and real-time message editing.

---

## ⚡ High-Performance Optimizations

IRIS is built for speed, with several layers of optimization to ensure instant responses:

- **Database WAL Mode**: Uses SQLite's Write-Ahead Logging to prevent database locks and ensure parallel memory access.
- **Strict Tool Filtering**: Reduces the 65+ tool schema payload down to the bare essentials (or zero for chat), saving seconds of token-processing time.
- **LLM Timers**: Built-in `[PERF]` metrics to monitor LLM network latency vs. local task processing time.
- **Response Streaming**: Uses OpenRouter's streaming API to deliver chunks word-by-word, eliminating the perceived wait for long summaries.

---

## 🚀 Tech Stack

- **Runtime**: [Node.js](https://nodejs.org/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Bot Framework**: [grammY](https://grammy.dev/)
- **Database**: [SQLite](https://sqlite.org/) via `better-sqlite3`
- **LLM API**: [OpenRouter](https://openrouter.ai/)
- **Tools**: [MCP SDK](https://modelcontextprotocol.io/)
- **Styling/UX**: [Tailwind CSS](https://tailwindcss.com/) (Web Health Check), [Lucide React](https://lucide.dev/)

---

## 🛠️ Prerequisites

- **Node.js** (v18+)
- **NPM** or **PNPM**
- **Telegram Bot Token** (from @BotFather)
- **OpenRouter API Key**

---

## ⚙️ Setup & Configuration

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/IRIS.git
   cd IRIS
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy the example environment file and fill in your keys:
   ```bash
   cp .env.example .env
   ```
   Required variables:
   - `TELEGRAM_BOT_TOKEN`: Your Telegram bot token.
   - `TELEGRAM_USER_ID`: Your Telegram ID (for whitelisting).
   - `OPENROUTER_API_KEY`: Your OpenRouter API key.
   - `OPENROUTER_MODEL`: e.g., `google/gemini-2.0-flash-exp:free`

4. **MCP Configuration**:
   Update `mcp_config.json` with your desired MCP servers (e.g., Google Calendar, Weather, Zapier).

---

## 🏃 Running the Project

- **Development Mode**:
  ```bash
  npm run dev
  ```
- **Build & Start**:
  ```bash
  npm run build
  npm start
  ```

---

## 📂 Project Structure

```text
IRIS/
├── .agent/              # Agent skills and protocols
├── data/                # Memory databases and temporary files
├── src/
│   ├── commands/        # Telegram slash commands
│   ├── memory/          # SQLite management
│   ├── ux/              # Visual feedback and typing indicators
│   ├── voice/           # Transcription logic
│   ├── bot.ts           # Telegram bot initialization
│   ├── index.ts         # Entry point and health server
│   ├── llm.ts           # Core execution loop
│   └── mcp.ts           # MCP server management
└── mcp_config.json      # MCP server definitions
```

---

## 📝 License

Private / MIT (Optional)
