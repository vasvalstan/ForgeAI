"use client";

import { useCallback, useEffect, useState } from "react";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";
import {
  SquaresFour,
  FileText,
  Microphone,
  NotePencil,
  Lightning,
  CaretRight,
  Plus,
  SidebarSimple,
  MagnifyingGlass,
  MagicWand,
  Kanban,
  GearSix,
  CreditCard,
  SignOut,
  DotsThree,
  UserCircle,
} from "@phosphor-icons/react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

type TreeSection = "boards" | "prds" | "transcripts" | "notes" | "insights";

const SECTION_META: Record<
  TreeSection,
  { label: string; Icon: React.ComponentType<{ size?: number; weight?: "regular" | "bold" | "fill" | "duotone" }> }
> = {
  boards: { label: "Boards", Icon: SquaresFour },
  prds: { label: "PRDs", Icon: FileText },
  transcripts: { label: "Transcripts", Icon: Microphone },
  notes: { label: "Meeting Notes", Icon: NotePencil },
  insights: { label: "Insights", Icon: Lightning },
};

function CategoryDot({ category }: { category: string }) {
  const colors: Record<string, string> = {
    pain_point: "var(--color-category-pain, #EF4444)",
    feature_request: "var(--color-category-feature, #2563EB)",
    praise: "var(--color-category-praise, #16A34A)",
    question: "var(--color-category-question, #F59E0B)",
  };
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
      style={{ background: colors[category] ?? "#CBD5E1" }}
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
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

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
      // Handle error silently for now
    }
  }, [newBoardTitle, boards, setBoards, selectBoard]);

  if (sidebarCollapsed) {
    return (
      <div className="h-full flex flex-col items-center py-3 gap-2">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg transition-colors cursor-pointer hover:bg-black/5"
          style={{ color: "#64748B" }}
          title="Expand sidebar"
        >
          <SidebarSimple size={18} />
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
  const credits = useWorkspaceStore.getState().credits;

  return (
    <div
      className="h-full flex flex-col glass shadow-panel"
      style={{ fontFamily: "var(--font-sans)" }}
    >
      {/* Brand Header */}
      <header
        className="px-4 py-4 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--color-forge-border)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, var(--color-brand-500), var(--color-brand-400))",
            }}
          >
            <span className="font-display font-bold tracking-tight text-white text-xs">F</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display font-semibold tracking-tight text-[13px]" style={{ color: "#0F172A" }}>
              ForgeAI
            </div>
            <div className="text-[11px] truncate" style={{ color: "#64748B" }}>
              {selectedBoard?.title ?? "No board selected"}
            </div>
          </div>
          <button
            onClick={toggleSidebar}
            className="p-1 rounded-lg transition-colors cursor-pointer hover:bg-black/5"
            style={{ color: "#64748B" }}
          >
            <SidebarSimple size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="mt-4">
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-2 transition-shadow"
            style={{
              background: "rgba(15, 23, 42, 0.03)",
              border: "1px solid rgba(15, 23, 42, 0.12)",
            }}
          >
            <MagnifyingGlass
              size={16}
              style={{ color: "#64748B", flexShrink: 0 }}
            />
            <input
              type="text"
              placeholder="Search..."
              className="w-full bg-transparent text-xs outline-none placeholder:text-slate-400"
              style={{ color: "#0F172A" }}
              onFocus={(e) => {
                const wrapper = e.currentTarget.parentElement;
                if (!wrapper) return;
                (wrapper as HTMLElement).style.borderColor =
                  "rgba(37, 99, 235, 0.55)";
                (wrapper as HTMLElement).style.boxShadow =
                  "0 0 0 2px rgba(37, 99, 235, 0.14)";
              }}
              onBlur={(e) => {
                const wrapper = e.currentTarget.parentElement;
                if (!wrapper) return;
                (wrapper as HTMLElement).style.borderColor =
                  "rgba(15, 23, 42, 0.12)";
                (wrapper as HTMLElement).style.boxShadow = "none";
              }}
            />
          </div>
        </div>
      </header>

      {/* Tree Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 pt-4 pb-6">
        {sections.map(({ key, items }) => {
          const meta = SECTION_META[key];
          const isExpanded = expandedSections.has(key);
          const isBoards = key === "boards";
          const SectionIconComponent = meta.Icon;

          return (
            <div key={key} className="mb-4">
              {/* Section header */}
              <div
                className="group w-full flex items-center gap-2 px-2.5 py-2.5 rounded-lg transition-colors hover:bg-black/[0.03]"
                style={{ color: "#64748B" }}
              >
                <button
                  type="button"
                  onClick={() => toggleSection(key)}
                  className="flex-1 min-w-0 flex items-center gap-2 cursor-pointer"
                  style={{ color: "inherit" }}
                >
                  <span
                    className="transition-transform duration-200"
                    style={{
                      transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                    }}
                  >
                    <CaretRight size={10} />
                  </span>
                  <SectionIconComponent size={13} />
                  <span
                    className="font-medium"
                    style={{
                      fontSize: "11px",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}
                  >
                    {meta.label}
                  </span>
                  <span
                    className="ml-auto text-[10px] tabular-nums"
                    style={{ color: "rgba(100,116,139,0.75)" }}
                  >
                    {items.length}
                  </span>
                </button>
                {isBoards && (
                  <button
                    type="button"
                    onClick={() => setCreatingBoard(true)}
                    aria-label="Create new board"
                    className="opacity-0 group-hover:opacity-100 inline-flex items-center rounded-md p-0.5 transition-all cursor-pointer hover:bg-black/5"
                    style={{ color: "#64748B" }}
                  >
                    <Plus size={13} />
                  </button>
                )}
              </div>

              {/* New board input */}
              {isBoards && creatingBoard && isExpanded && (
                <div className="px-7 py-2">
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
                    className="w-full text-xs px-2.5 py-2 rounded-lg outline-none"
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid rgba(37, 99, 235, 0.25)",
                      color: "#0F172A",
                    }}
                  />
                </div>
              )}

              {/* Items */}
              {isExpanded && (
                <div className="mt-3 space-y-2">
                  {items.length === 0 && !isBoards && (
                    <div
                      className="px-7 py-3 text-[11px]"
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
                      <div
                        key={item.id}
                        className="group/item w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-[13px] transition-colors hover:bg-black/[0.03]"
                        style={
                          isSelected
                            ? {
                                background: "rgba(37, 99, 235, 0.08)",
                                color: "#0F172A",
                                fontWeight: 500,
                              }
                            : {
                                color: "#334155",
                              }
                        }
                      >
                        <button
                          type="button"
                          onClick={() => {
                            if (isBoard) selectBoard(item.id);
                            else if (key === "prds") openPrdViewer(item.id);
                          }}
                          className="flex-1 min-w-0 flex items-center gap-2.5 text-left cursor-pointer"
                          style={{ color: "inherit", fontWeight: "inherit" }}
                        >
                          {item.category && (
                            <CategoryDot category={item.category} />
                          )}
                          {isBoard && isSelected && (
                            <MagicWand size={14} style={{ color: "#2563EB" }} />
                          )}
                          {isBoard && !isSelected && (
                            <Kanban size={14} style={{ color: "#64748B" }} />
                          )}
                          <span className="truncate">{item.label}</span>
                        </button>
                        {/* Triple-dot overflow menu on hover */}
                        {hasMounted ? (
                          <DropdownMenu.Root>
                            <DropdownMenu.Trigger asChild>
                              <button
                                type="button"
                                aria-label="Open item menu"
                                className="opacity-0 group-hover/item:opacity-100 p-0.5 rounded transition-opacity cursor-pointer hover:bg-black/5"
                                style={{ color: "#64748B" }}
                              >
                                <DotsThree size={14} />
                              </button>
                            </DropdownMenu.Trigger>
                            <DropdownMenu.Portal>
                              <DropdownMenu.Content
                                sideOffset={4}
                                align="end"
                                className="min-w-[140px] rounded-lg p-1 text-xs"
                                style={{
                                  background: "#FFFFFF",
                                  border: "1px solid rgba(15, 23, 42, 0.12)",
                                  boxShadow: "0 14px 40px rgba(15, 23, 42, 0.16)",
                                  color: "#0F172A",
                                  zIndex: 50,
                                }}
                              >
                                <DropdownMenu.Item className="px-2.5 py-1.5 rounded-md outline-none cursor-pointer hover:bg-black/5 transition-colors">
                                  Rename
                                </DropdownMenu.Item>
                                <DropdownMenu.Item className="px-2.5 py-1.5 rounded-md outline-none cursor-pointer hover:bg-black/5 transition-colors">
                                  Duplicate
                                </DropdownMenu.Item>
                                <DropdownMenu.Separator className="my-1 h-px" style={{ background: "rgba(15, 23, 42, 0.08)" }} />
                                <DropdownMenu.Item className="px-2.5 py-1.5 rounded-md outline-none cursor-pointer hover:bg-black/5 transition-colors" style={{ color: "#EF4444" }}>
                                  Delete
                                </DropdownMenu.Item>
                              </DropdownMenu.Content>
                            </DropdownMenu.Portal>
                          </DropdownMenu.Root>
                        ) : (
                          <button
                            type="button"
                            aria-label="Item menu loading"
                            disabled
                            className="opacity-0 group-hover/item:opacity-100 p-0.5 rounded transition-opacity"
                            style={{ color: "#64748B" }}
                          >
                            <DotsThree size={14} />
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {isBoards && items.length === 0 && !creatingBoard && (
                    <div className="px-6 py-2 text-center">
                      <p
                        className="text-[11px] mb-1.5"
                        style={{ color: "#64748B" }}
                      >
                        No boards yet
                      </p>
                      <button
                        onClick={() => setCreatingBoard(true)}
                        className="text-[11px] font-medium transition-colors cursor-pointer"
                        style={{ color: "#2563EB" }}
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

      {/* Account Card + Settings Popover */}
      <div
        className="flex-shrink-0 px-2 py-2"
        style={{ borderTop: "1px solid var(--color-forge-border)" }}
      >
        {/* Credits indicator */}
        <div
          className="flex items-center justify-between px-2 py-1 mb-1.5 rounded-md text-[11px]"
          style={{ background: "rgba(37, 99, 235, 0.08)" }}
        >
          <span style={{ color: "#64748B" }}>Credits remaining</span>
          <span className="font-semibold tabular-nums" style={{ color: "#2563EB" }}>
            {credits}
          </span>
        </div>

        {/* Account card with settings popover */}
        {hasMounted ? (
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors cursor-pointer hover:bg-black/[0.03]"
              >
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center"
                  style={{ background: "rgba(15, 23, 42, 0.04)" }}
                >
                  <UserCircle size={18} style={{ color: "#64748B" }} />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-[12px] font-medium truncate" style={{ color: "#0F172A" }}>
                    My Workspace
                  </div>
                  <div className="text-[10px] truncate" style={{ color: "#64748B" }}>
                    Free plan
                  </div>
                </div>
                <GearSix size={14} style={{ color: "#64748B" }} />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                sideOffset={6}
                side="top"
                align="start"
                className="min-w-[200px] rounded-lg p-1.5 text-xs"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid rgba(15, 23, 42, 0.12)",
                  boxShadow: "0 14px 40px rgba(15, 23, 42, 0.16)",
                  color: "#0F172A",
                  zIndex: 50,
                }}
              >
                <DropdownMenu.Label className="px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider" style={{ color: "#64748B" }}>
                  Account
                </DropdownMenu.Label>
                <DropdownMenu.Item className="flex items-center gap-2 px-2.5 py-1.5 rounded-md outline-none cursor-pointer hover:bg-black/5 transition-colors">
                  <GearSix size={14} /> Settings
                </DropdownMenu.Item>
                <DropdownMenu.Item className="flex items-center gap-2 px-2.5 py-1.5 rounded-md outline-none cursor-pointer hover:bg-black/5 transition-colors">
                  <CreditCard size={14} /> Billing
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="my-1 h-px" style={{ background: "rgba(15, 23, 42, 0.08)" }} />
                <DropdownMenu.Item className="flex items-center gap-2 px-2.5 py-1.5 rounded-md outline-none cursor-pointer hover:bg-black/5 transition-colors" style={{ color: "#EF4444" }}>
                  <SignOut size={14} /> Sign out
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        ) : (
          <button
            type="button"
            disabled
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors"
          >
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center"
              style={{ background: "rgba(15, 23, 42, 0.04)" }}
            >
              <UserCircle size={18} style={{ color: "#64748B" }} />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="text-[12px] font-medium truncate" style={{ color: "#0F172A" }}>
                My Workspace
              </div>
              <div className="text-[10px] truncate" style={{ color: "#64748B" }}>
                Free plan
              </div>
            </div>
            <GearSix size={14} style={{ color: "#64748B" }} />
          </button>
        )}
      </div>
    </div>
  );
}
