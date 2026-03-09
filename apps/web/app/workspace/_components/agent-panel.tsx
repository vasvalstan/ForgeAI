"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { createShapeId } from "tldraw";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";
import {
  MagnifyingGlass,
  ShieldCheck,
  ChatCircle,
  Sparkle,
  SidebarSimple,
  FileText,
  Wrench,
  GitBranch,
  Plus,
  Clock,
  CaretDown,
  ArrowUp,
  Infinity as InfinityIcon,
  Check,
  ArrowsOutSimple,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";

const models = [
  "Composer 1.5",
  "Opus 4.6",
  "Opus 4.6 Max",
  "Sonnet 4.6",
  "GPT-5.3 Codex",
  "GPT-5.3 Codex Extra Hi...",
  "Gemini 3 Flash",
  "Llama 3 70B (Free)",
  "Mistral 8x7B (Free)"
];

type AgentMode = "discovery" | "strategy" | "redhat" | "spec" | "engineering" | "general";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

const modes: {
  key: AgentMode;
  label: string;
  ModeIcon: Icon;
  description: string;
  creditCost: number;
}[] = [
  { key: "discovery", label: "Discovery", ModeIcon: MagnifyingGlass, description: "Explode transcripts into insights", creditCost: 1 },
  { key: "strategy", label: "Strategy", ModeIcon: FileText, description: "Generate PRDs from insights", creditCost: 3 },
  { key: "redhat", label: "Red Hat", ModeIcon: ShieldCheck, description: "Adversarial risk audit", creditCost: 5 },
  { key: "spec", label: "Spec", ModeIcon: Wrench, description: "Write technical specs", creditCost: 3 },
  { key: "engineering", label: "Tasks", ModeIcon: GitBranch, description: "Break down into tasks", creditCost: 2 },
  { key: "general", label: "General", ModeIcon: ChatCircle, description: "Ask anything", creditCost: 0 },
];

type ContextAction = { label: string; mode: AgentMode; description: string };

function getContextActions(selectedShapes: any[]): ContextAction[] {
  if (!selectedShapes.length) return [];
  const types = new Set(selectedShapes.map((s: any) => s.type));
  const actions: ContextAction[] = [];
  if (types.has("sticky-note")) actions.push({ label: "Generate PRD from selected insights", mode: "strategy", description: "Synthesize selected insights into a PRD" });
  if (types.has("feature-card")) actions.push({ label: "Write spec for this feature", mode: "spec", description: "Generate a technical specification" });
  if (types.has("spec-card")) actions.push({ label: "Break down into tasks", mode: "engineering", description: "Generate engineering tasks" });
  if (types.has("prd-card")) actions.push({ label: "Run Red Hat audit on PRD", mode: "redhat", description: "Adversarial risk analysis" });
  if (types.size > 0) actions.push({ label: "Audit selection for risks", mode: "redhat", description: "Check for contradictions and scope creep" });
  return actions;
}

export function AgentPanel() {
  const {
    agentPanelCollapsed,
    toggleAgentPanel,
    selectedBoardId,
    credits,
    setCredits,
    setSelectedShapeIds,
  } = useWorkspaceStore();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [agentMode, setAgentMode] = useState<AgentMode>("general");
  const [isProcessing, setIsProcessing] = useState(false);
  const [contextActions, setContextActions] = useState<ContextAction[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState("Opus 4.6");

  useEffect(() => {
    const interval = setInterval(() => {
      const editor = (globalThis as any).__forgeEditor;
      if (!editor) return;
      try {
        const selected = editor.getSelectedShapes();
        const actions = getContextActions(selected);
        setContextActions(actions);
        setSelectedShapeIds(selected.map((s: any) => s.id));
      } catch { /* Editor may not be ready */ }
    }, 500);
    return () => clearInterval(interval);
  }, [setSelectedShapeIds]);

  const dropAIReviewComment = useCallback((text: string) => {
    const editor = (globalThis as any).__forgeEditor;
    if (!editor || !text.trim()) return;
    const center = editor.getViewportScreenCenter();
    editor.createShape({
      id: createShapeId(),
      type: "comment",
      x: center.x - 120,
      y: center.y - 70,
      props: { w: 240, h: 140, text: text.slice(0, 260), author: "AI Review", authorColor: "#7C3AED", targetShapeId: "" },
    } as any);
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const getEditorShapes = useCallback(() => {
    const editor = (globalThis as any).__forgeEditor;
    if (!editor) return [];
    try {
      return editor.getCurrentPageShapes().map((s: any) => ({ id: s.id, type: s.type, x: s.x, y: s.y, props: s.props }));
    } catch { return []; }
  }, []);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isProcessing) return;
    if (!selectedBoardId) {
      setMessages((prev) => [...prev, { id: Date.now().toString(), role: "system", content: "Select a board before using the AI assistant.", timestamp: new Date() }]);
      return;
    }
    const mode = modes.find((m) => m.key === agentMode)!;
    if (mode.creditCost > 0 && credits < mode.creditCost) {
      setMessages((prev) => [...prev, { id: Date.now().toString(), role: "system", content: `Insufficient credits. ${mode.label} requires ${mode.creditCost} credits, but you have ${credits}.`, timestamp: new Date() }]);
      return;
    }
    const userMessage: ChatMessage = { id: Date.now().toString(), role: "user", content: input.trim(), timestamp: new Date() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsProcessing(true);

    try {
      const endpoint = `/api/boards/${selectedBoardId}/agent`;
      let payload: Record<string, unknown>;
      switch (agentMode) {
        case "discovery": payload = { content: userMessage.content, sourceType: "notes" }; break;
        case "strategy": payload = {}; break;
        case "redhat": payload = { shapes: getEditorShapes() }; break;
        case "spec": payload = { featureTitle: userMessage.content }; break;
        case "engineering": payload = { specTitle: userMessage.content }; break;
        case "general": default: payload = { question: userMessage.content }; break;
      }
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: agentMode, payload }),
      });
      if (!res.ok) throw new Error(`Agent request failed: ${res.status}`);
      const data = await res.json();
      if (mode.creditCost > 0) setCredits(credits - mode.creditCost);
      const modeMessages: Record<string, string> = {
        discovery: `Discovery ${data.discoveryId ?? ""} is being analyzed.`,
        strategy: `PRD generation started.`,
        redhat: `Audit complete. ${data.riskCount ?? 0} risks identified.`,
        spec: `Technical spec generation started.`,
        engineering: `Task breakdown started.`,
        general: data.response ?? "Done.",
      };
      const assistantMessage: ChatMessage = { id: (Date.now() + 1).toString(), role: "assistant", content: data.message ?? data.answer ?? `[${selectedModel}] ${modeMessages[agentMode] ?? "Done."}`, timestamp: new Date() };
      setMessages((prev) => [...prev, assistantMessage]);
      if (agentMode === "redhat" || agentMode === "general") dropAIReviewComment(assistantMessage.content);
    } catch {
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: `[${agentMode.toUpperCase()} Agent using ${selectedModel}] Processing: "${userMessage.content}"\n\nMotia backend is not running. Start it with \`npx motia dev\` in apps/backend.`, timestamp: new Date() }]);
    } finally {
      setIsProcessing(false);
    }
  }, [input, isProcessing, agentMode, selectedModel, selectedBoardId, credits, setCredits, getEditorShapes, dropAIReviewComment]);

  if (agentPanelCollapsed) {
    return (
      <div className="h-full flex flex-col items-center py-3 gap-2 bg-forge-surface">
        <button onClick={toggleAgentPanel} className="p-2 rounded-lg transition-colors cursor-pointer text-forge-text-dim hover:bg-black/5" title="Expand agent panel">
          <SidebarSimple size={18} />
        </button>
      </div>
    );
  }

  const isNewChat = messages.length === 0;

  return (
    <div className="h-full flex flex-col bg-forge-surface text-forge-text px-4 py-4" style={{ fontFamily: "var(--font-sans)" }}>
      <header className="pb-4 flex items-center justify-between flex-shrink-0">
        <span className="text-[12px] font-semibold tracking-[0.06em] text-forge-text-secondary uppercase">
          AI Assistant
        </span>
        <div className="flex items-center gap-1.5 text-forge-text-dim">
          <button className="p-1 hover:bg-black/5 rounded-lg transition-colors cursor-pointer" title="History">
            <Clock size={16} />
          </button>
          <button onClick={toggleAgentPanel} className="p-1 hover:bg-black/5 rounded-lg transition-colors cursor-pointer" title="Collapse">
            <ArrowsOutSimple size={16} />
          </button>
        </div>
      </header>

      <div className="pb-4 flex items-center gap-2 flex-shrink-0">
        <div className="relative">
          <button
            onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
            className="flex items-center gap-1.5 text-[13px] px-3 py-1.5 rounded-lg border border-forge-border hover:bg-forge-surface-2 transition-colors cursor-pointer text-forge-text shadow-card"
          >
            {selectedModel} <CaretDown size={10} />
          </button>
          {isModelDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-56 rounded-xl bg-forge-surface border border-forge-border shadow-dropdown py-1 z-50">
              <div className="max-h-[220px] overflow-y-auto">
                {models.map(m => (
                  <button
                    key={m}
                    onClick={() => { setSelectedModel(m); setIsModelDropdownOpen(false); }}
                    className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-black/[0.04] flex items-center justify-between cursor-pointer"
                  >
                    <span className={m.includes("(Free)") ? "text-forge-success" : "text-forge-text"}>{m}</span>
                    {selectedModel === m && <Check size={12} className="text-forge-text-dim" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => setMessages([])}
          className="flex items-center gap-1.5 text-[13px] px-3 py-1.5 rounded-lg border border-forge-border hover:bg-forge-surface-2 transition-colors cursor-pointer text-forge-text ml-auto shadow-card"
        >
          <Plus size={14} /> New chat
        </button>
      </div>

      {isNewChat ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-shrink-0">
            <div className="flex items-center gap-2 rounded-2xl border border-forge-border bg-forge-surface px-3 py-3 shadow-card">
              <Plus size={16} className="text-forge-text-dim flex-shrink-0" />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSend(); } }}
                placeholder="Start here..."
                className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-forge-text-dim text-forge-text"
              />
              <div className="flex items-center gap-1.5 text-forge-text-dim flex-shrink-0">
                <button className="hover:text-forge-text transition-colors cursor-pointer">
                  <Sparkle size={16} />
                </button>
                <button
                  onClick={handleSend}
                  className="hover:text-forge-text transition-colors cursor-pointer"
                >
                  <ArrowUp size={16} />
                </button>
              </div>
            </div>

            {/* Context Actions */}
            {contextActions.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {contextActions.slice(0, 3).map((action, idx) => (
                  <button
                    key={idx}
                    onClick={() => { setAgentMode(action.mode); setInput(action.label); }}
                    className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] text-left transition-all cursor-pointer border border-forge-border hover:bg-forge-surface-2"
                  >
                    <Sparkle size={12} className="text-forge-text-dim" />
                    <span className="flex-1 truncate">{action.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1" />

          <div className="pb-1 flex-shrink-0">
            <div className="flex items-center justify-between text-[13px] mb-3">
              <span className="font-semibold text-forge-text">Past chats</span>
              <button className="text-forge-text-dim hover:text-forge-text cursor-pointer transition-colors text-[13px]">
                View all
              </button>
            </div>
            <div className="space-y-1">
              {[
                { title: "Meeting recording 19/02", time: "2h ago" },
                { title: "Presentation", time: "1d ago" },
                { title: "Tasks optimization", time: "2d ago" },
              ].map((chat) => (
                <div
                  key={chat.title}
                  className="flex items-center justify-between text-[13px] py-2 hover:bg-forge-surface-2 px-2 -mx-2 rounded-lg cursor-pointer group"
                >
                  <span className="truncate text-forge-text-secondary group-hover:text-forge-text">{chat.title}</span>
                  <span className="text-[12px] text-forge-text-dim flex-shrink-0 ml-3">{chat.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          <section ref={scrollRef} className="flex-1 overflow-y-auto py-2 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "system" || msg.role === "assistant" ? (
                  <div className="max-w-[95%]">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 bg-forge-surface-2">
                        <InfinityIcon size={14} className="text-forge-text" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13px] leading-relaxed text-forge-text" style={{ whiteSpace: "pre-wrap" }}>{msg.content}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-[85%] rounded-xl px-3 py-2.5 bg-forge-surface border border-forge-border text-forge-text shadow-card">
                    <div style={{ whiteSpace: "pre-wrap" }} className="text-[13px] leading-relaxed">{msg.content}</div>
                  </div>
                )}
              </div>
            ))}
            {isProcessing && (
              <div className="flex justify-start">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 bg-forge-surface-2">
                    <InfinityIcon size={14} className="text-forge-text" />
                  </div>
                  <div className="text-[13px] text-forge-text-dim flex items-center h-6">
                    <span className="animate-pulse">Generating...</span>
                  </div>
                </div>
              </div>
            )}
          </section>

          <div className="pb-1 pt-3 flex-shrink-0">
            <div className="flex items-center gap-2 rounded-2xl border border-forge-border bg-forge-surface px-3 py-3 shadow-card">
              <Plus size={16} className="text-forge-text-dim flex-shrink-0" />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSend(); } }}
                placeholder="Reply..."
                className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-forge-text-dim text-forge-text"
              />
              <div className="flex items-center gap-1.5 text-forge-text-dim flex-shrink-0">
                <button className="hover:text-forge-text transition-colors cursor-pointer"><Sparkle size={16} /></button>
                {input.trim() && (
                  <button onClick={handleSend} className="hover:text-forge-text transition-colors cursor-pointer ml-1">
                    <ArrowUp size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
