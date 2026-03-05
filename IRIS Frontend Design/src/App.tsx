/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';

const API_BASE = '';

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  raw: string;
}

const LogItem = memo(({ entry, color }: { entry: LogEntry, color: string }) => (
  <div className="flex gap-4 group/log py-0.5">
    <span className="text-[10px] font-mono text-zinc-700 shrink-0 w-max leading-relaxed">[{entry.timestamp}]</span>
    <span className={`text-[10px] font-bold shrink-0 w-16 leading-relaxed uppercase tracking-tighter ${color}`}>{entry.level}</span>
    <span className="text-[10px] font-mono text-zinc-400 break-all leading-relaxed flex-1 group-hover/log:text-zinc-200 transition-colors uppercase">{entry.message}</span>
  </div>
));

function parselog(raw: string): LogEntry {
  // Logger format: [HH:MM:SS AM/PM] [INFO|WARN|ERROR] actual message
  // The actual message often contains the REAL tag like [PERF], [DEBUG], [LLM], [ROUTER], [MCP], etc.
  const outerMatch = raw.match(/^\[(.+?)\] \[(?:INFO|WARN|ERROR)\] (.*)$/);
  if (outerMatch) {
    const timestamp = outerMatch[1];
    const body = outerMatch[2];
    // Try to extract the real tag from the body: [PERF], [DEBUG], [LLM], [ROUTER], etc.
    const innerMatch = body.match(/^\[(.+?)\] (.*)$/);
    if (innerMatch) {
      return { timestamp, level: innerMatch[1], message: innerMatch[2], raw };
    }
    // No inner tag — use the raw body and outer level
    const loggerLevel = raw.match(/^\[.+?\] \[(INFO|WARN|ERROR)\]/)?.[1] || 'INFO';
    return { timestamp, level: loggerLevel, message: body, raw };
  }
  // Fallback: try basic [tag] message pattern
  const simpleMatch = raw.match(/^\[(.+?)\] (.*)$/);
  if (simpleMatch) {
    return { timestamp: '', level: simpleMatch[1], message: simpleMatch[2], raw };
  }
  return { timestamp: '', level: 'SYS', message: raw, raw };
}

function getLevelColor(level: string): string {
  const l = level.toUpperCase();
  if (l === 'ERROR') return 'text-red-400';
  if (l === 'WARN') return 'text-yellow-400';
  if (l === 'PERF') return 'text-blue-400';
  if (l === 'DEBUG') return 'text-purple-400';
  if (l === 'LLM') return 'text-violet-400';
  if (l === 'ROUTER') return 'text-pink-400';
  if (l.includes('MCP') || l.includes('PROACTIVE')) return 'text-cyan-400';
  if (l === 'SYSTEM' || l === 'SYS') return 'text-gold/80';
  return 'text-zinc-500';
}

function useLiveLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource(`${API_BASE}/api/logs`);
    esRef.current = es;
    es.onmessage = (e) => {
      try {
        // Backend may send JSON-stringified strings or raw strings
        let raw: string;
        try {
          raw = JSON.parse(e.data) as string;
        } catch {
          raw = e.data;
        }
        if (raw && typeof raw === 'string' && raw.trim().length > 0) {
          setLogs(prev => {
            const next = [...prev, parselog(raw)];
            return next.length > 200 ? next.slice(-200) : next;
          });
        }
      } catch {}
    };
    es.onerror = () => {
      // Auto-reconnect is built into EventSource
    };
    return () => es.close();
  }, []);

  return logs;
}

function useAgentPersona(isOpen: boolean) {
  const [persona, setPersona] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch(`${API_BASE}/api/persona`)
      .then(res => res.json())
      .then(data => {
        if (data.persona) setPersona(data.persona);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load persona:', err);
        setLoading(false);
      });
  }, [isOpen]);

  const savePersona = async (newPersona: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/persona`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persona: newPersona })
      });
      if (res.ok) setPersona(newPersona);
      return res.ok;
    } catch (err) {
      console.error('Failed to save persona:', err);
      return false;
    }
  };

  return { persona, loading, savePersona };
}

function useAppSettings(isOpen: boolean) {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch(`${API_BASE}/api/settings`)
      .then(res => res.json())
      .then(data => {
        setSettings(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load settings:', err);
        setLoading(false);
      });
  }, [isOpen]);

  const saveSettings = async (updates: Record<string, string>) => {
    try {
      const res = await fetch(`${API_BASE}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        setSettings(prev => ({ ...prev, ...updates }));
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to save settings:', err);
      return false;
    }
  };

  return { settings, loading, saveSettings };
}

interface McpServerInfo {
  status: 'online' | 'connecting' | 'offline';
  tools: number;
  disabled: boolean;
}

function useMcpServers() {
  const [mcpServers, setMcpServers] = useState<Record<string, McpServerInfo>>({});

  const [mcpLoading, setMcpLoading] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/mcp/status`);
      const data = await res.json();
      setMcpServers(data);
    } catch (err) {
      console.error('Failed to fetch MCP status:', err);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const toggleMcpServer = async (name: string) => {
    setMcpLoading(true);
    // Optimistic update
    const prev = mcpServers[name];
    setMcpServers(current => ({
      ...current,
      [name]: { ...current[name], status: current[name].status === 'online' ? 'offline' : 'connecting' }
    }));

    try {
      await fetch(`${API_BASE}/api/mcp/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverName: name })
      });
      await fetchStatus();
    } catch {
      setMcpServers(current => ({ ...current, [name]: prev }));
    } finally {
      setMcpLoading(false);
    }
  };

  return { mcpServers, mcpLoading, toggleMcpServer };
}

function useShortTermMemory() {
  const [memory, setMemory] = useState<any[]>([]);

  const fetchMemory = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/memory/sqlite?limit=50`);
      const data = await res.json();
      setMemory(data);
    } catch (err) {
      console.error('Failed to fetch memory:', err);
    }
  };

  useEffect(() => {
    fetchMemory();
    const interval = setInterval(fetchMemory, 5000);
    return () => clearInterval(interval);
  }, []);

  return memory;
}

function useDailyQuota() {
  const [quota, setQuota] = useState({
    requestsToday: 0,
    dailyQuota: 200,
    limitRemaining: null as number | null,
    resetIn: '--H --M',
    source: 'local'
  });

  useEffect(() => {
    const fetchQuota = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/metrics`);
        if (res.ok) {
          const data = await res.json();
          setQuota(prev => ({ ...prev, ...data }));
        }
      } catch (err) {
        console.error('Failed to fetch daily quota:', err);
      }
    };
    fetchQuota();
    const interval = setInterval(fetchQuota, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  return quota;
}


