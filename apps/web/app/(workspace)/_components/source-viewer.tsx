"use client";

import { useEffect, useState, useCallback } from "react";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";

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

    window.addEventListener("forge:open-source", handleOpenSource);
    return () => {
      window.removeEventListener("forge:open-source", handleOpenSource);
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
          style={{
            background: "rgba(0, 217, 255, 0.3)",
            color: "#F1F5F9",
            padding: "2px 4px",
            borderRadius: "4px",
            border: "1px solid rgba(0, 217, 255, 0.5)",
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
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={closeSourceViewer}
      />

      {/* Panel */}
      <div
        className="relative ml-auto h-full flex flex-col"
        style={{
          width: 480,
          background: "rgba(7, 10, 18, 0.98)",
          borderLeft: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-5 border-b border-forge-border/30 flex-shrink-0">
          <div className="flex items-center gap-2">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#00D9FF"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <h3 className="text-sm font-semibold text-forge-text">
              Source Transcript
            </h3>
          </div>
          <button
            onClick={closeSourceViewer}
            className="p-1.5 rounded-lg hover:bg-forge-surface-2 transition-colors text-forge-text-muted hover:text-forge-text cursor-pointer"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
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
              className="text-sm leading-relaxed text-forge-text-muted whitespace-pre-wrap"
              style={{ fontFamily: "Satoshi, Inter, monospace" }}
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
