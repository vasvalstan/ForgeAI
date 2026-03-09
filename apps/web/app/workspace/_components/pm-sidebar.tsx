"use client";

import { useCallback, useEffect, useState } from "react";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";
import {
  CaretRight,
  Plus,
  SidebarSimple,
  DotsThree,
  ArrowsOutSimple,
} from "@phosphor-icons/react";

type TreeSection = "boards" | "prds" | "transcripts" | "notes" | "insights";

function CategoryDot({ category }: { category: string }) {
  const colors: Record<string, string> = {
    pain_point: "var(--color-category-pain)",
    feature_request: "var(--color-category-feature)",
    praise: "var(--color-category-praise)",
    question: "var(--color-category-question)",
  };
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
      style={{ background: colors[category] ?? "var(--color-forge-text-dim)" }}
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
    setPRDs,
    openPrdViewer,
  } = useWorkspaceStore();

  const [creatingBoard, setCreatingBoard] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState("");

  useEffect(() => {
    if (!selectedBoardId) return;
    fetch(`/api/boards/${selectedBoardId}/prds`)
      .then((res) => (res.ok ? res.json() : { prds: [] }))
      .then((data) => setPRDs((data.prds ?? []).map((p: any) => ({
        id: p.id,
        boardId: p.boardId,
        title: p.title,
        status: p.status,
        updatedAt: p.updatedAt,
      }))))
      .catch(() => {});
  }, [selectedBoardId, setPRDs]);

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
      // Handle error silently
    }
  }, [newBoardTitle, boards, setBoards, selectBoard]);

  if (sidebarCollapsed) {
    return (
      <div className="h-full flex flex-col items-center py-3 gap-2">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg transition-colors cursor-pointer text-forge-text-dim hover:bg-black/5 dark:hover:bg-white/5"
          title="Expand sidebar"
        >
          <SidebarSimple size={18} />
        </button>
      </div>
    );
  }

  const boardDiscoveries = discoveries.filter((d) => d.boardId === selectedBoardId);
  const boardInsights = insights.filter((i) =>
    boardDiscoveries.some((d) => d.id === i.discoveryId)
  );
  const boardPRDs = prds.filter((p) => p.boardId === selectedBoardId);
  const boardNotes = meetingNotes.filter((n) => n.boardId === selectedBoardId);

  const sections: {
    key: TreeSection;
    label: string;
    items: { id: string; label: string; meta?: string; category?: string }[];
  }[] = [
    {
      key: "boards",
      label: "Boards",
      items: boards.map((b) => ({ id: b.id, label: b.title, meta: b.updatedAt })),
    },
    {
      key: "prds",
      label: "PRDs",
      items: boardPRDs.map((p) => ({ id: p.id, label: p.title, meta: p.updatedAt })),
    },
    {
      key: "transcripts",
      label: "Transcripts",
      items: boardDiscoveries.map((d) => ({ id: d.id, label: `${d.sourceType} — ${d.status}`, meta: d.createdAt })),
    },
    {
      key: "notes",
      label: "Meeting Notes",
      items: boardNotes.map((n) => ({ id: n.id, label: n.title, meta: n.updatedAt })),
    },
    {
      key: "insights",
      label: "Insights",
      items: boardInsights.map((i) => ({
        id: i.id,
        label: i.content.slice(0, 60) + (i.content.length > 60 ? "..." : ""),
        category: i.category,
      })),
    },
  ];

  return (
    <div className="h-full flex flex-col bg-forge-surface px-3 py-4" style={{ fontFamily: "var(--font-sans)" }}>
      <header className="px-2 pb-4 flex-shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] font-semibold tracking-[0.06em] text-forge-text-secondary uppercase">
            Projects
          </span>
          <button
            onClick={toggleSidebar}
            className="p-1 rounded-lg transition-colors cursor-pointer text-forge-text-dim hover:bg-forge-surface-2 hover:text-forge-text"
          >
            <ArrowsOutSimple size={12} />
          </button>
        </div>
      </header>

      <div className="rounded-[20px] border border-forge-border bg-forge-surface px-3 py-3 shadow-card">
        <div className="flex items-center justify-between px-2 py-1.5 text-forge-text-secondary">
          <span className="text-[13px] font-medium">Personal</span>
          <div className="flex items-center gap-1">
            <button className="p-0.5 rounded text-forge-text-dim hover:text-forge-text cursor-pointer transition-colors">
              <Plus size={14} />
            </button>
            <button className="p-0.5 rounded text-forge-text-dim hover:text-forge-text cursor-pointer transition-colors">
              <DotsThree size={14} />
            </button>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between px-2 py-1.5 text-forge-text-secondary">
          <span className="text-[13px] font-medium">Team</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCreatingBoard(true)}
              className="p-0.5 rounded text-forge-text-dim hover:text-forge-text cursor-pointer transition-colors"
            >
              <Plus size={14} />
            </button>
            <button className="p-0.5 rounded text-forge-text-dim hover:text-forge-text cursor-pointer transition-colors">
              <DotsThree size={14} />
            </button>
          </div>
        </div>

        <div className="mt-1 space-y-1">
          {boards.map((board) => {
            const isSelected = board.id === selectedBoardId;
            return (
              <div key={board.id}>
                <button
                  onClick={() => selectBoard(board.id)}
                  className={`group w-full flex items-center justify-between px-3 py-2 rounded-xl text-[13px] transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-forge-amber-bg text-forge-text font-medium"
                      : "text-forge-text-secondary hover:bg-forge-surface-2"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <CaretRight size={10} className="text-forge-text-dim flex-shrink-0" />
                    <span className="truncate">{board.title}</span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); }}
                    className="p-0.5 rounded opacity-0 group-hover:opacity-100 text-forge-text-dim hover:text-forge-text cursor-pointer transition-all"
                  >
                    <Plus size={12} />
                  </button>
                </button>

                {isSelected && (
                  <div className="ml-4 mt-1 space-y-1">
                    {sections.filter(s => s.key !== "boards").map(({ key, label, items }) => {
                      const isExpanded = expandedSections.has(key);
                      return (
                        <div key={key}>
                          <button
                            onClick={() => toggleSection(key)}
                            className="w-full flex items-center gap-1.5 px-2 py-1 rounded-lg text-[12px] text-forge-text-dim hover:bg-forge-surface-2 hover:text-forge-text-secondary transition-colors cursor-pointer"
                          >
                            <span className="transition-transform duration-200" style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}>
                              <CaretRight size={8} />
                            </span>
                            <span>{label}</span>
                            <span className="ml-auto text-[10px] tabular-nums opacity-60">{items.length}</span>
                          </button>
                          {isExpanded && items.length > 0 && (
                            <div className="ml-2 mt-0.5 space-y-1">
                              {items.map((item) => (
                                <button
                                  key={item.id}
                                  onClick={() => { if (key === "prds") openPrdViewer(item.id); }}
                                  className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] cursor-pointer transition-colors text-left ${
                                    item.category === "question"
                                      ? "bg-forge-amber-bg/80 text-forge-text"
                                      : "text-forge-text-secondary hover:bg-forge-surface-2"
                                  }`}
                                >
                                  {item.category && <CategoryDot category={item.category} />}
                                  <span className="truncate">{item.label}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* New board input */}
          {creatingBoard && (
            <div className="px-2 py-1">
              <input
                autoFocus
                value={newBoardTitle}
                onChange={(e) => setNewBoardTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateBoard();
                  if (e.key === "Escape") { setCreatingBoard(false); setNewBoardTitle(""); }
                }}
                onBlur={() => { if (!newBoardTitle.trim()) { setCreatingBoard(false); setNewBoardTitle(""); } }}
                placeholder="Board name..."
                className="w-full text-xs px-2.5 py-2 rounded-xl outline-none bg-forge-surface text-forge-text border border-primary-500/25 focus:ring-2 focus:ring-primary-500/15"
              />
            </div>
          )}

          {boards.length === 0 && !creatingBoard && (
            <div className="px-4 py-2 text-center">
              <p className="text-[11px] mb-1 text-forge-text-dim">No boards yet</p>
              <button
                onClick={() => setCreatingBoard(true)}
                className="text-[11px] font-medium text-primary-500 hover:text-primary-600 cursor-pointer"
              >
                + Create your first board
              </button>
            </div>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between px-2 py-1.5 text-forge-text-secondary">
          <span className="text-[13px] font-medium">Drafts</span>
          <div className="flex items-center gap-1">
            <button className="p-0.5 rounded text-forge-text-dim hover:text-forge-text cursor-pointer transition-colors">
              <Plus size={14} />
            </button>
            <button className="p-0.5 rounded text-forge-text-dim hover:text-forge-text cursor-pointer transition-colors">
              <DotsThree size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1" />

      <div className="flex-shrink-0 px-2 pt-4 flex items-center justify-between text-[13px]">
        <span className="text-forge-text-secondary">Free version</span>
        <button className="text-forge-text-dim hover:text-forge-text transition-colors cursor-pointer font-medium">
          Learn more
        </button>
      </div>
    </div>
  );
}