// ─── Native Chat Hook ────────────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  streaming?: boolean;
}

const ChatMessageItem = memo(({ msg }: { msg: ChatMessage }) => {
  if (msg.role === 'assistant') {
    return (
      <div className="flex gap-4">
        <div className="w-8 h-8 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-gold text-sm">face_3</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-[10px] font-bold text-gold uppercase tracking-wider">IRIS</span>
            <span className="text-[9px] font-mono text-zinc-600">{msg.timestamp}</span>
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed break-words whitespace-pre-wrap">
            {msg.content}
            {msg.streaming && (
              <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-gold/70 animate-pulse rounded-sm align-middle" />
            )}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4 flex-row-reverse">
      <div className="flex-1 flex flex-col items-end min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-[9px] font-mono text-zinc-600">{msg.timestamp}</span>
        </div>
        <p className="text-sm text-zinc-300 leading-relaxed bg-white/5 px-4 py-2.5 rounded-2xl rounded-tr-none border border-white/5 max-w-[85%] break-words">
          {msg.content}
        </p>
      </div>
    </div>
  );
});

const SLASH_COMMANDS = [
  { cmd: '/status', desc: 'Show bot status, servers, and model info' },
  { cmd: '/new', desc: 'Clear conversation and start fresh' },
  { cmd: '/compact', desc: 'Compress conversation context' },
  { cmd: '/model', desc: 'Show or switch the active LLM model' },
  { cmd: '/usage', desc: 'Show usage statistics' },
  { cmd: '/brief', desc: 'Generate a morning briefing on demand' },
];

function useNativeChat() {

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load SQLite history on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/memory/sqlite?limit=50`);
        if (!res.ok) return;
        const rows: any[] = await res.json();
        const visible = rows
          .filter((r: any) => r.role === 'user' || r.role === 'assistant')
          .slice(-50) // Ensure we only ever keep the last 50 matches in DOM
          .map((r: any) => ({
            id: String(r.id ?? Math.random()),
            role: r.role as 'user' | 'assistant',
            content: r.content ?? '',
            timestamp: r.created_at
              ? new Date(r.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
              : '--:--:--',
          }));
        setMessages(visible);
      } catch (err) {
        console.error('[CHAT] Failed to load history:', err);
      }
    };
    loadHistory();
  }, []);

  // Auto-scroll to bottom on new messages / streaming updates
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isGenerating) return;

    const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: trimmed, timestamp: now };
    const assistantId = `a-${Date.now()}`;
    const assistantPlaceholder: ChatMessage = { id: assistantId, role: 'assistant', content: '', timestamp: now, streaming: true };

    setMessages(prev => [...prev, userMsg, assistantPlaceholder]);
    setInput('');
    setIsGenerating(true);

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      });

      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          const line = part.replace(/^data: /, '').trim();
          if (!line) continue;
          try {
            const parsed = JSON.parse(line);
            if (parsed.chunk !== undefined) {
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId
                    ? { ...m, content: parsed.chunk, streaming: !parsed.done }
                    : m
                )
              );
            }
          } catch {}
        }
      }
    } catch (err) {
      console.error('[CHAT] Stream error:', err);
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? { ...m, content: 'Connection error. Please try again.', streaming: false }
            : m
        )
      );
    } finally {
      setIsGenerating(false);
    }
  }, [input, isGenerating]);

  return { messages, input, setInput, isGenerating, sendMessage, chatEndRef };
}

function useMemoryGraph() {

  const [graphData, setGraphData] = useState<{ nodes: any[]; links: any[] }>({ nodes: [], links: [] });
  const [searchTerm, setSearchTerm] = useState('');

  const fetchGraph = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/memory/pinecone`);
      if (res.ok) setGraphData(await res.json());
    } catch (err) {
      console.error('Failed to fetch memory graph:', err);
    }
  }, []);

  useEffect(() => {
    fetchGraph();
    // Only fetch once on mount. User can manually refresh via the button.
  }, [fetchGraph]);

  return useMemo(() => ({
    // ⚡ STABLE: graphData.nodes/links identity only changes on fetch.
    // searchTerm is returned separately so callers can apply dimming
    // without triggering expensive physics rebuilds.
    rawNodes: graphData.nodes,
    rawLinks: graphData.links,
    searchTerm,
    setSearchTerm,
    nodeCount: graphData.nodes.length,
    refresh: fetchGraph,
  }), [graphData, searchTerm, fetchGraph]);
}

