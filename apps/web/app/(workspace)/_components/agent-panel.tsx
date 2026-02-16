"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";

type AgentMode = "discovery" | "redhat" | "general";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

const MOTIA_BASE = "http://localhost:3111";

const modes: {
  key: AgentMode;
  label: string;
  icon: string;
  description: string;
  creditCost: number;
}[] = [
  {
    key: "discovery",
    label: "Discovery",
    icon: "search",
    description: "Explode transcripts into insights",
    creditCost: 1,
  },
  {
    key: "redhat",
    label: "Red Hat",
    icon: "shield",
    description: "Adversarial risk audit",
    creditCost: 5,
  },
  {
    key: "general",
    label: "General",
    icon: "message",
    description: "Ask anything",
    creditCost: 0,
  },
];

function AgentIcon({ name, size = 14 }: { name: string; size?: number }) {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "search":
      return (
        <svg {...props}>
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      );
    case "shield":
      return (
        <svg {...props}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );
    case "message":
      return (
        <svg {...props}>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      );
    case "send":
      return (
        <svg {...props}>
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      );
    case "sparkles":
      return (
        <svg {...props}>
          <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
          <path d="M5 3v4" /><path d="M19 17v4" />
          <path d="M3 5h4" /><path d="M17 19h4" />
        </svg>
      );
    case "paperclip":
      return (
        <svg {...props}>
          <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
        </svg>
      );
    case "panel-right":
      return (
        <svg {...props}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="15" y1="3" x2="15" y2="21" />
        </svg>
      );
    default:
      return null;
  }
}

