"use client";

import { useState, useRef, useCallback } from "react";
import type { Editor } from "tldraw";
import {
  MagnifyingGlass,
  ShieldCheck,
  ChatCircle,
  PaperPlaneRight,
  Sparkle,
  X,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";

interface AISidebarProps {
  boardId: string;
  onClose: () => void;
  editor: Editor | null;
}

type AgentMode = "discovery" | "redhat" | "general";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

export function AISidebar({ onClose }: AISidebarProps) {
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

  const handleSend = useCallback(async () => {
    if (!input.trim() || isProcessing) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsProcessing(true);

    setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `[${agentMode.toUpperCase()} Agent] Processing your request: "${userMessage.content}"\n\nThis will be connected to the Motia backend for real AI responses.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsProcessing(false);
    }, 1000);
  }, [input, isProcessing, agentMode]);

  const modes: { key: AgentMode; label: string; ModeIcon: Icon; description: string }[] = [
    { key: "discovery", label: "Discovery", ModeIcon: MagnifyingGlass, description: "Explode transcripts into insights" },
    { key: "redhat", label: "Red Hat", ModeIcon: ShieldCheck, description: "Adversarial risk audit" },
    { key: "general", label: "General", ModeIcon: ChatCircle, description: "Ask anything" },
  ];

  return (
    <div
      className="w-[360px] h-full flex flex-col glass shadow-panel"
      style={{ fontFamily: "var(--font-sans)" }}
    >
      {/* Header */}
      <header
        className="px-4 pt-4 pb-4 flex items-center justify-between"
        style={{ borderBottom: "1px solid var(--color-forge-border)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, var(--color-brand-500), var(--color-brand-400))",
            }}
          >
            <Sparkle size={16} className="text-white" />
          </div>
          <div>
            <h2 className="text-[13px] font-semibold font-display" style={{ color: "#0F172A" }}>
              AI Agent
            </h2>
            <p className="text-[11px]" style={{ color: "#64748B" }}>
              {modes.find((m) => m.key === agentMode)?.description}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-black/5"
          style={{ color: "#64748B" }}
        >
          <X size={16} />
        </button>
      </header>

      {/* Agent Mode Selector */}
      <div className="px-3 py-2.5 flex gap-1.5" style={{ borderBottom: "1px solid var(--color-forge-border)" }}>
        {modes.map((mode) => {
          const isActive = agentMode === mode.key;
          return (
            <button
              key={mode.key}
              onClick={() => setAgentMode(mode.key)}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-[12px] font-medium transition-all cursor-pointer"
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
            </button>
          );
        })}
      </div>

      {/* Messages */}
      <section ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className="max-w-[88%] rounded-xl px-3 py-2.5 text-[13px] leading-relaxed"
              style={{
                background:
                  msg.role === "user"
                    ? "rgba(37, 99, 235, 0.08)"
                    : msg.role === "system"
                      ? "rgba(124, 58, 237, 0.06)"
                      : "rgba(255, 255, 255, 0.92)",
                color: msg.role === "system" ? "#334155" : "#0F172A",
                border:
                  msg.role === "system"
                    ? "1px solid rgba(124, 58, 237, 0.16)"
                    : msg.role === "user"
                      ? "1px solid rgba(37, 99, 235, 0.18)"
                      : "1px solid rgba(15, 23, 42, 0.10)",
              }}
            >
              <div style={{ whiteSpace: "pre-wrap" }}>{msg.content}</div>
              <div
                className="text-[10px] mt-1"
                style={{ color: "#64748B" }}
              >
                {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
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
                  <span className="animate-bounce text-xs" style={{ animationDelay: "0ms", color: "#2563EB" }}>●</span>
                  <span className="animate-bounce text-xs" style={{ animationDelay: "200ms", color: "#2563EB" }}>●</span>
                  <span className="animate-bounce text-xs" style={{ animationDelay: "400ms", color: "#2563EB" }}>●</span>
                </div>
                Thinking...
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Input */}
      <footer className="px-4 py-4" style={{ borderTop: "1px solid var(--color-forge-border)", background: "rgba(255,255,255,0.88)" }}>
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
              className="w-full text-[13px] leading-5 resize-none rounded-xl px-4 py-2.5 outline-none transition-colors"
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
