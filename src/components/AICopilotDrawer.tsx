/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { ProjectState, Task, Invoice, SafetyIncident, OperationLog } from '../types';
import { formatINR } from '../currency';
import { Sparkles, Bot, Send, X, RefreshCw, AlertTriangle, ShieldCheck, TrendingUp, Calendar, Zap, MessageSquare, Wifi, WifiOff, Cpu, Eye, EyeOff } from 'lucide-react';

// Simple markdown-to-JSX renderer for copilot messages
function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('### ')) {
      elements.push(<h3 key={key++} className="text-xs font-bold text-[#1A1A1A] mt-3 mb-1 uppercase tracking-wider border-b border-[#E5E0D8] pb-1">{renderInline(line.slice(4))}</h3>);
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={key++} className="text-sm font-bold text-[#1A1A1A] mt-3 mb-1">{renderInline(line.slice(3))}</h2>);
    } else if (line.startsWith('**') && line.endsWith('**') && line.length > 4) {
      elements.push(<p key={key++} className="font-bold text-[#1A1A1A] text-xs">{renderInline(line)}</p>);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(<li key={key++} className="text-[11px] leading-relaxed ml-3 flex gap-1.5"><span className="text-[#C5A059] mt-0.5 shrink-0">•</span><span>{renderInline(line.slice(2))}</span></li>);
    } else if (/^\d+\.\s/.test(line)) {
      const num = line.match(/^(\d+)\./)?.[1];
      elements.push(<li key={key++} className="text-[11px] leading-relaxed ml-3 flex gap-1.5"><span className="text-[#C5A059] font-bold shrink-0 font-mono">{num}.</span><span>{renderInline(line.replace(/^\d+\.\s/, ''))}</span></li>);
    } else if (line.trim() === '') {
      elements.push(<div key={key++} className="h-1.5" />);
    } else {
      elements.push(<p key={key++} className="text-[11px] leading-relaxed">{renderInline(line)}</p>);
    }
  }

  return <div className="space-y-0.5">{elements}</div>;
}

function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*.*?\*\*|`.*?`)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let k = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(<span key={k++}>{text.slice(last, match.index)}</span>);
    if (match[0].startsWith('**')) {
      parts.push(<strong key={k++} className="font-bold text-[#1A1A1A]">{match[0].slice(2, -2)}</strong>);
    } else {
      parts.push(<code key={k++} className="bg-[#F4F1EA] px-1 py-0.5 rounded text-[10px] font-mono text-[#C5A059]">{match[0].slice(1, -1)}</code>);
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(<span key={k++}>{text.slice(last)}</span>);
  return parts.length > 0 ? <>{parts}</> : text;
}

interface AICopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  state: {
    tasks: Task[];
    invoices: Invoice[];
    incidents: SafetyIncident[];
    logs: OperationLog[];
    weather: { temp: number; condition: string; wind: number; humidity: number; forecast: string };
  };
  userRole: string;
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  category?: 'briefing' | 'risk' | 'financial' | 'safety' | 'general';
  isAI?: boolean;
  provider?: string;
}

// Build system prompt from live project data
function buildSystemPrompt(state: AICopilotDrawerProps['state'], userRole: string): string {
  const avgProgress = Math.round(state.tasks.reduce((a, b) => a + b.progress, 0) / Math.max(state.tasks.length, 1));
  const totalSpent = state.invoices
    .filter(i => i.status === 'Paid' || i.status === 'Approved')
    .reduce((a, b) => a + b.amount, 0);
  const openIncidents = state.incidents.filter(i => i.status !== 'Resolved');
  const criticalTasks = state.tasks.filter(t => t.priority === 'Critical');
  const delayedTasks = state.tasks.filter(t => t.status === 'Delayed');

  return `You are ConstructIQ Copilot, an expert AI construction project intelligence assistant for a simulated mixed-use commercial tower project.

## Live Site Telemetry (Real-time):
- Overall Progress: ${avgProgress}% physical completion
- Total Project Budget: Use the configured simulated project baseline.
- Spent/Approved: ${formatINR(totalSpent)} (${((totalSpent / 125000000) * 100).toFixed(1)}% of budget)
- CPI: 1.08 (Cost Performance Index – Under Budget)
- Active Tasks: ${state.tasks.filter(t => t.status === 'In Progress').length}/${state.tasks.length} running
- Critical Path: ${criticalTasks.map(t => `${t.name} (${t.progress}%)`).join(', ') || 'None'}
- Delayed Tasks: ${delayedTasks.length === 0 ? 'None' : delayedTasks.map(t => t.name).join(', ')}
- Open Safety Incidents: ${openIncidents.length}
- Safety Days Streak: Use the simulated safety streak.
- Weather: ${state.weather.condition}, ${state.weather.temp}°F, Wind ${state.weather.wind}mph
- Active Personnel: 42 subcontractors on site
- Current User Role: ${userRole}

## Task Status:
${state.tasks.map(t => `- ${t.name}: ${t.progress}% [${t.status}] – ${t.assignedCrew}`).join('\n')}

## Pending Invoices:
- ${state.invoices.filter(i => i.status === 'Pending').length} invoices pending, total: ${formatINR(state.invoices.filter(i => i.status === 'Pending').reduce((a, b) => a + b.amount, 0))}

Provide expert, concise, actionable intelligence tailored to the ${userRole}'s responsibilities.
Format responses with clear markdown (### headers, **bold**, bullet points).
Use ₹ INR for all financial figures. Be precise, professional, site-focused.`;
}

