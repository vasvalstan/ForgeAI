"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { createShapeId } from "tldraw";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";
import {
  MagnifyingGlass,
  ShieldCheck,
  ChatCircle,
  PaperPlaneRight,
  Sparkle,
  Paperclip,
  SidebarSimple,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";

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
  ModeIcon: Icon;
  description: string;
  creditCost: number;
}[] = [
  {
    key: "discovery",
    label: "Discovery",
    ModeIcon: MagnifyingGlass,
    description: "Explode transcripts into insights",
    creditCost: 1,
  },
  {
    key: "redhat",
    label: "Red Hat",
    ModeIcon: ShieldCheck,
    description: "Adversarial risk audit",
    creditCost: 5,
  },
  {
    key: "general",
    label: "General",
    ModeIcon: ChatCircle,
    description: "Ask anything",
    creditCost: 0,
  },
];

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

  const dropAIReviewComment = useCallback((text: string) => {
    const editor = (globalThis as any).__forgeEditor;
    if (!editor || !text.trim()) return;

    const center = editor.getViewportScreenCenter();
    editor.createShape({
      id: createShapeId(),
      type: "comment",
      x: center.x - 120,
      y: center.y - 70,
      props: {
        w: 240,
        h: 140,
        text: text.slice(0, 260),
        author: "AI Review",
        authorColor: "#7C3AED",
        targetShapeId: "",
      },
    } as any);
  }, []);

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

      if (agentMode === "redhat" || agentMode === "general") {
        dropAIReviewComment(assistantMessage.content);
      }
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
    dropAIReviewComment,
  ]);

  if (agentPanelCollapsed) {
    return (
      <div className="h-full flex flex-col items-center py-3 gap-2">
        <button
          onClick={toggleAgentPanel}
          className="p-2 rounded-lg transition-colors cursor-pointer hover:bg-black/5"
          style={{ color: "#64748B" }}
          title="Expand agent panel"
        >
          <SidebarSimple size={18} />
        </button>
      </div>
    );
  }

  const currentMode = modes.find((m) => m.key === agentMode)!;

  return (
    <div
      className="h-full flex flex-col glass shadow-panel"
      style={{ fontFamily: "var(--font-sans)" }}
    >
      {/* Header */}
      <header
        className="px-4 pt-4 pb-4 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--color-forge-border)" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, var(--color-brand-500), var(--color-brand-400))",
              }}
            >
              <Sparkle size={16} className="text-white" />
            </div>
            <div className="min-w-0">
              <div className="font-display font-semibold tracking-tight text-[13px]" style={{ color: "#0F172A" }}>
                AI Agent
              </div>
              <div className="text-[11px]" style={{ color: "#64748B" }}>
                {currentMode.description}
              </div>
            </div>
          </div>
          <button
            onClick={toggleAgentPanel}
            className="p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-black/5"
            style={{ color: "#64748B" }}
          >
            <SidebarSimple size={16} />
          </button>
        </div>

        {/* Mode Tabs — with icons instead of just text */}
        <div className="mt-4 flex items-center gap-2">
          {modes.map((mode) => {
            const isActive = agentMode === mode.key;
            return (
              <button
                key={mode.key}
                onClick={() => setAgentMode(mode.key)}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-[12px] font-medium transition-all cursor-pointer"
                style={
                  isActive
                    ? {
                        background: "rgba(37, 99, 235, 0.10)",
                        border: "1px solid rgba(37, 99, 235, 0.22)",
                        color: "#1D4ED8",
                      }
                    : {
                        background: "transparent",
                        border: "1px solid rgba(15, 23, 42, 0.12)",
                        color: "#64748B",
                      }
                }
              >
                <mode.ModeIcon size={14} />
                {mode.label}
                {mode.creditCost > 0 && (
                  <span
                    className="ml-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
                    style={{
                      background: isActive
                        ? "rgba(37, 99, 235, 0.10)"
                        : "rgba(15, 23, 42, 0.05)",
                      border: isActive
                        ? "1px solid rgba(37, 99, 235, 0.18)"
                        : "1px solid rgba(15, 23, 42, 0.10)",
                      color: isActive ? "#1D4ED8" : "#475569",
                    }}
                  >
                    {mode.creditCost}cr
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* Messages */}
      <section ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "system" || msg.role === "assistant" ? (
              <div
                className="max-w-[88%] rounded-xl p-3"
                style={
                  msg.role === "system"
                    ? {
                        background: "rgba(124, 58, 237, 0.06)",
                        border: "1px solid rgba(124, 58, 237, 0.16)",
                      }
                    : {
                        background: "rgba(255, 255, 255, 0.92)",
                        border: "1px solid rgba(15, 23, 42, 0.10)",
                      }
                }
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className="mt-0.5 w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{
                      background: "rgba(124, 58, 237, 0.10)",
                    }}
                  >
                    <Sparkle size={13} style={{ color: "#7C3AED" }} />
                  </div>
                  <div className="min-w-0">
                    <p
                      className="text-[13px] leading-relaxed"
                      style={{
                        whiteSpace: "pre-wrap",
                        color: msg.role === "system" ? "#334155" : "#0F172A",
                      }}
                    >
                      {msg.content}
                    </p>
                    <div className="mt-1.5 text-[10px]" style={{ color: "#64748B" }}>
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
                className="max-w-[85%] rounded-xl px-3 py-2.5"
                style={{
                  background: "rgba(37, 99, 235, 0.08)",
                  border: "1px solid rgba(37, 99, 235, 0.18)",
                  color: "#0F172A",
                }}
              >
                <div style={{ whiteSpace: "pre-wrap" }} className="text-[13px] leading-relaxed">
                  {msg.content}
                </div>
                <div className="text-[10px] mt-1" style={{ color: "#64748B" }}>
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
              className="rounded-xl px-3 py-2.5 text-[13px]"
              style={{
                background: "rgba(255, 255, 255, 0.92)",
                border: "1px solid rgba(15, 23, 42, 0.10)",
              }}
            >
              <div className="flex items-center gap-2" style={{ color: "#64748B" }}>
                <div className="flex gap-1">
                  <span
                    className="animate-bounce text-xs"
                    style={{ animationDelay: "0ms", color: "#2563EB" }}
                  >
                    ●
                  </span>
                  <span
                    className="animate-bounce text-xs"
                    style={{ animationDelay: "200ms", color: "#2563EB" }}
                  >
                    ●
                  </span>
                  <span
                    className="animate-bounce text-xs"
                    style={{ animationDelay: "400ms", color: "#2563EB" }}
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
        className="px-4 py-4 flex-shrink-0"
        style={{
          borderTop: "1px solid var(--color-forge-border)",
          background: "rgba(255, 255, 255, 0.88)",
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
                  ? "Paste a transcript or describe what to analyze..."
                  : agentMode === "redhat"
                    ? "Ask me to audit your board for risks..."
                    : "Ask anything about your product..."
              }
              className="w-full resize-none rounded-xl px-4 py-2.5 text-[13px] leading-5 outline-none transition-colors"
              style={{
                background: "#FFFFFF",
                border: "1px solid rgba(15, 23, 42, 0.12)",
                color: "#0F172A",
                maxHeight: "120px",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "rgba(37, 99, 235, 0.5)";
                e.currentTarget.style.boxShadow = "0 0 0 2px rgba(37, 99, 235, 0.14)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "rgba(15, 23, 42, 0.12)";
                e.currentTarget.style.boxShadow = "none";
              }}
              rows={1}
            />
            <div className="mt-1.5 flex items-center justify-between">
              <button
                className="flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-md transition-colors cursor-pointer hover:bg-black/5"
                style={{ color: "#64748B" }}
              >
                <Paperclip size={13} />
                Attach
              </button>
              <div className="text-[10px]" style={{ color: "#64748B" }}>
                Enter to send
              </div>
            </div>
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || isProcessing}
            className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer disabled:opacity-25"
            style={{
              background: "#2563EB",
              border: "1px solid rgba(29, 78, 216, 0.35)",
              color: "#FFFFFF",
            }}
          >
            <PaperPlaneRight size={16} />
          </button>
        </div>
      </footer>
    </div>
  );
}
