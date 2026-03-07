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
  draft: { bg: "var(--color-status-inactive, rgba(100,116,139,0.10))", text: "var(--color-forge-text-secondary)", border: "rgba(100, 116, 139, 0.20)" },
  review: { bg: "rgba(245, 158, 11, 0.10)", text: "var(--color-forge-warning)", border: "rgba(245, 158, 11, 0.25)" },
  approved: { bg: "rgba(22, 163, 74, 0.10)", text: "var(--color-forge-success)", border: "rgba(22, 163, 74, 0.25)" },
};

function renderMarkdown(content: string): React.ReactNode[] {
  const lines = content.split("\n");
  const nodes: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (line.startsWith("## ")) {
      nodes.push(
        <h2 key={i} className="text-base font-bold text-forge-text" style={{ marginTop: i > 0 ? "20px" : 0, marginBottom: "8px" }}>
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith("### ")) {
      nodes.push(
        <h3 key={i} className="text-sm font-semibold text-forge-text" style={{ marginTop: "16px", marginBottom: "6px" }}>
          {line.slice(4)}
        </h3>
      );
    } else if (line.startsWith("> ")) {
      const quoteText = line.slice(2);
      const insightMatch = quoteText.match(/\[INSIGHT:([^\]]+)\]/) ?? null;
      nodes.push(
        <blockquote
          key={i}
          className="text-[13px] text-forge-text-secondary italic"
          style={{
            borderLeft: "3px solid rgba(37, 99, 235, 0.4)",
            paddingLeft: "12px",
            margin: "8px 0",
          }}
        >
          {insightMatch ? (
            <span>
              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-primary-500 not-italic cursor-pointer mr-1 px-1.5 py-px rounded bg-primary-500/8 border border-primary-500/18" title="Evidence from user research">
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
        <div key={i} className="flex gap-1.5 text-[13px] text-forge-text-secondary leading-relaxed my-0.5">
          <span className="text-forge-text-dim">&#x2022;</span>
          <span>{line.slice(2)}</span>
        </div>
      );
    } else if (line.trim() === "") {
      nodes.push(<div key={i} style={{ height: "8px" }} />);
    } else {
      nodes.push(
        <p key={i} className="text-[13px] text-forge-text-secondary leading-relaxed my-1">
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

  const statusColor = STATUS_COLORS[prd?.status ?? "draft"] ?? STATUS_COLORS.draft!;

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
        className="relative ml-auto h-full flex flex-col bg-forge-surface/97 dark:bg-forge-surface border-l border-forge-border shadow-panel"
        style={{ width: 540 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 h-14 flex-shrink-0 border-b border-forge-border-subtle">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-primary-500/10 border border-primary-500/18">
              <FileText size={14} className="text-primary-500" />
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-forge-text truncate">
                {prd?.title ?? "Loading..."}
              </div>
              <div className="text-[10px] text-forge-text-dim">
                Product Requirements Document
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {prd && (
              <button
                onClick={cycleStatus}
                disabled={statusUpdating}
                className="text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-md transition-all cursor-pointer"
                style={{
                  background: statusColor.bg,
                  color: statusColor.text,
                  border: `1px solid ${statusColor.border}`,
                }}
                title="Click to cycle status"
              >
                {prd.status}
              </button>
            )}
            <button
              onClick={closePrdViewer}
              className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer text-forge-text-dim"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-forge-text-dim">
              <div className="flex gap-1">
                <span className="animate-bounce text-xs text-primary-500" style={{ animationDelay: "0ms" }}>&#x25CF;</span>
                <span className="animate-bounce text-xs text-primary-500" style={{ animationDelay: "200ms" }}>&#x25CF;</span>
                <span className="animate-bounce text-xs text-primary-500" style={{ animationDelay: "400ms" }}>&#x25CF;</span>
              </div>
              Loading PRD...
            </div>
          ) : prd ? (
            <div>{renderMarkdown(prd.content)}</div>
          ) : (
            <div className="text-[13px] text-forge-text-dim">
              PRD not found.
            </div>
          )}
        </div>

        {/* Footer */}
        {prd && prd.specs && prd.specs.length > 0 && (
          <div className="flex-shrink-0 px-5 py-3 border-t border-forge-border-subtle">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-forge-text-dim mb-1.5">
              Linked Specs ({prd.specs.length})
            </div>
            <div className="flex flex-col gap-1">
              {prd.specs.map((spec) => (
                <div
                  key={spec.id}
                  className="text-xs text-forge-text-secondary p-1.5 rounded-lg bg-forge-surface-2 flex items-center justify-between"
                >
                  <span>{spec.title}</span>
                  <span className="text-[10px] text-forge-text-dim">
                    {spec._count?.tasks ?? 0} tasks
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ID Footer */}
        <div className="flex items-center px-5 h-10 flex-shrink-0 border-t border-forge-border-subtle">
          <span className="text-[10px] text-forge-text-dim/60">
            PRD ID: {selectedPrdId?.slice(0, 12)}...
          </span>
        </div>
      </div>
    </div>
  );
}
