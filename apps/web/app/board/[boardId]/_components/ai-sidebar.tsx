"use client";

import { useState, useRef, useCallback } from "react";
import type { Editor } from "tldraw";

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

export function AISidebar({ boardId, onClose, editor }: AISidebarProps) {
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

  const modes: { key: AgentMode; label: string; icon: string; description: string }[] = [
    { key: "discovery", label: "Discovery", icon: "🔍", description: "Explode transcripts into insights" },
    { key: "redhat", label: "Red Hat", icon: "🎩", description: "Adversarial risk audit" },
    { key: "general", label: "General", icon: "💬", description: "Ask anything" },
  ];

  return (
    <div
      className="w-[360px] h-full flex flex-col border-l"
      style={{
        background: "rgba(11, 16, 32, 0.7)",
        borderColor: "rgba(255, 255, 255, 0.1)",
      }}
    >
      {/* Header */}
      <header
        className="px-4 py-4 flex items-center justify-between"
        style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shadow-glow text-sm font-bold text-white"
            style={{
              background: "linear-gradient(135deg, rgba(0,217,255,0.7), rgba(96,165,250,0.4))",
            }}
          >
            F
          </div>
          <div>
            <h2 className="text-sm font-semibold font-display" style={{ color: "#F1F5F9" }}>
              ForgeAI Agent
            </h2>
            <p className="text-xs" style={{ color: "#94A3B8" }}>
              {modes.find((m) => m.key === agentMode)?.description}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
          style={{
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.05)",
            color: "#CBD5E1",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </header>

      {/* Agent Mode Selector */}
      <div className="px-4 py-3 flex gap-2" style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
        {modes.map((mode) => (
          <button
            key={mode.key}
            onClick={() => setAgentMode(mode.key)}
            className="flex-1 py-2 px-2 rounded-xl text-sm font-medium transition-colors cursor-pointer"
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
            <span className="mr-1">{mode.icon}</span>
            {mode.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <section ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className="max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
              style={{
                background:
                  msg.role === "user"
                    ? "rgba(0, 217, 255, 0.15)"
                    : msg.role === "system"
                      ? "rgba(0, 217, 255, 0.1)"
                      : "rgba(255, 255, 255, 0.05)",
                color: msg.role === "system" ? "#E0FFFE" : "#F1F5F9",
                border:
                  msg.role === "system"
                    ? "1px solid rgba(82, 246, 225, 0.2)"
                    : msg.role === "user"
                      ? "1px solid rgba(0, 217, 255, 0.25)"
                      : "1px solid rgba(255, 255, 255, 0.1)",
              }}
            >
              <div style={{ whiteSpace: "pre-wrap" }}>{msg.content}</div>
              <div
                className="text-[10px] mt-1.5"
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
              className="rounded-2xl px-4 py-3 text-sm"
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
              }}
            >
              <div className="flex items-center gap-2" style={{ color: "#94A3B8" }}>
                <div className="flex gap-1">
                  <span className="animate-bounce text-xs" style={{ animationDelay: "0ms", color: "#00D9FF" }}>●</span>
                  <span className="animate-bounce text-xs" style={{ animationDelay: "200ms", color: "#00D9FF" }}>●</span>
                  <span className="animate-bounce text-xs" style={{ animationDelay: "400ms", color: "#00D9FF" }}>●</span>
                </div>
                Thinking...
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Input */}
      <footer className="p-4" style={{ borderTop: "1px solid rgba(255, 255, 255, 0.1)", background: "#0B1020" }}>
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
              className="w-full text-sm resize-none rounded-2xl px-4 py-3 outline-none transition-colors"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#F1F5F9",
                maxHeight: "120px",
              }}
              rows={2}
            />
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
      </footer>
    </div>
  );
}
