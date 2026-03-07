"use client";

import { useEffect, useState } from "react";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";
import { FileText, X } from "@phosphor-icons/react";

export function SourceViewer() {
  const {
    sourceViewerOpen,
    sourceDiscoveryId,
    sourceHighlight,
    closeSourceViewer,
  } = useWorkspaceStore();

  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // Listen for the custom event from StickyNoteShape clicks
  useEffect(() => {
    const handleOpenSource = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.discoveryId) {
        useWorkspaceStore.getState().openSourceViewer(
          detail.discoveryId,
          detail.startOffset ?? 0,
          detail.endOffset ?? 0
        );
      }
    };

    globalThis.addEventListener("forge:open-source", handleOpenSource);
    return () => {
      globalThis.removeEventListener("forge:open-source", handleOpenSource);
    };
  }, []);

  // Fetch discovery content when source viewer opens
  useEffect(() => {
    if (!sourceViewerOpen || !sourceDiscoveryId) return;

    setLoading(true);
    fetch(`/api/discoveries/${sourceDiscoveryId}`)
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Failed to fetch");
      })
      .then((data) => {
        setContent(data.discovery?.rawContent ?? "Content not available");
      })
      .catch(() => {
        setContent("Could not load the original transcript.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [sourceViewerOpen, sourceDiscoveryId]);

  if (!sourceViewerOpen) return null;

  const renderHighlightedContent = () => {
    if (!sourceHighlight || sourceHighlight.start === 0 && sourceHighlight.end === 0) {
      return <span>{content}</span>;
    }

    const { start, end } = sourceHighlight;
    const before = content.slice(0, start);
    const highlighted = content.slice(start, end);
    const after = content.slice(end);

    return (
      <>
        <span>{before}</span>
        <mark
          className="text-forge-text"
          style={{
            background: "rgba(37, 99, 235, 0.15)",
            padding: "2px 4px",
            borderRadius: "4px",
            border: "1px solid rgba(37, 99, 235, 0.30)",
          }}
        >
          {highlighted}
        </mark>
        <span>{after}</span>
      </>
    );
  };

  return (
    <div
      className="fixed inset-y-0 right-0 z-[200] flex"
      style={{ width: 480 }}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close source viewer"
        className="fixed inset-0 bg-black/20 backdrop-blur-sm"
        onClick={closeSourceViewer}
      />

      {/* Panel */}
      <div
        className="relative ml-auto h-full flex flex-col shadow-panel bg-forge-surface/97 dark:bg-forge-surface border-l border-forge-border"
        style={{ width: 480 }}
      >
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-5 border-b border-forge-border/30 flex-shrink-0">
          <div className="flex items-center gap-2">
            <FileText size={16} style={{ color: "var(--color-brand-500)" }} />
            <h3 className="text-sm font-semibold text-forge-text">
              Source Transcript
            </h3>
          </div>
          <button
            onClick={closeSourceViewer}
            className="p-1.5 rounded-lg hover:bg-forge-surface-2 transition-colors text-forge-text-muted hover:text-forge-text cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex items-center gap-2 text-forge-text-muted text-sm">
              <div className="flex gap-1">
                <span className="animate-bounce text-xs" style={{ animationDelay: "0ms" }}>
                  ●
                </span>
                <span className="animate-bounce text-xs" style={{ animationDelay: "200ms" }}>
                  ●
                </span>
                <span className="animate-bounce text-xs" style={{ animationDelay: "400ms" }}>
                  ●
                </span>
              </div>
              Loading transcript...
            </div>
          ) : (
            <div
              className="text-sm leading-relaxed text-forge-text whitespace-pre-wrap"
              style={{ fontFamily: "Inter, system-ui, sans-serif" }}
            >
              {renderHighlightedContent()}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-12 flex items-center px-5 border-t border-forge-border/30 flex-shrink-0">
          <span className="text-[11px] text-forge-text-dim">
            Discovery ID: {sourceDiscoveryId?.slice(0, 12)}...
          </span>
        </div>
      </div>
    </div>
  );
}
