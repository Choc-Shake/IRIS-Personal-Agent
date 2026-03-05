/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';

export default function App() {
  const [isAgentActive, setIsAgentActive] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPersonaOpen, setIsPersonaOpen] = useState(false);

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
        <div className="flex items-center gap-6 w-1/3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold-dark to-gold flex items-center justify-center shadow-lg shadow-gold/20">
            <span className="material-symbols-outlined text-black font-bold">aq</span>
          </div>
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
            onClick={() => setIsPersonaOpen(true)}
            className="relative w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-gold/10 hover:text-gold hover:border-gold/30 transition-all text-zinc-400"
          >
            <span className="material-symbols-outlined">face_3</span>
            <span className="material-symbols-outlined absolute -bottom-1.5 -right-1.5 text-[14px] text-gold bg-[#0D0E12] rounded-full border border-gold/20 p-[1px]">menu_book</span>
          </button>

          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-gold/10 hover:text-gold hover:border-gold/30 transition-all text-zinc-400"
          >
            <span className="material-symbols-outlined">settings</span>
          </button>
          <button 
            onClick={() => setIsAgentActive(!isAgentActive)}
            className={`flex items-center gap-3 pl-4 pr-1 py-1 rounded-full border transition-all duration-300 ${
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
      
      <main className="flex-1 p-8 flex gap-8 overflow-hidden">
        <div className="flex-1 flex flex-col gap-8 min-w-0">
          <div className="flex gap-8 h-40 shrink-0">
            {/* Agent Identity */}
            <div className="glass-panel flex-1 p-8 flex flex-col justify-between overflow-hidden relative group">
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-gold/10 rounded-full blur-3xl transition-all group-hover:bg-gold/20"></div>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-gold/60 font-medium font-mono">Agent Identity</p>
                  <h2 className="text-lg font-bold text-white mt-1 uppercase">Gemini 3.1 Pro</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-gold"></span>
                  </span>
                  <span className="text-[10px] uppercase font-bold text-gold tracking-widest">Online</span>
                </div>
              </div>
              <div className="flex justify-between items-end border-t border-white/5 pt-3">
                <div>
                  <p className="text-2xl font-light text-white tracking-tight">System <span className="text-gold font-bold">Stable</span></p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Uptime: 142h 12m</p>
                </div>
                <div className="text-[10px] font-mono text-right">
                  <p className="text-zinc-500 uppercase">Oct 24, 2024</p>
                  <p className="text-gold/80">LATENCY: 14ms</p>
                </div>
              </div>
            </div>

            {/* Model Intelligence Usage */}
            <div className="glass-panel flex-1 p-7 flex flex-col gap-4 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-gold/70">Model Intelligence Usage</h3>
                <span className="text-[10px] font-mono text-zinc-500">AVG: 84 TOKENS/SEC</span>
              </div>
              <div className="flex items-center gap-12 flex-1">
                <div className="relative w-20 h-20">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle className="text-white/5" cx="50" cy="50" fill="none" r="42" stroke="currentColor" strokeWidth="8"></circle>
                    <circle className="text-gold gold-glow" cx="50" cy="50" fill="none" r="42" stroke="currentColor" strokeDasharray="264" strokeDashoffset="66" strokeLinecap="round" strokeWidth="8"></circle>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold text-white">75%</span>
                  </div>
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-tighter">Quota Remaining</span>
                    <span className="text-xs font-mono text-white">17,204 units</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-gold/50 to-gold w-[75%] rounded-full"></div>
                  </div>
                  <div className="flex gap-2">
                    <div className="px-2 py-1 rounded bg-gold/5 border border-gold/10 text-[8px] text-gold font-bold">ACTIVE: GPT-4o</div>
                    <div className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[8px] text-zinc-500 font-bold uppercase tracking-tight">Standby: Claude-3</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 flex gap-8 min-h-0">
            <div className="flex-1 flex flex-col gap-8 min-w-0">
              {/* Memories Visualizer */}
              <div className="glass-panel flex-1 flex flex-col overflow-hidden relative">
                <div className="p-8 flex items-center justify-between border-b border-white/5 bg-white/5">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-gold gold-glow">hub</span>
                    <h2 className="text-sm font-bold text-white tracking-[0.2em] uppercase">Memories Visualizer</h2>
                  </div>
                  <div className="relative w-1/2">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gold/50 text-sm">search</span>
                    <input className="w-full bg-black/40 border border-gold/10 rounded-full pl-9 pr-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-gold/30 focus:ring-1 focus:ring-gold/10 transition-all" placeholder="Search cognitive memory nodes..." type="text" />
                  </div>
                  <div className="flex gap-2">
                    <button className="p-2 rounded-lg bg-white/5 hover:bg-gold/10 text-zinc-400 hover:text-gold transition-colors">
                      <span className="material-symbols-outlined text-sm">filter_list</span>
                    </button>
                    <button className="p-2 rounded-lg bg-white/5 hover:bg-gold/10 text-zinc-400 hover:text-gold transition-colors">
                      <span className="material-symbols-outlined text-sm">zoom_in</span>
                    </button>
                  </div>
                </div>
                <div className="flex-1 relative bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.06),transparent_70%)]">
                  <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <radialGradient cx="50%" cy="50%" id="nodeGlow" r="50%">
                        <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.4"></stop>
                        <stop offset="100%" stopColor="#D4AF37" stopOpacity="0"></stop>
                      </radialGradient>
                    </defs>
                    <line stroke="rgba(212, 175, 55, 0.2)" strokeDasharray="8 8" strokeWidth="1.5" x1="50%" x2="30%" y1="50%" y2="30%"></line>
                    <line stroke="rgba(212, 175, 55, 0.2)" strokeDasharray="8 8" strokeWidth="1.5" x1="50%" x2="70%" y1="50%" y2="35%"></line>
                    <line stroke="rgba(212, 175, 55, 0.2)" strokeDasharray="8 8" strokeWidth="1.5" x1="50%" x2="65%" y1="50%" y2="70%"></line>
                    <line stroke="rgba(212, 175, 55, 0.2)" strokeDasharray="8 8" strokeWidth="1.5" x1="50%" x2="25%" y1="50%" y2="65%"></line>
                    <line stroke="rgba(212, 175, 55, 0.2)" strokeDasharray="8 8" strokeWidth="1.5" x1="50%" x2="45%" y1="50%" y2="75%"></line>
                    <circle cx="50%" cy="50%" fill="url(#nodeGlow)" r="25"></circle>
                    <circle cx="50%" cy="50%" fill="#D4AF37" r="10"></circle>
                    <text className="uppercase tracking-widest" dy="32" fill="#D4AF37" fontSize="11" fontWeight="700" textAnchor="middle" x="50%" y="50%">Core Identity</text>
                    <circle className="gold-glow" cx="30%" cy="30%" fill="#D4AF37" r="6"></circle>
                    <text dy="-18" fill="#ffffff" fontSize="10" textAnchor="middle" x="30%" y="30%">PROJECT_PHOENIX</text>
                    <circle className="gold-glow" cx="70%" cy="35%" fill="#D4AF37" r="6"></circle>
                    <text dy="-18" fill="#ffffff" fontSize="10" textAnchor="middle" x="70%" y="35%">USER_PREFERENCES</text>
                    <circle className="gold-glow" cx="65%" cy="70%" fill="#D4AF37" r="5"></circle>
                    <text dy="22" fill="#ffffff" fontSize="10" textAnchor="middle" x="65%" y="70%">TECHNICAL_STACK</text>
                    <circle className="gold-glow" cx="25%" cy="65%" fill="#D4AF37" r="5"></circle>
                    <text dy="22" fill="#ffffff" fontSize="10" textAnchor="middle" x="25%" y="65%">HISTORICAL_QUERY</text>
                    <circle className="gold-glow" cx="45%" cy="75%" fill="#D4AF37" r="4"></circle>
                    <text dy="18" fill="#ffffff" fontSize="9" textAnchor="middle" x="45%" y="75%">NEURAL_WEAVE</text>
                  </svg>
                </div>
              </div>

              {/* System Diagnostics Log */}
              <div className="h-44 glass-panel !bg-black/60 !rounded-[20px] flex flex-col overflow-hidden shrink-0 border-gold/10">
                <div className="bg-black/40 px-6 py-2.5 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-xs text-gold">terminal</span>
                    <span className="text-[9px] text-gold/60 font-mono uppercase tracking-[0.3em] font-bold">System Diagnostics Log</span>
                  </div>
                  <div className="flex items-center gap-6 text-[9px] font-mono text-zinc-600 uppercase tracking-tighter">
                    <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-gold/40 animate-pulse"></span> Stream_Active</span>
                    <span>Protocol: SSH_SECURE_v2.0</span>
                  </div>
                </div>
                <div className="p-4 overflow-y-auto font-mono text-[11px] leading-relaxed flex-1 bg-gradient-to-b from-transparent to-black/20">
                  <div className="flex gap-4 mb-1">
                    <span className="text-zinc-700">14:02:11</span>
                    <span className="text-gold/80">[SYSTEM]</span>
                    <span className="text-amber-text/70 italic">Establishing secure hypervisor handshake... success.</span>
                  </div>
                  <div className="flex gap-4 mb-1">
                    <span className="text-zinc-700">14:02:12</span>
                    <span className="text-gold/80">[CORE]</span>
                    <span className="text-amber-text/70">Neural engine attached to PID 4402 (Gold Priority)</span>
                  </div>
                  <div className="flex gap-4 mb-1">
                    <span className="text-zinc-700">14:02:14</span>
                    <span className="text-gold/80">[SCAN]</span>
                    <span className="text-amber-text/70">Relational inconsistencies resolved in Vector Store #4.</span>
                  </div>
                  <div className="flex gap-4 mb-1">
                    <span className="text-zinc-700">14:05:22</span>
                    <span className="text-gold/80">[SYNC]</span>
                    <span className="text-amber-text/70">Cluster 'Aura-Primary' status set to NOMINAL.</span>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-zinc-700">14:08:44</span>
                    <span className="text-gold/80">[WAIT]</span>
                    <span className="text-amber-text/70 flex items-center gap-1">Listening for executive command inputs<span className="w-1.5 h-3 bg-gold animate-pulse ml-1"></span></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Chatbot Interface */}
            <div className="glass-panel flex-1 flex flex-col overflow-hidden relative">
              <div className="p-6 flex items-center justify-between border-b border-white/5 bg-white/5 shrink-0">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-gold gold-glow">forum</span>
                  <h2 className="text-sm font-bold text-white tracking-[0.2em] uppercase">Agent Comm-Link</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-gold"></span>
                  </span>
                  <span className="text-[9px] font-mono text-gold uppercase tracking-widest">Listening</span>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-transparent to-black/20">
                {/* Agent Message */}
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-gold text-sm">smart_toy</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-[10px] font-bold text-gold uppercase tracking-wider">IRIS Core</span>
                      <span className="text-[9px] font-mono text-zinc-600">14:08:44</span>
                    </div>
                    <p className="text-sm text-zinc-300 leading-relaxed">System diagnostics complete. All clusters operating at nominal capacity. How may I assist you today, Administrator?</p>
                  </div>
                </div>
                
                {/* User Message */}
                <div className="flex gap-4 flex-row-reverse">
                  <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-zinc-400 text-sm">person</span>
                  </div>
                  <div className="flex-1 flex flex-col items-end">
                    <div className="flex items-baseline gap-2 mb-1 flex-row-reverse">
                      <span className="text-[10px] font-bold text-white uppercase tracking-wider">Administrator</span>
                      <span className="text-[9px] font-mono text-zinc-600">14:12:05</span>
                    </div>
                    <p className="text-sm text-zinc-300 leading-relaxed bg-white/5 p-3 rounded-2xl rounded-tr-none border border-white/5">Please analyze the recent latency spikes in the Graph Cluster.</p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 border-t border-white/5 bg-black/40 shrink-0">
                <div className="relative flex items-center">
                  <button className="absolute left-3 text-zinc-500 hover:text-gold transition-colors">
                    <span className="material-symbols-outlined text-xl">mic</span>
                  </button>
                  <input 
                    type="text" 
                    placeholder="Transmit message to IRIS..." 
                    className="w-full bg-white/5 border border-white/10 rounded-full pl-11 pr-12 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-gold/30 focus:ring-1 focus:ring-gold/10 transition-all"
                  />
                  <button className="absolute right-2 w-8 h-8 rounded-full bg-gold/20 text-gold flex items-center justify-center hover:bg-gold hover:text-black transition-all">
                    <span className="material-symbols-outlined text-sm">send</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-[420px] flex flex-col gap-8 shrink-0">
          {/* Server Cluster Health */}
          <div className="glass-panel p-8 flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-gold/70">Server Cluster Health</h3>
              <span className="material-symbols-outlined text-gold/40 text-sm">monitoring</span>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-gold gold-glow"></span> Core Engine
                  </span>
                  <span className="text-[10px] font-mono text-gold">98%</span>
                </div>
                <div className="flex gap-1.5">
                  <div className="flex-1 h-1 rounded-full bg-gold"></div>
                  <div className="flex-1 h-1 rounded-full bg-gold"></div>
                  <div className="flex-1 h-1 rounded-full bg-gold"></div>
                  <div className="flex-1 h-1 rounded-full bg-gold"></div>
                  <div className="flex-1 h-1 rounded-full bg-gold/10"></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-gold gold-glow"></span> Vector Node
                  </span>
                  <span className="text-[10px] font-mono text-gold">72%</span>
                </div>
                <div className="flex gap-1.5">
                  <div className="flex-1 h-1 rounded-full bg-gold"></div>
                  <div className="flex-1 h-1 rounded-full bg-gold"></div>
                  <div className="flex-1 h-1 rounded-full bg-gold"></div>
                  <div className="flex-1 h-1 rounded-full bg-gold/10"></div>
                  <div className="flex-1 h-1 rounded-full bg-gold/10"></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-gold gold-glow"></span> Graph Cluster
                  </span>
                  <span className="text-[10px] font-mono text-gold">45%</span>
                </div>
                <div className="flex gap-1.5">
                  <div className="flex-1 h-1 rounded-full bg-gold"></div>
                  <div className="flex-1 h-1 rounded-full bg-gold"></div>
                  <div className="flex-1 h-1 rounded-full bg-gold/10"></div>
                  <div className="flex-1 h-1 rounded-full bg-gold/10"></div>
                  <div className="flex-1 h-1 rounded-full bg-gold/10"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="glass-panel flex-1 flex flex-col overflow-hidden">
            <div className="p-7 border-b border-white/5 bg-white/5 flex justify-between items-center">
              <h2 className="text-[10px] font-bold tracking-[0.2em] text-gold uppercase flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">mark_chat_unread</span>
                Recent Activity
              </h2>
              <span className="text-[9px] font-mono text-zinc-600">3 TOTAL</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="p-4 rounded-2xl bg-gold/5 border border-gold/10 hover:border-gold/30 transition-all cursor-pointer group">
                <div className="flex justify-between mb-2">
                  <span className="text-[9px] font-mono text-gold/60 uppercase">Node: 0x9482</span>
                  <span className="text-[9px] font-bold text-gold tracking-widest">ACTIVE</span>
                </div>
                <p className="text-xs text-white leading-relaxed">Optimization of neural weights for task-specific reasoning modules initiated by root.</p>
                <div className="mt-3 text-[9px] text-zinc-500 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[10px]">schedule</span> 2m ago
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-gold/10 transition-all cursor-pointer">
                <div className="flex justify-between mb-2">
                  <span className="text-[9px] font-mono text-zinc-500 uppercase">Node: 0x822A</span>
                  <span className="text-[9px] text-zinc-600 tracking-widest">STORED</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">User requested summary of Q3 financial statements and projections from internal docs.</p>
                <div className="mt-3 text-[9px] text-zinc-500 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[10px]">schedule</span> 14m ago
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-gold/10 transition-all cursor-pointer">
                <div className="flex justify-between mb-2">
                  <span className="text-[9px] font-mono text-zinc-500 uppercase">Node: 0x711C</span>
                  <span className="text-[9px] text-zinc-600 tracking-widest">ARCHIVED</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">System architecture review completed. Redis latency identified as bottleneck in cluster-1.</p>
                <div className="mt-3 text-[9px] text-zinc-500 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[10px]">schedule</span> 1h ago
                </div>
              </div>
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
              <div>
                <label className="block text-xs font-bold text-gold/70 uppercase tracking-wider mb-2">GEMINI_API_KEY</label>
                <input type="password" placeholder="AIzaSy..." className="w-full bg-black/40 border border-gold/10 rounded-xl p-3 text-sm text-zinc-300 focus:outline-none focus:border-gold/30 focus:ring-1 focus:ring-gold/10 font-mono" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gold/70 uppercase tracking-wider mb-2">VECTOR_DB_URL</label>
                <input type="text" placeholder="https://..." className="w-full bg-black/40 border border-gold/10 rounded-xl p-3 text-sm text-zinc-300 focus:outline-none focus:border-gold/30 focus:ring-1 focus:ring-gold/10 font-mono" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gold/70 uppercase tracking-wider mb-2">REDIS_ENDPOINT</label>
                <input type="text" placeholder="redis://..." className="w-full bg-black/40 border border-gold/10 rounded-xl p-3 text-sm text-zinc-300 focus:outline-none focus:border-gold/30 focus:ring-1 focus:ring-gold/10 font-mono" />
              </div>
              <div className="pt-4 flex justify-end">
                <button onClick={() => setIsSettingsOpen(false)} className="px-6 py-2 bg-gold/10 hover:bg-gold/20 text-gold border border-gold/30 rounded-full text-sm font-bold tracking-wider uppercase transition-all">
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
          <div className="glass-panel w-[600px] p-8 flex flex-col gap-6 animate-modal">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <h2 className="text-lg font-bold text-white tracking-widest uppercase flex items-center gap-2">
                <span className="material-symbols-outlined text-gold">face_3</span>
                Agent Persona Configuration
              </h2>
              <button onClick={() => setIsPersonaOpen(false)} className="text-zinc-400 hover:text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gold/70 uppercase tracking-wider mb-2">Core Directive</label>
                <textarea 
                  className="w-full h-24 bg-black/40 border border-gold/10 rounded-xl p-3 text-sm text-zinc-300 focus:outline-none focus:border-gold/30 focus:ring-1 focus:ring-gold/10 resize-none"
                  defaultValue="You are IRIS, an advanced Intelligent Response & Insight System. You communicate with precision, clarity, and a subtle warmth. You prioritize data accuracy and logical deduction."
                ></textarea>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gold/70 uppercase tracking-wider mb-2">Formality Level</label>
                  <input type="range" className="w-full accent-gold" min="1" max="100" defaultValue="75" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gold/70 uppercase tracking-wider mb-2">Creativity Variance</label>
                  <input type="range" className="w-full accent-gold" min="1" max="100" defaultValue="30" />
                </div>
              </div>
              <div className="pt-4 flex justify-end">
                <button onClick={() => setIsPersonaOpen(false)} className="px-6 py-2 bg-gold/10 hover:bg-gold/20 text-gold border border-gold/30 rounded-full text-sm font-bold tracking-wider uppercase transition-all">
                  Save Persona
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