function useAgentStatus() {
  const [statusData, setStatusData] = useState({
    status: 'offline',
    model: 'IRIS Agent',
    uptime: '0h 0m',
    latencyMs: 0,
    date: '--'
  });
  const [isLoading, setIsLoading] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/agent/status`);
      if (res.ok) {
        const data = await res.json();
        setStatusData(data);
      }
    } catch (err) {
      console.error('Failed to fetch agent status:', err);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const toggleAgent = async () => {
    setIsLoading(true);
    // Optimistic update
    const prevStatus = statusData.status;
    setStatusData(prev => ({ ...prev, status: prevStatus === 'online' ? 'offline' : 'online' }));

    try {
      const res = await fetch(`${API_BASE}/api/agent/toggle`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setStatusData(prev => ({ ...prev, status: data.status }));
      } else {
        setStatusData(prev => ({ ...prev, status: prevStatus }));
      }
    } catch (err) {
      setStatusData(prev => ({ ...prev, status: prevStatus }));
      console.error('Failed to toggle agent:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return { 
    isAgentActive: statusData.status === 'online', 
    statusData,
    isLoading, 
    toggleAgent 
  };
}

const MemoryGraphPanel = memo(function MemoryGraphPanel() {
  const { rawNodes, rawLinks, searchTerm, setSearchTerm, nodeCount, refresh } = useMemoryGraph();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Physics simulation state (all via refs — never touches React state)
  const simRef = useRef<{ nodes: any[]; links: any[]; animId: number | null }>({ nodes: [], links: [], animId: null });

  // Camera transform (zoom + pan) — never touches React state
  const camRef = useRef({ x: 0, y: 0, scale: 1 });

  // Hover tracking via ref — avoids triggering React re-render
  const hoverRef = useRef<any>(null);

  // Pan drag tracking
  const panRef = useRef<{ dragging: boolean; startX: number; startY: number; camX: number; camY: number }>(
    { dragging: false, startX: 0, startY: 0, camX: 0, camY: 0 }
  );

  // ─── Effect 1: Apply _dimmed flag directly to simRef nodes (no physics rebuild) ───
  // This is cheap O(n) and does NOT restart the physics simulation.
  useEffect(() => {
    const { nodes } = simRef.current;
    if (!nodes.length) return;
    const term = searchTerm.toLowerCase();
    for (const n of nodes) {
      n._dimmed = term.length > 1 && !n.fullText?.toLowerCase().includes(term);
    }
  }, [searchTerm]);

  // ─── Effect 2: Physics + Rendering (only runs when RAW graph data changes) ─
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (simRef.current.animId) cancelAnimationFrame(simRef.current.animId);

    const W = container.clientWidth || 600;
    const H = container.clientHeight || 400;
    canvas.width = W;
    canvas.height = H;

    // Reset camera to fit new data
    camRef.current = { x: 0, y: 0, scale: 1 };

    // Build simulation nodes with random starting positions
    const nodes: any[] = rawNodes.map(n => ({
      ...n,
      x: W / 2 + (Math.random() - 0.5) * W * 0.4,
      y: H / 2 + (Math.random() - 0.5) * H * 0.4,
      vx: 0, vy: 0,
    }));
    const nodeById = new Map<string, any>(nodes.map(n => [n.id, n]));
    const links: any[] = rawLinks
      .map((l: any) => ({ source: nodeById.get(l.source), target: nodeById.get(l.target), type: l.type }))
      .filter((l: any) => l.source && l.target);

    simRef.current = { nodes, links, animId: null };

    // ── Physics step function ──────────────────────────────────────────────
    function step(alpha: number) {
      // Node–node repulsion
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = b.x - a.x, dy = b.y - a.y;
          const dist2 = dx * dx + dy * dy;
          const dist = Math.sqrt(dist2) || 1;
          const force = (600 / dist2) * alpha;
          a.vx -= (dx / dist) * force; a.vy -= (dy / dist) * force;
          b.vx += (dx / dist) * force; b.vy += (dy / dist) * force;
        }
      }
      // Link spring forces
      for (const link of links) {
        const dx = link.target.x - link.source.x;
        const dy = link.target.y - link.source.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const ideal = link.type === 'semantic' ? 55 : 110;
        const f = ((dist - ideal) / dist) * alpha * 0.35;
        link.source.vx += dx * f; link.source.vy += dy * f;
        link.target.vx -= dx * f; link.target.vy -= dy * f;
      }
      // Gravity & damping
      for (const n of nodes) {
        n.vx += (W / 2 - n.x) * 0.0025 * alpha;
        n.vy += (H / 2 - n.y) * 0.0025 * alpha;
        n.vx *= 0.72; n.vy *= 0.72;
        n.x = Math.max(12, Math.min(W - 12, n.x + n.vx));
        n.y = Math.max(12, Math.min(H - 12, n.y + n.vy));
      }
    }

    // ── Pre-warm: settle physics silently ─────────────────────────────────
    for (let i = 0; i < 400; i++) step(Math.max(0.008, 0.08 - i * 0.0002));

    // ── Draw function (applies camera transform) ──────────────────────────
    function draw() {
      const { x: cx, y: cy, scale: cs } = camRef.current;
      ctx!.clearRect(0, 0, W, H);
      ctx!.save();
      ctx!.translate(cx, cy);
      ctx!.scale(cs, cs);

      // Links — skip if either endpoint is dimmed (during search)
      for (const link of links) {
        if (link.source._dimmed && link.target._dimmed) continue;
        const opacity = (link.source._dimmed || link.target._dimmed) ? 0.15 : 1;
        ctx!.beginPath();
        ctx!.moveTo(link.source.x, link.source.y);
        ctx!.lineTo(link.target.x, link.target.y);
        ctx!.strokeStyle = link.type === 'semantic'
          ? `rgba(212,175,55,${0.28 * opacity})`
          : `rgba(212,175,55,${0.07 * opacity})`;
        ctx!.lineWidth = link.type === 'semantic' ? 0.9 : 0.4;
        ctx!.stroke();
      }

      // Nodes
      for (const n of nodes) {
        const isHovered = hoverRef.current?.id === n.id;
        const r = Math.min(6, Math.sqrt(Math.max(1, n.val ?? 1)) * 1.4);
        const displayR = isHovered ? r * 1.5 : r;

        if (!n._dimmed) {
          const g = ctx!.createRadialGradient(n.x, n.y, 0, n.x, n.y, displayR * 5);
          g.addColorStop(0, isHovered ? 'rgba(212,175,55,0.4)' : 'rgba(212,175,55,0.15)');
          g.addColorStop(1, 'rgba(212,175,55,0)');
          ctx!.beginPath();
          ctx!.arc(n.x, n.y, displayR * 5, 0, Math.PI * 2);
          ctx!.fillStyle = g;
          ctx!.fill();
        }

        ctx!.beginPath();
        ctx!.arc(n.x, n.y, displayR, 0, Math.PI * 2);
        ctx!.fillStyle = n._dimmed ? 'rgba(212,175,55,0.12)' : (isHovered ? '#FFE066' : '#D4AF37');
        ctx!.fill();
      }

      ctx!.restore();
    }

    // Draw settled frame immediately
    draw();

    // ── RAF loop: extremely gentle idle drift + hover hit-test ─────────────
    let frame = 0;
    function tick() {
      // Barely-perceptible idle drift to keep it feeling alive
      step(0.0018);
      
      // Throttle drawing to every 2nd frame for better performance (still 30-60fps feel)
      if (frame % 2 === 0) draw();

      // Hover hit-test (done inside RAF, no React state involved)
      const canvas2 = canvasRef.current;
      const tip = tooltipRef.current;
      if (canvas2 && tip) {
        const mouseX = (canvas2 as any)._mouseX as number | undefined;
        const mouseY = (canvas2 as any)._mouseY as number | undefined;
        if (mouseX !== undefined && mouseY !== undefined) {
          const { x: cx, y: cy, scale: cs } = camRef.current;
          const wx = (mouseX - cx) / cs;
          const wy = (mouseY - cy) / cs;
          const hit = nodes.find(n => {
            if (n._dimmed) return false;
            const r = Math.min(6, Math.sqrt(Math.max(1, n.val ?? 1)) * 1.4) + 6;
            return Math.hypot(n.x - wx, n.y - wy) < r;
          }) ?? null;

          if (hit?.id !== hoverRef.current?.id) {
            hoverRef.current = hit;
            if (hit) {
              const text = hit.fullText ?? hit.label ?? '';
              tip.textContent = text;
              tip.style.display = 'block';
            } else {
              tip.style.display = 'none';
            }
          }
        }
      }

      frame++;
      simRef.current.animId = requestAnimationFrame(tick);
    }
    tick();

    return () => {
      if (simRef.current.animId) cancelAnimationFrame(simRef.current.animId);
    };
  }, [rawNodes, rawLinks]); // ONLY rebuilds when fetched graph data changes — NOT on search/hover

  // ─── Effect 3: Wheel zoom (attached inside physics effect's canvas guarantee) ─
  // Moved here separate from the physics effect so it re-attaches when canvas remounts.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !nodeCount) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.91;
      const newScale = Math.max(0.2, Math.min(8, camRef.current.scale * zoomFactor));
      camRef.current.x = mx - (mx - camRef.current.x) * (newScale / camRef.current.scale);
      camRef.current.y = my - (my - camRef.current.y) * (newScale / camRef.current.scale);
      camRef.current.scale = newScale;
    };
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [nodeCount]); // re-attaches whenever canvas mounts (nodeCount > 0 condition)

  // ─── Event Handlers (all via refs, no React state) ────────────────────────
  const handleMouseMove = useCallback((e: { clientX: number; clientY: number }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    (canvas as any)._mouseX = e.clientX - rect.left;
    (canvas as any)._mouseY = e.clientY - rect.top;

    if (panRef.current.dragging) {
      const dx = (e.clientX - rect.left) - panRef.current.startX;
      const dy = (e.clientY - rect.top) - panRef.current.startY;
      camRef.current.x = panRef.current.camX + dx;
      camRef.current.y = panRef.current.camY + dy;
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) { delete (canvas as any)._mouseX; delete (canvas as any)._mouseY; }
    const tip = tooltipRef.current;
    if (tip) tip.style.display = 'none';
    hoverRef.current = null;
    panRef.current.dragging = false;
  }, []);

  const handleMouseDown = useCallback((e: { clientX: number; clientY: number }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    panRef.current = {
      dragging: true,
      startX: e.clientX - rect.left,
      startY: e.clientY - rect.top,
      camX: camRef.current.x,
      camY: camRef.current.y,
    };
  }, []);

  const handleMouseUp = useCallback(() => {
    panRef.current.dragging = false;
  }, []);

  return (
    <div className="glass-panel flex-1 flex flex-col overflow-hidden relative">
      {/* Header */}
      <div className="p-6 flex items-center justify-between border-b border-white/5 bg-white/5 gap-4 shrink-0">
        <div className="flex items-center gap-3 shrink-0">
          <span className="material-symbols-outlined text-gold gold-glow">hub</span>
          <h2 className="text-sm font-bold text-white tracking-[0.2em] uppercase">Memories Visualizer</h2>
          <span className="text-[9px] font-mono text-zinc-500 uppercase bg-white/5 px-2 py-0.5 rounded-full">{nodeCount} nodes</span>
        </div>
        <div className="relative flex-1 min-w-0">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gold/50 text-sm">search</span>
          <input
            className="w-full bg-black/40 border border-gold/10 rounded-full pl-9 pr-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-gold/30 focus:ring-1 focus:ring-gold/10 transition-all"
            placeholder="Search cognitive memory nodes..."
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <button onClick={refresh} title="Refresh" className="p-2 rounded-lg bg-white/5 hover:bg-gold/10 text-zinc-400 hover:text-gold transition-colors shrink-0">
          <span className="material-symbols-outlined text-sm">refresh</span>
        </button>
      </div>

      {/* Canvas area */}
      <div ref={containerRef} className="flex-1 relative bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.05),transparent_70%)] overflow-hidden">
        {nodeCount === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center opacity-20">
            <span className="material-symbols-outlined text-4xl mb-2">hub</span>
            <p className="text-[10px] uppercase tracking-widest font-mono">No Memories Found</p>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
            style={{ cursor: panRef.current.dragging ? 'grabbing' : 'grab' }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
          />
        )}
        {/* Tooltip — updated via direct DOM mutation (no React re-render) */}
        <div
          ref={tooltipRef}
          style={{ display: 'none' }}
          className="absolute bottom-4 left-4 right-4 bg-black/85 border border-gold/20 rounded-xl p-3 text-[11px] text-zinc-300 font-mono leading-relaxed pointer-events-none backdrop-blur-sm"
        />
        {/* Zoom hint */}
        <div className="absolute top-3 right-3 text-[8px] font-mono text-zinc-700 uppercase tracking-widest pointer-events-none">
          Scroll to zoom · Drag to pan
        </div>
      </div>
    </div>
    );
  });

function timeAgo(date: string) {
  const now = new Date();
  const past = new Date(date);
  const diffInMs = now.getTime() - past.getTime() + (new Date().getTimezoneOffset() * 60000); // adjust for TZ
  const diffInSec = Math.floor(diffInMs / 1000);
  
  if (diffInSec < 60) return 'Just now';
  const diffInMin = Math.floor(diffInSec / 60);
  if (diffInMin < 60) return `${diffInMin}m ago`;
  const diffInHours = Math.floor(diffInMin / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  return past.toLocaleDateString();
}

export default function App() {
  const liveLogs = useLiveLogs();
  const { mcpServers, mcpLoading, toggleMcpServer } = useMcpServers();
  const memory = useShortTermMemory();
  const { messages: chatMessages, input: chatInput, setInput: setChatInput, isGenerating, sendMessage, chatEndRef } = useNativeChat();
  const { requestsToday, dailyQuota, resetIn } = useDailyQuota();
  const quotaPercentage = Math.min(dailyQuota > 0 ? (requestsToday / dailyQuota) * 100 : 0, 100);
  const ringOffset = 264 - (quotaPercentage * 264 / 100);
  const { isAgentActive, statusData, isLoading: isToggleLoading, toggleAgent } = useAgentStatus();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPersonaOpen, setIsPersonaOpen] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const memoryEndRef = useRef<HTMLDivElement>(null);

  const { persona, loading: personaLoading, savePersona } = useAgentPersona(isPersonaOpen);
  const [personaTextState, setPersonaTextState] = useState('');
  
  useEffect(() => {
    if (!personaLoading) {
      setPersonaTextState(persona);
    }
  }, [persona, personaLoading]);
  
  const { settings, loading: settingsLoading, saveSettings } = useAppSettings(isSettingsOpen);
  const [settingsState, setSettingsState] = useState<Record<string, string>>({});
  
  // Settings sync and password visibility manager
  useEffect(() => {
    if (!settingsLoading) {
      setSettingsState(settings);
    }
  }, [settings, settingsLoading]);
  
  const [passwordVis, setPasswordVis] = useState<Record<string, boolean>>({});
  const toggleVis = (key: string) => setPasswordVis(p => ({ ...p, [key]: !p[key] }));

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [liveLogs]);

  useEffect(() => {
    memoryEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [memory]);

  return (
    <>
      {/* Liquid Background */}
      <div className={`fixed inset-0 z-[-1] overflow-hidden pointer-events-none transition-opacity duration-[3000ms] ease-in-out ${isAgentActive ? 'opacity-100' : 'opacity-0'}`}>
        <div className="fluid-wave wave-1"></div>
        <div className="fluid-wave wave-2"></div>
        <div className="fluid-wave wave-3"></div>
        <div className="fluid-wave wave-4"></div>
      </div>

      <header className="glass-nav h-20 shrink-0 flex items-center justify-between px-8 z-50 relative">
        <div className="flex items-center gap-4 w-1/3">
          <button 
            onClick={() => setIsPersonaOpen(true)}
            className="relative w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-gold/10 hover:text-gold hover:border-gold/30 transition-all text-zinc-400 group"
            title="IRIS Persona Configuration"
          >
            <span className="material-symbols-outlined">face_3</span>
            <span className="material-symbols-outlined absolute -bottom-1.5 -right-1.5 text-[14px] text-gold bg-[#0D0E12] rounded-full border border-gold/20 p-[1px]">menu_book</span>
          </button>

          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-gold/10 hover:text-gold hover:border-gold/30 transition-all text-zinc-400"
            title="System Settings"
          >
            <span className="material-symbols-outlined">settings</span>
          </button>
        </div>
        
        <div className="flex items-center justify-center w-1/2 absolute left-1/2 -translate-x-1/2 gap-4">
          <h1 className="text-3xl font-bold text-white tracking-[0.4em] leading-none">IRIS</h1>
          <div className="h-5 w-[1px] bg-gold/30"></div>
          <p className="text-[11px] text-gold/60 font-medium uppercase tracking-[0.3em] leading-none mt-[2px]">Intelligent Response & Insight System</p>
        </div>

        <div className="flex items-center justify-end gap-6 w-1/3">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-gold font-bold uppercase tracking-widest leading-none">IRIS v1.0.1</span>
            <span className="text-[9px] text-zinc-500 font-mono">STABLE_CONNECTION</span>
          </div>
          <div className="h-8 w-[1px] bg-white/10 mx-2"></div>
          
          <button 
            onClick={() => toggleAgent()}
            disabled={isToggleLoading}
            className={`flex items-center gap-3 pl-4 pr-1 py-1 rounded-full border transition-all duration-300 ${isToggleLoading ? 'opacity-50 cursor-wait' : ''} ${
              isAgentActive 
                ? 'bg-gold/10 border-gold/30' 
                : 'bg-white/5 border-white/10'
            }`}
          >
            <span className={`text-xs font-medium transition-colors ${isAgentActive ? 'text-gold' : 'text-zinc-400'}`}>
              {isAgentActive ? 'AGENT ACTIVE' : 'AGENT STANDBY'}
            </span>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
              isAgentActive 
                ? 'bg-gold text-black shadow-[0_0_10px_rgba(212,175,55,0.5)]' 
                : 'bg-zinc-800 text-zinc-500 border border-white/10'
            }`}>
              <span className="material-symbols-outlined text-xl">
                {isAgentActive ? 'power' : 'power_off'}
              </span>
            </div>
          </button>
        </div>
      </header>
      
      <main className="flex-1 p-8 flex gap-8 overflow-hidden min-h-0">
        <div className="flex-1 flex flex-col gap-8 min-h-0 min-w-0">
          <div className="flex gap-8 h-40 shrink-0">
            {/* Agent Identity */}
            <div className="glass-panel flex-1 p-8 flex flex-col justify-between overflow-hidden relative group">
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-gold/10 rounded-full blur-3xl transition-all group-hover:bg-gold/20"></div>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-gold/60 font-medium font-mono">Agent Identity</p>
                  <h2 className="text-lg font-bold text-white mt-1 uppercase truncate max-w-[200px]" title={statusData.model}>
                    {statusData.model.split('/').pop()?.replace(/-/g, ' ') || statusData.model}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 relative">
                    {isAgentActive && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75"></span>
                    )}
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${isAgentActive ? 'bg-gold' : 'bg-zinc-600'}`}></span>
                  </span>
                  <span className={`text-[10px] uppercase font-bold tracking-widest ${isAgentActive ? 'text-gold' : 'text-zinc-500'}`}>
                    {isAgentActive ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-end border-t border-white/5 pt-3">
                <div>
                  <p className="text-2xl font-light text-white tracking-tight">System <span className={isAgentActive ? "text-gold font-bold" : "text-zinc-500 font-bold"}>{isAgentActive ? 'Stable' : 'Standby'}</span></p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Uptime: {statusData.uptime}</p>
                </div>
                <div className="text-[10px] font-mono text-right">
                  <p className="text-zinc-500 uppercase">{statusData.date}</p>
                  <p className="text-gold/80">LATENCY: {statusData.latencyMs ? `${statusData.latencyMs}ms` : '--ms'}</p>
                </div>
              </div>
            </div>

            {/* Model Intelligence Usage */}
            <div className="glass-panel flex-1 p-7 flex flex-col gap-4 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-gold/70">Daily API Request Quota</h3>
                <span className="text-[10px] font-mono text-zinc-500">RESET: {resetIn}</span>
              </div>
              <div className="flex items-center gap-12 flex-1">
                <div className="relative w-20 h-20">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle className="text-white/5" cx="50" cy="50" fill="none" r="42" stroke="currentColor" strokeWidth="8"></circle>
                    <circle className="text-gold gold-glow" cx="50" cy="50" fill="none" r="42" stroke="currentColor" strokeDasharray="264" strokeDashoffset={ringOffset} strokeLinecap="round" strokeWidth="8" style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}></circle>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[11px] font-bold text-white tracking-wider">{requestsToday}/{dailyQuota}</span>
                  </div>
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-tighter">Requests Used</span>
                    <span className="text-xs font-mono text-white">{requestsToday} units</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-gold/50 to-gold rounded-full" style={{ width: `${quotaPercentage}%`, transition: 'width 1s ease-in-out' }}></div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="px-2 py-1 rounded bg-gold/5 border border-gold/10 text-[8px] text-gold font-bold uppercase tracking-widest w-fit">Cloud: OpenRouter (Gemini 2.x)</div>
                    <div className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[8px] text-zinc-500 font-bold uppercase tracking-widest w-fit">Local: CasaOS Ollama (nomic-embed)</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 flex gap-8 min-h-0">
            <div className="flex-1 flex flex-col gap-8 min-w-0">
              {/* Memories Visualizer - Live Pinecone Graph */}
              <MemoryGraphPanel />

              {/* System Diagnostics Log */}
              <div className="h-72 glass-panel !bg-black/60 !rounded-[20px] flex flex-col overflow-hidden shrink-0 border-gold/10">
                <div className="bg-black/40 px-6 py-2.5 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-xs text-gold">terminal</span>
                    <span className="text-[9px] text-gold/60 font-mono uppercase tracking-[0.3em] font-bold">System Diagnostics Log</span>
                  </div>
                  <div className="flex items-center gap-6 text-[9px] font-mono text-zinc-600 uppercase tracking-tighter">
                    <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-gold/40 animate-pulse"></span> Stream_Active</span>
                    <span>{liveLogs.length} entries</span>
                  </div>
                </div>
                <div className="p-4 overflow-y-auto font-mono text-[11px] leading-relaxed flex-1 bg-gradient-to-b from-transparent to-black/20">
                  {liveLogs.length === 0 && (
                    <div className="flex gap-4 mb-1">
                      <span className="text-zinc-700">--:--:--</span>
                      <span className="text-gold/60 italic">Connecting to IRIS log stream...</span>
                    </div>
                  )}
                  {liveLogs.map((log, i) => (
                    <LogItem key={i} entry={log} color={getLevelColor(log.level)} />
                  ))}
                  <div ref={logsEndRef} />
                </div>
              </div>
            </div>


            {/* IRIS Uplink - Native Chat Interface */}
            <div className="glass-panel flex-1 flex flex-col overflow-hidden relative min-h-0">
              {/* Header */}
              <div className="p-6 flex items-center justify-between border-b border-white/5 bg-white/5 shrink-0">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-gold gold-glow">forum</span>
                  <h2 className="text-sm font-bold text-white tracking-[0.2em] uppercase">IRIS Uplink</h2>
                </div>
                <div className="flex items-center gap-2">
                  {isGenerating ? (
                    <>
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-gold"></span>
                      </span>
                      <span className="text-[9px] font-mono text-gold uppercase tracking-widest">Processing</span>
                    </>
                  ) : (
                    <>
                      <span className="flex h-2 w-2 relative">
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                      <span className="text-[9px] font-mono text-green-400 uppercase tracking-widest">Ready</span>
                    </>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-gradient-to-b from-transparent to-black/20">
                {chatMessages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full gap-3 opacity-40">
                    <span className="material-symbols-outlined text-gold text-4xl">forum</span>
                    <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">No history. Send a message to begin.</p>
                  </div>
                )}
                {chatMessages.map((msg) => (
                  <ChatMessageItem key={msg.id} msg={msg} />
                ))}
                <div ref={chatEndRef} />
              </div>


              {/* Typing Indicator */}
              <AnimatePresence>
                {isGenerating && (
                  <motion.div 
                    key="typing-indicator"
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="flex gap-4 px-6 pb-2"
                  >
                    <div className="w-8 h-8 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-gold text-sm">face_3</span>
                    </div>
                    <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-2xl rounded-tl-none px-4 py-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-gold/70" style={{ animation: 'wave 1.2s ease-in-out infinite', animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-gold/70" style={{ animation: 'wave 1.2s ease-in-out infinite', animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-gold/70" style={{ animation: 'wave 1.2s ease-in-out infinite', animationDelay: '300ms' }} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Slash Command Popup */}
              <AnimatePresence>
                {chatInput.startsWith('/') && !isGenerating && (() => {
                  const filtered = SLASH_COMMANDS.filter(c => c.cmd.startsWith(chatInput.split(' ')[0].toLowerCase()));
                  if (filtered.length === 0) return null;
                  return (
                    <motion.div 
                      key="slash-command-popup"
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.98 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className="mx-4 mb-2 rounded-2xl overflow-hidden border border-white/10 bg-zinc-950/95 shadow-xl backdrop-blur-md"
                    >
                      {filtered.map(({ cmd, desc }) => (
                        <button
                          key={cmd}
                          onMouseDown={e => { e.preventDefault(); setChatInput(cmd + ' '); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left group"
                        >
                          <span className="w-6 h-6 rounded-full bg-gold/20 text-gold text-[11px] font-bold flex items-center justify-center shrink-0 group-hover:bg-gold group-hover:text-black transition-colors">
                            I
                          </span>
                          <span className="text-sm font-mono font-semibold text-gold/90">{cmd}</span>
                          <span className="text-xs text-zinc-500">{desc}</span>
                        </button>
                      ))}
                    </motion.div>
                  );
                })()}
              </AnimatePresence>

              {/* Input */}
              <div className="p-4 border-t border-white/5 bg-black/40 shrink-0">
                <div className="relative flex items-center gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Tab' && chatInput.startsWith('/')) {
                        const filtered = SLASH_COMMANDS.filter(c => c.cmd.startsWith(chatInput.split(' ')[0].toLowerCase()));
                        if (filtered.length > 0) {
                          e.preventDefault();
                          setChatInput(filtered[0].cmd + ' ');
                        }
                      }
                      if (e.key === 'Enter' && !e.shiftKey) { 
                        e.preventDefault(); 
                        sendMessage(); 
                      } 
                    }}
                    disabled={isGenerating}
                    placeholder={isGenerating ? 'IRIS is responding...' : 'Transmit message or type / for commands...'}
                    className="flex-1 bg-white/5 border border-white/10 rounded-full px-5 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-gold/30 focus:ring-1 focus:ring-gold/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={isGenerating || !chatInput.trim()}
                    className="w-10 h-10 shrink-0 rounded-full bg-gold/20 text-gold flex items-center justify-center hover:bg-gold hover:text-black transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-gold/20 disabled:hover:text-gold"
                  >
                    {isGenerating
                      ? <span className="w-3.5 h-3.5 border-2 border-gold/50 border-t-gold rounded-full animate-spin" />
                      : <span className="material-symbols-outlined text-sm">send</span>
                    }
                  </button>
                </div>
              </div>
            </div>



          </div>
        </div>
        
        {/* Right Sidebar */}
        <div className="w-[420px] flex flex-col gap-8 shrink-0 min-h-0 h-full">
          {/* Server Cluster Health */}
          <div className="glass-panel p-8 flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-gold/70">MCP Server Health</h3>
              <span className="material-symbols-outlined text-gold/40 text-sm">monitoring</span>
            </div>
            <div className={`grid grid-cols-2 lg:grid-cols-3 gap-4 ${mcpLoading ? 'opacity-50 pointer-events-none' : ''}`}>
              {Object.entries(mcpServers).map(([name, info]: [string, McpServerInfo]) => {
                const isOnline = info.status === 'online';
                const isConnecting = info.status === 'connecting';
                
                return (
                  <div 
                    key={name}
                    onClick={() => toggleMcpServer(name)}
                    className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/5 border border-white/10 relative hover:border-gold/30 hover:bg-white/10 transition-all group cursor-pointer"
                  >
                    <div className={`absolute top-3 right-3 w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]' : isConnecting ? 'bg-yellow-500 animate-pulse' : 'bg-red-500/50'} transition-all`}></div>
                    
                    {/* Icon based on server name or generic */}
                    {name === 'notebooklm' ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`w-8 h-8 ${isOnline ? 'text-gold' : 'text-zinc-600'} transition-colors mb-2`}>
                        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                        <path d="M8 7h6" />
                        <path d="M8 11h8" />
                        <path d="M8 15h6" />
                      </svg>
                    ) : name === 'zapier' ? (
                      <svg viewBox="0 0 24 24" fill="currentColor" className={`w-8 h-8 ${isOnline ? 'text-gold' : 'text-zinc-600'} transition-colors mb-2`}>
                        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={`w-8 h-8 ${isOnline ? 'text-gold' : 'text-zinc-600'} transition-colors mb-2`}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
                      </svg>
                    )}
                    
                    <span className={`text-[9px] font-mono ${isOnline ? 'text-zinc-300' : 'text-zinc-600'} truncate w-full text-center transition-colors`}>{name}</span>
                    <span className="text-[8px] text-zinc-600 mt-1 uppercase tracking-widest">{info.disabled ? 'Disabled' : info.tools + ' tools'}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="glass-panel flex-1 flex flex-col overflow-hidden min-h-0">
            <div className="p-7 border-b border-white/5 bg-white/5 flex justify-between items-center">
              <h2 className="text-[10px] font-bold tracking-[0.2em] text-gold uppercase flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">database</span>
                Short-Term Memory (SQLite)
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {memory.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full opacity-20 py-20">
                  <span className="material-symbols-outlined text-4xl mb-2">inventory_2</span>
                  <p className="text-[10px] uppercase tracking-widest font-mono">No Records Found</p>
                </div>
              ) : (
                memory.map((item) => (
                  <div key={item.id} className={`p-4 rounded-2xl border transition-all cursor-pointer group ${item.role === 'user' ? 'bg-gold/5 border-gold/10 hover:border-gold/30' : 'bg-white/5 border-white/5 hover:border-gold/10'}`}>
                    <div className="flex justify-between mb-2">
                      <span className={`text-[9px] font-mono uppercase ${item.role === 'user' ? 'text-gold/60' : 'text-zinc-500'}`}>ID: 0x{item.id.toString(16).toUpperCase().padStart(4, '0')}</span>
                      <span className={`text-[9px] font-bold tracking-widest uppercase ${item.role === 'user' ? 'text-gold' : 'text-zinc-400'}`}>
                        {item.role === 'user' ? 'INPUT' : 'RESPONSE'}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed line-clamp-3 group-hover:line-clamp-none transition-all">{item.content}</p>
                    <div className="mt-3 text-[9px] text-zinc-500 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[10px]">schedule</span> {timeAgo(item.timestamp)}
                    </div>
                  </div>
                ))
              )}
              <div ref={memoryEndRef} />
            </div>
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="glass-panel w-[500px] p-8 flex flex-col gap-6 animate-modal">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <h2 className="text-lg font-bold text-white tracking-widest uppercase flex items-center gap-2">
                <span className="material-symbols-outlined text-gold">settings</span>
                System Settings
              </h2>
              <button onClick={() => setIsSettingsOpen(false)} className="text-zinc-400 hover:text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="space-y-4">
              {[
                'OPENROUTER_API_KEY', 
                'OPENROUTER_MODEL',
                'TELEGRAM_BOT_TOKEN', 
                'TELEGRAM_USER_ID',
                'PINECONE_API_KEY', 
                'OLLAMA_BASE_URL',
                'TIMEZONE'
              ].map((key) => {
                const isPassword = ['OPENROUTER_API_KEY', 'TELEGRAM_BOT_TOKEN', 'PINECONE_API_KEY'].includes(key);
                return (
                  <div key={key}>
                    <label className="block text-xs font-bold text-gold/70 uppercase tracking-wider mb-2">{key.replace(/_/g, ' ')}</label>
                    <div className="relative flex items-center">
                      <input 
                        type={isPassword && !passwordVis[key] ? "password" : "text"} 
                        value={settingsState[key] || ''}
                        onChange={(e) => setSettingsState({ ...settingsState, [key]: e.target.value })}
                        disabled={settingsLoading}
                        className={`w-full bg-black/40 border border-gold/10 rounded-xl p-3 ${isPassword ? 'pr-10' : ''} text-sm text-zinc-300 focus:outline-none focus:border-gold/30 focus:ring-1 focus:ring-gold/10 font-mono ${settingsLoading ? 'opacity-50' : ''}`} 
                      />
                      {isPassword && (
                        <button 
                          onClick={() => toggleVis(key)}
                          className="absolute right-3 text-zinc-500 hover:text-gold transition-colors flex items-center justify-center bg-transparent border-none p-0 focus:outline-none"
                        >
                          <span className="material-symbols-outlined text-[18px]">{passwordVis[key] ? 'visibility_off' : 'visibility'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              <div>
                <label className="block text-xs font-bold text-gold/70 uppercase tracking-wider mb-2">MEMORY_VISUALIZER_LIMIT</label>
                <div className="flex items-center gap-4">
                  <input type="range" className="flex-1 accent-gold" min="20" max="500" step="10"
                    defaultValue={100}
                    onChange={async (e) => {
                      const val = parseInt(e.target.value, 10);
                      // Show live value
                      const label = e.target.parentElement?.querySelector('span');
                      if (label) label.textContent = `${val} nodes`;
                      // Save to backend
                      await fetch(`${API_BASE}/api/settings`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ MEMORY_VISUALIZER_LIMIT: String(val) })
                      });
                    }}
                  />
                  <span className="text-xs font-mono text-zinc-400 w-16 text-right">100 nodes</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-red-500/70 uppercase tracking-wider mb-2">Cognitive Memory Rebirth</label>
                <div className="flex items-center gap-4">
                  <button 
                    data-step="0"
                    onClick={async (e) => {
                      const btn = e.currentTarget;
                      const step = parseInt(btn.getAttribute('data-step') || '0', 10);
                      
                      if (step === 0) {
                        btn.innerHTML = '<span class="material-symbols-outlined text-sm">warning</span> Are you sure?';
                        btn.setAttribute('data-step', '1');
                        return;
                      }
                      
                      if (step === 1) {
                        btn.innerHTML = '<span class="material-symbols-outlined text-sm">skull</span> REALLY WIPE EVERYTHING?';
                        btn.setAttribute('data-step', '2');
                        btn.classList.replace('bg-red-500/10', 'bg-red-600');
                        btn.classList.replace('hover:bg-red-500/20', 'hover:bg-red-500');
                        btn.classList.replace('text-red-500', 'text-white');
                        btn.classList.add('shadow-[0_0_15px_rgba(220,38,38,0.5)]');
                        return;
                      }

                      btn.innerHTML = 'Wiping Cognitive State...';
                      btn.disabled = true;
                      btn.classList.replace('bg-red-600', 'bg-zinc-800');
                      
                      try {
                        const res = await fetch(`${API_BASE}/api/memory/pinecone/wipe`, { method: 'DELETE' });
                        if (res.ok) {
                          btn.innerHTML = '<span class="material-symbols-outlined text-sm">check</span> Identity Reset Complete';
                          btn.classList.replace('bg-zinc-800', 'bg-green-500/20');
                          btn.classList.replace('text-white', 'text-green-500');
                          btn.classList.replace('border-red-500/30', 'border-green-500/30');
                        } else {
                          btn.innerHTML = 'Reset Failed';
                        }
                      } catch (err) {
                        btn.innerHTML = 'Reset Failed';
                      }
                      
                      setTimeout(() => {
                        window.location.reload();
                      }, 1500);
                    }}
                    className="flex-1 py-3 px-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 rounded-xl text-xs font-bold tracking-wider uppercase transition-all flex justify-center items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm">delete_forever</span>
                    Erase Pinecone Vector Memory
                  </button>
                  <p className="text-[9px] text-zinc-500 font-mono flex-1 leading-relaxed">
                    WARNING: This irrecoverably deletes all long-term factual memories (names, preferences, context) learned by IRIS across all temporal sessions. 
                  </p>
                </div>
              </div>
              
              <div className="pt-4 flex justify-end border-t border-white/10 mt-6 pt-6">
                <button 
                  onClick={async (e) => {
                    const btn = e.currentTarget;
                    btn.innerText = 'Saving...';
                    btn.disabled = true;
                    const updates = { 
                      OPENROUTER_API_KEY: settingsState.OPENROUTER_API_KEY || '',
                      TELEGRAM_BOT_TOKEN: settingsState.TELEGRAM_BOT_TOKEN || '',
                      PINECONE_API_KEY: settingsState.PINECONE_API_KEY || '',
                      OLLAMA_BASE_URL: settingsState.OLLAMA_BASE_URL || ''
                    };
                    const success = await saveSettings(updates);
                    if (success) {
                      btn.innerHTML = '<span class="material-symbols-outlined text-sm">check</span> Configuration Saved';
                      btn.classList.add('bg-green-500/20', 'text-green-500', 'border-green-500/30');
                      btn.classList.remove('bg-gold/10', 'text-gold', 'border-gold/30', 'hover:bg-gold/20');
                      setTimeout(() => setIsSettingsOpen(false), 800);
                    } else {
                      btn.innerText = 'Save Failed';
                      btn.disabled = false;
                    }
                  }}
                  className="px-6 py-2 bg-gold/10 hover:bg-gold/20 text-gold border border-gold/30 rounded-full text-sm font-bold tracking-wider uppercase transition-all flex items-center gap-2"
                >
                  Save Configuration
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Persona Modal */}
      {isPersonaOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="glass-panel w-[600px] p-6 flex flex-col gap-6 animate-modal !bg-[#111111]/95 border-gold/20 shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <h2 className="text-base font-bold text-white tracking-widest uppercase flex items-center gap-2">
                <span className="material-symbols-outlined text-gold">face_3</span>
                IRIS PERSONA CONFIGURATION
              </h2>
              <button onClick={() => setIsPersonaOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gold/80 uppercase tracking-wider mb-2">IRIS PERSONALITY</label>
                <textarea 
                  className={`w-full h-56 bg-[#0a0a0a] border border-white/5 rounded-xl p-4 text-sm text-zinc-300 focus:outline-none focus:border-gold/30 focus:ring-1 focus:ring-gold/10 resize-none font-mono leading-relaxed ${personaLoading ? 'opacity-50' : ''}`}
                  value={personaTextState}
                  onChange={(e) => setPersonaTextState(e.target.value)}
                  disabled={personaLoading}
                ></textarea>
              </div>
              <div className="pt-2 flex justify-end">
                <button 
                  onClick={async (e) => {
                    const btn = e.currentTarget;
                    const originalText = btn.innerText;
                    btn.innerText = 'SAVING...';
                    btn.disabled = true;
                    const success = await savePersona(personaTextState);
                    if (success) {
                      btn.innerHTML = '<span class="material-symbols-outlined text-sm">check</span> SAVED';
                      btn.classList.add('bg-green-500/10', 'text-green-500', 'border-green-500/30');
                      btn.classList.remove('bg-transparent', 'text-gold', 'border-gold/30', 'hover:bg-gold/10');
                      setTimeout(() => setIsPersonaOpen(false), 800);
                    } else {
                      btn.innerText = 'SAVE FAILED';
                      btn.disabled = false;
                    }
                  }}
                  className="px-6 py-2.5 bg-transparent hover:bg-gold/10 text-gold border border-gold/30 rounded-full text-[11px] font-bold tracking-widest uppercase transition-all flex items-center gap-2"
                >
                  SAVE PERSONA
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
