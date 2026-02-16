"use client";

import { useCallback, useState } from "react";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";

type TreeSection = "boards" | "prds" | "transcripts" | "notes" | "insights";

const SECTION_META: Record<
  TreeSection,
  { label: string; icon: string }
> = {
  boards: { label: "Boards", icon: "grid" },
  prds: { label: "PRDs", icon: "file-text" },
  transcripts: { label: "Transcripts", icon: "mic" },
  notes: { label: "Meeting Notes", icon: "edit-3" },
  insights: { label: "Insights", icon: "zap" },
};

function SectionIcon({ name, size = 14 }: { name: string; size?: number }) {
  const s = size;
  const props = {
    width: s,
    height: s,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (name) {
    case "grid":
      return (
        <svg {...props}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );
    case "layout-dashboard":
      return (
        <svg {...props}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );
    case "wand-2":
      return (
        <svg {...props}>
          <path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z" />
          <path d="m14 7 3 3" />
          <path d="M5 6v4" /><path d="M19 14v4" />
          <path d="M10 2v2" /><path d="M7 8H3" />
          <path d="M21 16h-4" /><path d="M11 3H9" />
        </svg>
      );
    case "file-text":
      return (
        <svg {...props}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      );
    case "mic":
      return (
        <svg {...props}>
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      );
    case "edit-3":
      return (
        <svg {...props}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      );
    case "zap":
      return (
        <svg {...props}>
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      );
    case "chevron-right":
      return (
        <svg {...props}>
          <polyline points="9 18 15 12 9 6" />
        </svg>
      );
    case "plus":
      return (
        <svg {...props}>
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      );
    case "panel-left":
      return (
        <svg {...props}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="9" y1="3" x2="9" y2="21" />
        </svg>
      );
    case "search":
      return (
        <svg {...props}>
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      );
    default:
      return null;
  }
}

function CategoryDot({ category }: { category: string }) {
  const colors: Record<string, string> = {
    pain_point: "#F87171",
    feature_request: "#60A5FA",
    praise: "#34D399",
    question: "#FBBF24",
  };
  return (
    <span
      className="inline-block w-2 h-2 rounded-full flex-shrink-0"
      style={{ background: colors[category] ?? "#94A3B8" }}
    />
  );
}

export function PMSidebar() {
  const {
    sidebarCollapsed,
    toggleSidebar,
    selectedBoardId,
    selectBoard,
    boards,
    discoveries,
    insights,
    prds,
    meetingNotes,
    expandedSections,
    toggleSection,
    setBoards,
  } = useWorkspaceStore();

  const [creatingBoard, setCreatingBoard] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState("");

  const handleCreateBoard = useCallback(async () => {
    if (!newBoardTitle.trim()) return;
    try {
      const res = await fetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newBoardTitle.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setBoards([data.board, ...boards]);
        selectBoard(data.board.id);
        setNewBoardTitle("");
        setCreatingBoard(false);
      }
    } catch {
      // Handle error silently for now
    }
  }, [newBoardTitle, boards, setBoards, selectBoard]);

  if (sidebarCollapsed) {
    return (
      <div className="h-full flex flex-col items-center py-3 gap-2">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-xl transition-colors cursor-pointer"
          style={{ color: "#94A3B8" }}
          title="Expand sidebar"
        >
          <SectionIcon name="panel-left" size={18} />
        </button>
      </div>
    );
  }

  const boardDiscoveries = discoveries.filter(
    (d) => d.boardId === selectedBoardId
  );
  const boardInsights = insights.filter((i) =>
    boardDiscoveries.some((d) => d.id === i.discoveryId)
  );
  const boardPRDs = prds.filter((p) => p.boardId === selectedBoardId);
  const boardNotes = meetingNotes.filter(
    (n) => n.boardId === selectedBoardId
  );

  const sections: {
    key: TreeSection;
    items: { id: string; label: string; meta?: string; category?: string }[];
  }[] = [
    {
      key: "boards",
      items: boards.map((b) => ({
        id: b.id,
        label: b.title,
        meta: b.updatedAt,
      })),
    },
    {
      key: "prds",
      items: boardPRDs.map((p) => ({
        id: p.id,
        label: p.title,
        meta: p.updatedAt,
      })),
    },
    {
      key: "transcripts",
      items: boardDiscoveries.map((d) => ({
        id: d.id,
        label: `${d.sourceType} — ${d.status}`,
        meta: d.createdAt,
      })),
    },
    {
      key: "notes",
      items: boardNotes.map((n) => ({
        id: n.id,
        label: n.title,
        meta: n.updatedAt,
      })),
    },
    {
      key: "insights",
      items: boardInsights.map((i) => ({
        id: i.id,
        label: i.content.slice(0, 60) + (i.content.length > 60 ? "..." : ""),
        category: i.category,
      })),
    },
  ];

  const selectedBoard = boards.find((b) => b.id === selectedBoardId);

  return (
    <div className="h-full flex flex-col" style={{ background: "rgba(11, 16, 32, 0.7)" }}>
      {/* Brand Header */}
      <header
        className="px-4 py-4 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shadow-glow"
            style={{
              background: "linear-gradient(135deg, rgba(0,217,255,0.7), rgba(96,165,250,0.4))",
            }}
          >
            <span className="font-display font-bold tracking-tight text-white text-sm">F</span>
          </div>
          <div className="min-w-0">
            <div className="font-display font-semibold tracking-tight text-white text-sm">
              ForgeAI
            </div>
            <div className="text-xs" style={{ color: "#94A3B8" }}>
              {selectedBoard?.title ?? "Select a board"}
            </div>
          </div>
          <button
            onClick={toggleSidebar}
            className="ml-auto p-1.5 rounded-xl transition-colors cursor-pointer"
            style={{ color: "#94A3B8" }}
          >
            <SectionIcon name="panel-left" size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="mt-4 relative">
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "#94A3B8" }}
          >
            <SectionIcon name="search" size={16} />
          </span>
          <input
            type="text"
            placeholder="Search PRDs, notes, recordings…"
            className="w-full rounded-xl pl-10 pr-3 py-2 text-sm outline-none transition-colors"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#F1F5F9",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "rgba(0,217,255,0.6)";
              e.currentTarget.style.boxShadow = "0 0 0 2px rgba(0,217,255,0.2)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
        </div>
      </header>

      {/* Tree */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {sections.map(({ key, items }) => {
          const meta = SECTION_META[key];
          const isExpanded = expandedSections.has(key);
          const isBoards = key === "boards";

          return (
            <div key={key} className="mb-1">
              {/* Section header */}
              <button
                onClick={() => toggleSection(key)}
                className="w-full flex items-center gap-2 px-2 py-1.5 transition-colors cursor-pointer"
                style={{ color: "#64748B" }}
              >
                <span
                  className="transition-transform duration-200"
                  style={{
                    transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                  }}
                >
                  <SectionIcon name="chevron-right" size={12} />
                </span>
                <SectionIcon name={meta.icon} size={12} />
                <span
                  className="font-semibold"
                  style={{
                    fontSize: "11px",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                  }}
                >
                  {meta.label}
                </span>
                <span
                  className="ml-auto text-[10px] font-normal"
                  style={{ color: "rgba(100,116,139,0.6)" }}
                >
                  {items.length}
                </span>
                {isBoards && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setCreatingBoard(true);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs rounded-lg px-2 py-1 transition-colors cursor-pointer"
                    style={{ color: "#94A3B8" }}
                  >
                    <SectionIcon name="plus" size={14} />
                    New
                  </span>
                )}
              </button>

              {/* New board input */}
              {isBoards && creatingBoard && isExpanded && (
                <div className="px-4 py-1">
                  <input
                    autoFocus
                    value={newBoardTitle}
                    onChange={(e) => setNewBoardTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateBoard();
                      if (e.key === "Escape") {
                        setCreatingBoard(false);
                        setNewBoardTitle("");
                      }
                    }}
                    onBlur={() => {
                      if (!newBoardTitle.trim()) {
                        setCreatingBoard(false);
                        setNewBoardTitle("");
                      }
                    }}
                    placeholder="Board name..."
                    className="w-full text-xs px-2.5 py-1.5 rounded-xl outline-none"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#F1F5F9",
                    }}
                  />
                </div>
              )}

              {/* Items */}
              {isExpanded && (
                <div className="mt-0.5 space-y-1">
                  {items.length === 0 && !isBoards && (
                    <div
                      className="px-8 py-2 text-[11px] italic"
                      style={{ color: "#64748B" }}
                    >
                      {selectedBoardId
                        ? "None yet"
                        : "Select a board first"}
                    </div>
                  )}
                  {items.map((item) => {
                    const isBoard = isBoards;
                    const isSelected =
                      isBoard && item.id === selectedBoardId;

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          if (isBoard) selectBoard(item.id);
                        }}
                        className="w-full flex items-center gap-2 px-2 py-2 rounded-xl text-sm transition-colors cursor-pointer"
                        style={
                          isSelected
                            ? {
                                background: "rgba(255,255,255,0.05)",
                                boxShadow: "0 0 0 1px rgba(0,217,255,0.25), inset 0 0 0 1px rgba(0,217,255,0.16)",
                                color: "#FFFFFF",
                                fontWeight: 500,
                              }
                            : {
                                color: "#CBD5E1",
                              }
                        }
                      >
                        {item.category && (
                          <CategoryDot category={item.category} />
                        )}
                        {isBoard && isSelected && (
                          <SectionIcon name="wand-2" size={16} />
                        )}
                        {isBoard && !isSelected && (
                          <SectionIcon name="layout-dashboard" size={16} />
                        )}
                        <span className="truncate flex-1 text-left">
                          {item.label}
                        </span>
                      </button>
                    );
                  })}

                  {isBoards && items.length === 0 && !creatingBoard && (
                    <div className="px-6 py-3 text-center">
                      <p
                        className="text-[11px] mb-2"
                        style={{ color: "#64748B" }}
                      >
                        No boards yet
                      </p>
                      <button
                        onClick={() => setCreatingBoard(true)}
                        className="text-[11px] transition-colors cursor-pointer"
                        style={{ color: "#00D9FF" }}
                      >
                        + Create your first board
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer with credits */}
      <div
        className="h-12 flex items-center justify-between px-4 flex-shrink-0"
        style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}
      >
        <span className="text-[11px]" style={{ color: "#64748B" }}>
          Credits
        </span>
        <span className="text-xs font-semibold" style={{ color: "#00D9FF" }}>
          {useWorkspaceStore.getState().credits}
        </span>
      </div>
    </div>
  );
}