export function AgentPanel() {
  const {
    agentPanelCollapsed,
    toggleAgentPanel,
    selectedBoardId,
    credits,
    setCredits,
  } = useWorkspaceStore();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "system",
      content:
        "Welcome to ForgeAI. I can help you discover insights, audit your board for risks, or answer questions about your product strategy.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [agentMode, setAgentMode] = useState<AgentMode>("discovery");
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const getEditorShapes = useCallback(() => {
    const editor = (globalThis as any).__forgeEditor;
    if (!editor) return [];
    try {
      return editor.getCurrentPageShapes().map((s: any) => ({
        id: s.id,
        type: s.type,
        x: s.x,
        y: s.y,
        props: s.props,
      }));
    } catch {
      return [];
    }
  }, []);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isProcessing) return;

    const mode = modes.find((m) => m.key === agentMode)!;
    if (mode.creditCost > 0 && credits < mode.creditCost) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "system",
          content: `Insufficient credits. ${mode.label} requires ${mode.creditCost} credits, but you have ${credits}. Purchase more credits to continue.`,
          timestamp: new Date(),
        },
      ]);
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsProcessing(true);

    try {
      let endpoint: string;
      let body: Record<string, unknown>;

      switch (agentMode) {
        case "discovery":
          endpoint = `${MOTIA_BASE}/discover`;
          body = {
            boardId: selectedBoardId ?? "",
            content: userMessage.content,
            sourceType: "notes",
          };
          break;
        case "redhat":
          endpoint = `${MOTIA_BASE}/audit`;
          body = {
            boardId: selectedBoardId ?? "",
            shapes: getEditorShapes(),
          };
          break;
        case "general":
        default:
          endpoint = `${MOTIA_BASE}/ask`;
          body = {
            boardId: selectedBoardId ?? "",
            question: userMessage.content,
          };
          break;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(`Agent request failed: ${res.status}`);

      const data = await res.json();

      if (mode.creditCost > 0) {
        setCredits(credits - mode.creditCost);
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          data.message ??
          data.answer ??
          `${mode.label} Agent processing complete. ${
            agentMode === "discovery"
              ? `Discovery ${data.discoveryId} is being analyzed. Insights will appear on the canvas shortly.`
              : agentMode === "redhat"
                ? `Audit complete. ${data.riskCount ?? 0} risks identified and flagged on the canvas.`
                : data.response ?? "Done."
          }`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `[${agentMode.toUpperCase()} Agent] Processing your request: "${userMessage.content}"\n\nMotia backend is not running. Start it with \`npx motia dev\` in apps/backend.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setIsProcessing(false);
    }
  }, [
    input,
    isProcessing,
    agentMode,
    selectedBoardId,
    credits,
    setCredits,
    getEditorShapes,
  ]);

  if (agentPanelCollapsed) {
    return (
      <div className="h-full flex flex-col items-center py-3 gap-2">
        <button
          onClick={toggleAgentPanel}
          className="p-2 rounded-xl transition-colors cursor-pointer"
          style={{ color: "#94A3B8" }}
          title="Expand agent panel"
        >
          <AgentIcon name="panel-right" size={18} />
        </button>
      </div>
    );
  }

  return (
    <div
      className="h-full flex flex-col"
      style={{ background: "rgba(11, 16, 32, 0.7)" }}
    >
      {/* Header */}
      <header
        className="px-4 py-4 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-9 h-9 rounded-xl shadow-glow flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, rgba(0,217,255,0.7), rgba(96,165,250,0.4))",
              }}
            >
              <span className="font-display font-bold tracking-tight text-white text-sm">F</span>
            </div>
            <div className="min-w-0">
              <div className="font-display font-semibold tracking-tight text-white text-sm">
                ForgeAI Agent
              </div>
              <div className="text-xs" style={{ color: "#94A3B8" }}>
                {modes.find((m) => m.key === agentMode)?.description}
              </div>
            </div>
          </div>
          <button
            onClick={toggleAgentPanel}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
            style={{
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.05)",
              color: "#CBD5E1",
            }}
          >
            <AgentIcon name="panel-right" size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="mt-4 flex items-center gap-2">
          {modes.map((mode) => (
            <button
              key={mode.key}
              onClick={() => setAgentMode(mode.key)}
              className="flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-colors cursor-pointer"
              style={
                agentMode === mode.key
                  ? {
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#F1F5F9",
                    }
                  : {
                      background: "transparent",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#94A3B8",
                    }
              }
            >
              {mode.label}
              {mode.creditCost > 0 && (
                <span className="ml-1 text-[9px] opacity-60">
                  ({mode.creditCost}cr)
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      {/* Messages */}
      <section ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "system" || msg.role === "assistant" ? (
              <div
                className="max-w-[85%] rounded-2xl p-4"
                style={
                  msg.role === "system"
                    ? {
                        background: "rgba(0, 217, 255, 0.1)",
                        border: "1px solid rgba(82, 246, 225, 0.2)",
                      }
                    : {
                        background: "rgba(255, 255, 255, 0.05)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                      }
                }
              >
                <div className="flex items-start gap-3">
                  <div
                    className="mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    <span style={{ color: "#52F6E1" }}>
                      <AgentIcon name="sparkles" size={16} />
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p
                      className="text-sm leading-relaxed"
                      style={{
                        whiteSpace: "pre-wrap",
                        color: msg.role === "system" ? "#E0FFFE" : "#F1F5F9",
                      }}
                    >
                      {msg.content}
                    </p>
                    <div className="mt-2 text-xs" style={{ color: "#64748B" }}>
                      {msg.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className="max-w-[85%] rounded-2xl px-4 py-3"
                style={{
                  background: "rgba(0, 217, 255, 0.15)",
                  border: "1px solid rgba(0, 217, 255, 0.25)",
                  color: "#F1F5F9",
                }}
              >
                <div style={{ whiteSpace: "pre-wrap" }} className="text-sm leading-relaxed">
                  {msg.content}
                </div>
                <div className="text-[10px] mt-1.5" style={{ color: "#94A3B8" }}>
                  {msg.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            )}
          </div>
        ))}

        {isProcessing && (
          <div className="flex justify-start">
            <div
              className="rounded-2xl px-4 py-3 text-sm"
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
              }}
            >
              <div className="flex items-center gap-2" style={{ color: "#94A3B8" }}>
                <div className="flex gap-1">
                  <span
                    className="animate-bounce text-xs"
                    style={{ animationDelay: "0ms", color: "#00D9FF" }}
                  >
                    ●
                  </span>
                  <span
                    className="animate-bounce text-xs"
                    style={{ animationDelay: "200ms", color: "#00D9FF" }}
                  >
                    ●
                  </span>
                  <span
                    className="animate-bounce text-xs"
                    style={{ animationDelay: "400ms", color: "#00D9FF" }}
                  >
                    ●
                  </span>
                </div>
                Thinking...
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Input */}
      <footer
        className="p-4 flex-shrink-0"
        style={{
          borderTop: "1px solid rgba(255,255,255,0.1)",
          background: "#0B1020",
        }}
      >
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={
                agentMode === "discovery"
                  ? "Paste a transcript or describe what to analyze…"
                  : agentMode === "redhat"
                    ? "Ask me to audit your board for risks…"
                    : "Ask anything about your product…"
              }
              className="w-full resize-none rounded-2xl px-4 py-3 text-sm outline-none transition-colors"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#F1F5F9",
                maxHeight: "120px",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "rgba(0,217,255,0.6)";
                e.currentTarget.style.boxShadow = "0 0 0 2px rgba(0,217,255,0.2)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                e.currentTarget.style.boxShadow = "none";
              }}
              rows={2}
            />
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs" style={{ color: "#64748B" }}>
                <span className="inline-flex items-center gap-1">
                  <AgentIcon name="paperclip" size={14} />
                  Attach
                </span>
              </div>
              <div className="text-xs" style={{ color: "#64748B" }}>
                Enter ↵ to send
              </div>
            </div>
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || isProcessing}
            className="shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center transition-colors cursor-pointer disabled:opacity-30"
            style={{
              background: "rgba(0,217,255,0.25)",
              border: "1px solid rgba(82,246,225,0.3)",
              color: "#E0FFFE",
            }}
          >
            <AgentIcon name="send" size={18} />
          </button>
        </div>
      </footer>
    </div>
  );
}
