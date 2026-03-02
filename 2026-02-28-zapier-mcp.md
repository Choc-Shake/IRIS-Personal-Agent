# Zapier MCP Integration Implementation Plan

> **For Agent:** REQUIRED SUB-SKILL: Use `executing-plans` (or relevant skill) to implement this plan task-by-task.

**Goal:** Add the Zapier MCP server to the global Antigravity configuration using the provided SSE endpoint URL so the AI assistant can interact with Zapier integrations.

**Architecture:** We will modify `C:\Users\dogki\.gemini\antigravity\mcp_config.json` to include the Zapier `npx mcp-remote` proxy command. Since Zapier MCP endpoints utilize Server-Sent Events (SSE), `mcp-remote` bridges that connection into standard stdio used by local applications.

**Tech Stack:** Node.js, `npx`, `mcp-remote`, JSON configuration

---
### Task 1: Update Global MCP Configuration

**Files:**
- Modify: `C:\Users\dogki\.gemini\antigravity\mcp_config.json`
- Test: Manual / Script Verification

**Step 1: Write the configuration**
```json
{
  "mcpServers": {
    "notebooklm": { ... },
    "pinecone": { ... },
    "zapier": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://mcp.zapier.com/api/v1/connect?token=MmU2NWY2ODUtZjU5Zi00YzAyLWJjMTItNDkxZmQ3YzMzZWUzOlNTMFQyNWgzTUY0VFhoeUdJV0xsTXgxd2R3OXNBQ05oK01UVGt4OGk5UzQ9"
      ]
    }
  }
}
```

**Step 2: Run verification to check syntax**
Run: `Get-Content C:\Users\dogki\.gemini\antigravity\mcp_config.json | ConvertFrom-Json`
Expected: PASS with parsed JSON indicating valid structure.

**Step 3: Test MCP Server**
Verify that the server loads correctly once the environment is reloaded.

**Step 4: Commit**
*(Not applicable format as it is a global tool config out of a git repo, but changes will be saved to disk)*