// Fallback local AI response generator (used when AI APIs are unreachable)
function generateLocalResponse(query: string, state: AICopilotDrawerProps['state'], userRole: string): string {
  const q = query.toLowerCase();
  const avgProgress = Math.round(state.tasks.reduce((a, b) => a + b.progress, 0) / Math.max(state.tasks.length, 1));
  const totalSpent = state.invoices.filter(i => i.status === 'Paid' || i.status === 'Approved').reduce((a, b) => a + b.amount, 0);
  const criticalTasks = state.tasks.filter(t => t.priority === 'Critical');
  const openIncidents = state.incidents.filter(i => i.status !== 'Resolved');

  if (q.includes('briefing') || q.includes('executive') || q.includes('summary')) {
    return `### 📋 Daily Executive Site Briefing
**Project:** Simulated Mixed-Use Commercial Tower
**Status:** 🟢 **ON TRACK (${avgProgress}% Physical Milestone Completion)**

1. **Structural Schedule Health:**
   - Critical Path: **${criticalTasks.map(t => t.name).join(', ')}**
   - Framing (T3) at **75%**, concrete decks poured through Level 4.
   - Plumbing & HVAC rough-ins active at 8–15%.

2. **INR Financial Health:**
  - **Total Budget:** Configured simulated baseline | **Disbursed YTD:** ${formatINR(totalSpent)}
   - **CPI:** **1.08 (Under Budget by ~₹34.5 Lakhs)**

3. **EHS Safety:**
  - Zero Lost-Time streak: **Simulated safety streak**
   - Weather: **${state.weather.condition} (${state.weather.temp}°F, Wind: ${state.weather.wind}mph)**
   - Crane operations safe (< 20mph threshold).`;
  }

  if (q.includes('risk') || q.includes('delay') || q.includes('schedule') || q.includes('critical path')) {
    return `### ⚠️ Critical Path & Delay Risk Radar

1. **HVAC & Copper Pipe Supply Lead-Times (Moderate Risk):**
   - **Task T5 (Plumbing Rough-in)** at 8%, dependent on structural slab curing.
   - *Recommendation:* Pre-stage Level 2 copper manifolds to prevent HVAC ductwork collisions.

2. **High Wind Threshold for Tower Crane Lifts:**
   - Current: **${state.weather.wind} mph**. Auto-lock triggers at **20 mph**.
   - *Recommendation:* Schedule heavy lifts 06:00–11:00 morning window.

3. **Subcontractor Crew Utilization:**
   - 42 personnel logged. Ironworkers Local 4 at 100% capacity.`;
  }

  if (q.includes('budget') || q.includes('financial') || q.includes('cost') || q.includes('inr')) {
    return `### 💰 INR Financial Variance & Cashflow Analysis

- **Total Allocated Baseline:** Configured simulated baseline
- **Incurred & Approved Spend:** ${formatINR(totalSpent)}
- **Pending Claims:** ${formatINR(state.invoices.filter(i => i.status === 'Pending').reduce((a, b) => a + b.amount, 0))}

**Cost Saving Insights:**
1. Concrete batching efficiency saved ~₹12.4 Lakhs vs. original estimate.
2. Contingency reserve remaining: **₹1,25,00,000 (100% intact)**.
3. Recommended: Review the pending plumbing invoice before approving material commitments.`;
  }

  if (q.includes('weather') || q.includes('crane') || q.includes('rain') || q.includes('wind')) {
    return `### 🌧️ Weather Impact & Crane Telemetry Advisory

- **Current Condition:** ${state.weather.condition}
- **Temp:** ${state.weather.temp}°F | **Wind:** ${state.weather.wind} mph | **Humidity:** ${state.weather.humidity}%
- **Protocol Status:**
  - ✅ **Tower Crane:** FULL OPERATION (Wind < 20 mph)
  - ✅ **Concrete Curing:** Ideal ambient humidity for 28-day hydration test.
  - ⚠️ **Heat Precautions:** If temp > 85°F, 15-min shade rotation triggers.`;
  }

  if (q.includes('safety') || q.includes('incident') || q.includes('osha') || q.includes('ppe')) {
    return `### 🛡️ EHS Safety & Incident Prevention Advisory

- **Active Cases:** ${openIncidents.length} open issues.
- **Safety Rating:** **99.4% OSHA Audit Compliance**
- **Mitigation Protocols:**
  1. 100% double-lanyard tie-off on Level 4 structural perimeter.
  2. Daily morning toolbox briefing verified – all 42 subcontractors.
  3. Fire suppression & first aid stations inspected in Sectors 1–4.`;
  }

  return `### 💡 ConstructIQ Site Insights
Based on real-time analysis of your active site data:
- **${state.tasks.length} Schedule Tasks** averaging **${avgProgress}%** completion.
- **Financial Status:** ${formatINR(totalSpent)} disbursed against the configured simulated baseline (CPI: 1.08).
- **Safety:** ${openIncidents.length === 0 ? 'Zero active high-risk incidents.' : `${openIncidents.length} open case(s) under mitigation.`}

Would you like an **Executive Briefing**, **Delay Risk Analysis**, or **Subcontractor Variance** report?`;
}

