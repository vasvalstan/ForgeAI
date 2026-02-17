"use client";

import { useEffect, useState, useCallback } from "react";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";
import {
  FileText,
  X,
  Lightning,
} from "@phosphor-icons/react";

interface PRDData {
  id: string;
  title: string;
  content: string;
  status: string;
  boardId: string;
  createdAt: string;
  updatedAt: string;
  specs?: { id: string; title: string; status: string; _count?: { tasks: number } }[];
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  draft: { bg: "rgba(100, 116, 139, 0.10)", text: "#475569", border: "rgba(100, 116, 139, 0.20)" },
  review: { bg: "rgba(245, 158, 11, 0.10)", text: "#B45309", border: "rgba(245, 158, 11, 0.25)" },
  approved: { bg: "rgba(22, 163, 74, 0.10)", text: "#15803D", border: "rgba(22, 163, 74, 0.25)" },
};

function renderMarkdown(content: string): React.ReactNode[] {
  const lines = content.split("\n");
  const nodes: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (line.startsWith("## ")) {
      nodes.push(
        <h2 key={i} style={{ fontSize: "16px", fontWeight: 700, color: "#0F172A", marginTop: i > 0 ? "20px" : 0, marginBottom: "8px" }}>
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith("### ")) {
      nodes.push(
        <h3 key={i} style={{ fontSize: "14px", fontWeight: 600, color: "#1E293B", marginTop: "16px", marginBottom: "6px" }}>
          {line.slice(4)}
        </h3>
      );
    } else if (line.startsWith("> ")) {
      const quoteText = line.slice(2);
      const insightMatch = quoteText.match(/\[INSIGHT:([^\]]+)\]/) ?? null;
      nodes.push(
        <blockquote
          key={i}
          style={{
            borderLeft: "3px solid rgba(37, 99, 235, 0.4)",
            paddingLeft: "12px",
            margin: "8px 0",
            fontSize: "13px",
            color: "#475569",
            fontStyle: "italic",
          }}
        >
          {insightMatch ? (
            <span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                  background: "rgba(37, 99, 235, 0.08)",
                  border: "1px solid rgba(37, 99, 235, 0.18)",
                  borderRadius: "4px",
                  padding: "1px 6px",
                  fontSize: "10px",
                  fontWeight: 600,
                  color: "#2563EB",
                  fontStyle: "normal",
                  cursor: "pointer",
                  marginRight: "4px",
                }}
                title="Evidence from user research"
              >
                <Lightning size={10} /> Evidence
              </span>
              {quoteText.replace(/\[INSIGHT:[^\]]+\]\s*/, "")}
            </span>
          ) : (
            quoteText
          )}
        </blockquote>
      );
    } else if (line.startsWith("- ")) {
      nodes.push(
        <div key={i} style={{ display: "flex", gap: "6px", fontSize: "13px", color: "#334155", lineHeight: "1.5", margin: "3px 0" }}>
          <span style={{ color: "#64748B" }}>&#x2022;</span>
          <span>{line.slice(2)}</span>
        </div>
      );
    } else if (line.trim() === "") {
      nodes.push(<div key={i} style={{ height: "8px" }} />);
    } else {
      nodes.push(
        <p key={i} style={{ fontSize: "13px", color: "#334155", lineHeight: "1.6", margin: "4px 0" }}>
          {line}
        </p>
      );
    }
  }

  return nodes;
}