export const AICopilotDrawer: React.FC<AICopilotDrawerProps> = ({
  isOpen,
  onClose,
  state,
  userRole
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm1',
      sender: 'assistant',
      text: `Hello **${userRole}**! I am **ConstructIQ Copilot**, your real-time site intelligence assistant powered by NVIDIA NIM (Meta Llama 3.2). I have live telemetry on your ${state.tasks.length} schedule phases, the configured simulated budget, active safety audits, and current weather (${state.weather.condition}, ${state.weather.wind}mph wind). How can I assist your operations today?`,
      timestamp: 'Just now',
      category: 'general',
      isAI: false
    }
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeEngine, setActiveEngine] = useState<string>('Initializing AI Engine...');
  const [usingRealAI, setUsingRealAI] = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAnalyzing]);

  // Determine active AI engine on mount
  useEffect(() => {
    // Check server proxy health
    fetch('/api/health')
      .then(r => r.json())
      .then(data => {
        if (data.status === 'ok' && data.aiAvailable) {
          setUsingRealAI(true);
          setActiveEngine('ConstructIQ AI Proxy (Live)');
        } else {
          setUsingRealAI(false);
          setActiveEngine('Local Analytics Mode');
        }
      })
      .catch(() => {
        // Direct test to proxy
        fetch('/api/copilot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: 'ping', context: state, userRole })
        })
          .then(r => {
            setUsingRealAI(r.ok);
            setActiveEngine(r.ok ? 'ConstructIQ AI Proxy' : 'Local Analytics Mode');
          })
          .catch(() => {
            setUsingRealAI(false);
            setActiveEngine('Local Analytics Mode');
          });
      });
  }, []);

  if (!isOpen) return null;

  // Call through Express proxy server
  const sendViaServerProxy = async (query: string): Promise<{ text: string; provider?: string }> => {
    const resp = await fetch('/api/copilot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: 'proj-demo-001', query })
    });
    if (!resp.ok) throw new Error(`Server error ${resp.status}`);
    const data = await resp.json();
    return { text: data.text, provider: data.provider };
  };

  const handleSend = async (textToSend?: string) => {
    const q = textToSend || inputQuery;
    if (!q.trim() || isAnalyzing) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setIsAnalyzing(true);

    try {
      let replyText: string;
      let isAI = false;
      let providerName = 'Local';

      try {
        const proxyRes = await sendViaServerProxy(q);
        replyText = proxyRes.text;
        isAI = true;
        providerName = proxyRes.provider || 'AI Proxy';
      } catch {
        replyText = generateLocalResponse(q, state, userRole);
        isAI = false;
      }

      const botMsg: Message = {
        id: `b-${Date.now()}`,
        sender: 'assistant',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isAI,
        provider: providerName
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: `e-${Date.now()}`,
        sender: 'assistant',
        text: `⚠️ **AI Notice:** ${err?.message || 'Using local analytics mode.'}\n\n${generateLocalResponse(q, state, userRole)}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isAI: false
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const quickPrompts = [
    { label: '📋 Daily Executive Briefing', query: 'Generate comprehensive daily executive site briefing' },
    { label: '⚠️ Critical Path Delay Risk', query: 'Analyze critical path bottlenecks and delay risks' },
    { label: '💰 INR Budget & CPI Variance', query: 'Analyze INR budget variance and cashflow' },
    { label: '🌧️ Weather & Crane Impact', query: 'What is the weather impact on concrete curing and crane safety?' },
    { label: '🛡️ Safety & PPE Audit Plan', query: 'Generate OSHA compliance and safety mitigation checklist' },
  ];

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-white border-l border-[#D1CEC6] shadow-2xl z-50 flex flex-col animate-fade-in font-sans">
      {/* Header */}
      <div className="p-4 border-b border-[#D1CEC6] bg-[#1A1A1A] text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-sm bg-[#76B900] flex items-center justify-center text-[#1A1A1A] font-bold">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">ConstructIQ Copilot</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              {usingRealAI === true ? (
                <>
                  <Wifi className="w-2.5 h-2.5 text-[#76B900]" />
                  <p className="text-[9px] text-[#76B900] font-mono font-medium">{activeEngine}</p>
                </>
              ) : usingRealAI === false ? (
                <>
                  <WifiOff className="w-2.5 h-2.5 text-[#C5A059]" />
                  <p className="text-[9px] text-[#C5A059] font-mono font-medium">Local Analytics Engine Active</p>
                </>
              ) : (
                <p className="text-[9px] text-[#7A756C] font-mono">Connecting to AI engine...</p>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 cursor-pointer transition-colors"
          title="Close Copilot"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Quick Prompts Bar */}
      <div className="p-3 bg-[#F4F1EA] border-b border-[#D1CEC6] overflow-x-auto scrollbar-none flex gap-2">
        {quickPrompts.map((qp, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(qp.query)}
            disabled={isAnalyzing}
            className="whitespace-nowrap px-2.5 py-1 bg-white border border-[#D1CEC6] hover:border-[#76B900] hover:bg-[#76B900]/10 text-[10px] font-bold uppercase tracking-wider text-[#1A1A1A] rounded-sm transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>{qp.label}</span>
          </button>
        ))}
      </div>

      {/* Messages Stream */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-[#FAFAF8]">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-1.5 mb-1 text-[10px] text-[#7A756C] font-mono">
              <span>{msg.sender === 'user' ? userRole : 'ConstructIQ Intelligence'}</span>
              {msg.sender === 'assistant' && msg.isAI && (
                <span className="text-[#1A1A1A] text-[8px] bg-[#76B900] text-black font-bold px-1.5 py-0.2 rounded">
                  {msg.provider ? `${msg.provider.toUpperCase()} AI` : 'NVIDIA AI'}
                </span>
              )}
              <span>•</span>
              <span>{msg.timestamp}</span>
            </div>

            <div
              className={`max-w-[92%] p-3.5 text-xs leading-relaxed rounded-sm ${
                msg.sender === 'user'
                  ? 'bg-[#1A1A1A] text-white'
                  : 'bg-white border border-[#D1CEC6] text-[#1A1A1A] shadow-sm'
              }`}
            >
              {msg.sender === 'assistant'
                ? renderMarkdown(msg.text)
                : <div className="whitespace-pre-wrap text-[11px]">{msg.text}</div>
              }
            </div>
          </div>
        ))}

        {isAnalyzing && (
          <div className="flex items-center gap-2 p-3 bg-white border border-[#D1CEC6] text-xs text-[#7A756C] rounded-sm">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#76B900]" />
            <span className="font-mono">
              {usingRealAI ? 'Querying NVIDIA NIM with live site telemetry...' : 'Analyzing telemetry, schedule critical paths, and INR cashflow...'}
            </span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input query form */}
      <div className="p-3 border-t border-[#D1CEC6] bg-white">
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={e => setInputQuery(e.target.value)}
            placeholder="Ask Copilot about tasks, INR budget, safety, weather..."
            disabled={isAnalyzing}
            className="flex-1 px-3 py-2 bg-[#F4F1EA] border border-[#D1CEC6] text-xs focus:outline-none focus:border-[#76B900] disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputQuery.trim() || isAnalyzing}
            className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#333] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors disabled:cursor-not-allowed"
          >
            <Send className="w-3.5 h-3.5 text-[#76B900]" />
            <span>Ask</span>
          </button>
        </form>
        <div className="flex items-center justify-between mt-1.5 px-0.5">
          <p className="text-[9px] text-[#7A756C] font-mono">
            Powered by NVIDIA NIM • Meta Llama 3.2
          </p>
          <span className="text-[9px] text-[#2E7D32] font-mono font-bold">
            Telemetry Synced
          </span>
        </div>
      </div>
    </div>
  );
};