export function PRDPanel() {
  const { prdViewerOpen, selectedPrdId, closePrdViewer } = useWorkspaceStore();

  const [prd, setPrd] = useState<PRDData | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  useEffect(() => {
    const handleOpenPrd = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.prdId) {
        useWorkspaceStore.getState().openPrdViewer(detail.prdId);
      }
    };

    globalThis.addEventListener("forge:open-prd", handleOpenPrd);
    return () => {
      globalThis.removeEventListener("forge:open-prd", handleOpenPrd);
    };
  }, []);

  useEffect(() => {
    if (!prdViewerOpen || !selectedPrdId) return;

    setLoading(true);
    fetch(`/api/prds/${selectedPrdId}`)
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Failed to fetch");
      })
      .then((data) => {
        setPrd(data.prd ?? null);
      })
      .catch(() => {
        setPrd(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [prdViewerOpen, selectedPrdId]);

  const cycleStatus = useCallback(async () => {
    if (!prd) return;
    const order = ["draft", "review", "approved"];
    const nextIdx = (order.indexOf(prd.status) + 1) % order.length;
    const nextStatus = order[nextIdx] ?? "draft";

    setStatusUpdating(true);
    try {
      const res = await fetch(`/api/prds/${prd.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        setPrd({ ...prd, status: nextStatus });
      }
    } catch {
      // silently ignore
    } finally {
      setStatusUpdating(false);
    }
  }, [prd]);

  if (!prdViewerOpen) return null;

  const statusColor = STATUS_COLORS[prd?.status ?? "draft"] ?? { bg: "rgba(100, 116, 139, 0.10)", text: "#475569", border: "rgba(100, 116, 139, 0.20)" };

  return (
    <div
      className="fixed inset-y-0 right-0 z-[200] flex"
      style={{ width: 540 }}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close PRD viewer"
        className="fixed inset-0 bg-black/20 backdrop-blur-sm"
        onClick={closePrdViewer}
      />

      {/* Panel */}
      <div
        className="relative ml-auto h-full flex flex-col"
        style={{
          width: 540,
          background: "rgba(255, 255, 255, 0.97)",
          borderLeft: "1px solid var(--color-forge-border)",
          boxShadow: "0 0 60px rgba(15, 23, 42, 0.12)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 flex-shrink-0"
          style={{ height: "56px", borderBottom: "1px solid rgba(15, 23, 42, 0.08)" }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              style={{
                width: "28px", height: "28px", borderRadius: "8px",
                background: "linear-gradient(135deg, rgba(37, 99, 235, 0.12), rgba(37, 99, 235, 0.06))",
                border: "1px solid rgba(37, 99, 235, 0.18)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <FileText size={14} style={{ color: "#2563EB" }} />
            </div>
            <div className="min-w-0">
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#0F172A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {prd?.title ?? "Loading..."}
              </div>
              <div style={{ fontSize: "10px", color: "#64748B" }}>
                Product Requirements Document
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {prd && (
              <button
                onClick={cycleStatus}
                disabled={statusUpdating}
                className="transition-all cursor-pointer"
                style={{
                  fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em",
                  padding: "3px 10px", borderRadius: "6px",
                  background: statusColor.bg, color: statusColor.text, border: `1px solid ${statusColor.border}`,
                }}
                title="Click to cycle status"
              >
                {prd.status}
              </button>
            )}
            <button
              onClick={closePrdViewer}
              className="p-1.5 rounded-lg hover:bg-black/5 transition-colors cursor-pointer"
              style={{ color: "#64748B" }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex items-center gap-2 text-sm" style={{ color: "#64748B" }}>
              <div className="flex gap-1">
                <span className="animate-bounce text-xs" style={{ animationDelay: "0ms", color: "#2563EB" }}>&#x25CF;</span>
                <span className="animate-bounce text-xs" style={{ animationDelay: "200ms", color: "#2563EB" }}>&#x25CF;</span>
                <span className="animate-bounce text-xs" style={{ animationDelay: "400ms", color: "#2563EB" }}>&#x25CF;</span>
              </div>
              Loading PRD...
            </div>
          ) : prd ? (
            <div>{renderMarkdown(prd.content)}</div>
          ) : (
            <div style={{ fontSize: "13px", color: "#64748B" }}>
              PRD not found.
            </div>
          )}
        </div>

        {/* Footer */}
        {prd && prd.specs && prd.specs.length > 0 && (
          <div
            className="flex-shrink-0 px-5 py-3"
            style={{ borderTop: "1px solid rgba(15, 23, 42, 0.08)" }}
          >
            <div style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748B", marginBottom: "6px" }}>
              Linked Specs ({prd.specs.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {prd.specs.map((spec) => (
                <div
                  key={spec.id}
                  style={{
                    fontSize: "12px", color: "#334155", padding: "6px 8px",
                    borderRadius: "6px", background: "rgba(15, 23, 42, 0.03)",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}
                >
                  <span>{spec.title}</span>
                  <span style={{ fontSize: "10px", color: "#64748B" }}>
                    {spec._count?.tasks ?? 0} tasks
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ID Footer */}
        <div
          className="flex items-center px-5 flex-shrink-0"
          style={{ height: "40px", borderTop: "1px solid rgba(15, 23, 42, 0.08)" }}
        >
          <span style={{ fontSize: "10px", color: "#94A3B8" }}>
            PRD ID: {selectedPrdId?.slice(0, 12)}...
          </span>
        </div>
      </div>
    </div>
  );
}
