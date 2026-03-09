"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Tldraw, Editor, createShapeId, AssetRecordType } from "tldraw";
import {
  StickyNoteShapeUtil,
  FeatureCardShapeUtil,
  RiskFlagShapeUtil,
  AlertCardShapeUtil,
  CommentShapeUtil,
  PRDCardShapeUtil,
  SpecCardShapeUtil,
  TaskListShapeUtil,
} from "@/lib/canvas/shapes";
import { DiscoveryDropZone } from "./discovery-drop-zone";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";
import {
  ArrowClockwise,
  ArrowCounterClockwise,
  CaretDown,
  DotsThree,
  MagnifyingGlass,
  ShareNetwork,
  SquaresFour,
} from "@phosphor-icons/react";
import { useSession } from "@/lib/auth-client";
import { getPresenceColor } from "@/lib/liveblocks-client";

const customShapeUtils = [
  StickyNoteShapeUtil,
  FeatureCardShapeUtil,
  RiskFlagShapeUtil,
  AlertCardShapeUtil,
  CommentShapeUtil,
  PRDCardShapeUtil,
  SpecCardShapeUtil,
  TaskListShapeUtil,
];

type ShapeEditMode = "insight" | "feature" | "risk" | "comment" | "new_comment";

type ShapeEditorState = {
  shapeId: string;
  shapeType: string;
  mode: ShapeEditMode;
  value: string;
  anchorX: number;
  anchorY: number;
  targetX?: number;
  targetY?: number;
  targetShapeId?: string;
};

type ShapeCommentTarget = {
  shapeId: string;
  shapeType: string;
  x: number;
  y: number;
  w: number;
  h: number;
  anchorX: number;
  anchorY: number;
};

type InlineComment = {
  id: string;
  text: string;
  author: string;
  authorColor: string;
};

export function CanvasPanel() {
  const selectedBoardId = useWorkspaceStore((s) => s.selectedBoardId);
  const editorRef = useRef<Editor | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [shapeEditor, setShapeEditor] = useState<ShapeEditorState | null>(null);
  const [editorDraft, setEditorDraft] = useState("");
  const { data: session } = useSession();

  const handleMount = useCallback((editor: Editor) => {
    editorRef.current = editor;
    (globalThis as any).__forgeEditor = editor;
  }, []);

  const handleFileDrop = useCallback(
    async (file: File) => {
      const editor = editorRef.current;
      if (!editor || !selectedBoardId) return;

      const text = await file.text();

      try {
        const res = await fetch(`/api/boards/${selectedBoardId}/agent`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "discovery",
            payload: {
              content: text,
              sourceType: file.name.endsWith(".vtt") ? "transcript" : "notes",
              fileName: file.name,
            },
          }),
        });

        if (!res.ok) throw new Error("Discovery request failed");

        const id = createShapeId();
        editor.createShape({
          id,
          type: "sticky-note",
          x: editor.getViewportScreenCenter().x - 130,
          y: editor.getViewportScreenCenter().y - 90,
          props: {
            w: 260,
            h: 180,
            text: `Processing "${file.name}"...\n\nThe Discovery Agent is analyzing your transcript.`,
            quote: "",
            category: "question",
            sentiment: 0,
            insightId: "",
            source: "",
            comments: "[]",
          },
        } as any);
      } catch {
        const id = createShapeId();
        editor.createShape({
          id,
          type: "sticky-note",
          x: editor.getViewportScreenCenter().x - 130,
          y: editor.getViewportScreenCenter().y - 90,
          props: {
            w: 260,
            h: 180,
            text: text.slice(0, 200) + (text.length > 200 ? "..." : ""),
            quote: "",
            category: "question",
            sentiment: 0,
            insightId: "",
            source: "",
            comments: "[]",
          },
        } as any);
      }

      setIsDraggingFile(false);
    },
    [selectedBoardId]
  );

  const createComment = useCallback((x: number, y: number, text = "", targetShapeId = "") => {
    const editor = editorRef.current;
    if (!editor) return;

    const userId = session?.user?.id ?? `anon-${Date.now()}`;
    const author = session?.user?.name?.trim() || "Anonymous";
    const authorColor = getPresenceColor(userId);

    editor.createShape({
      id: createShapeId(),
      type: "comment",
      x,
      y,
      props: {
        w: 220,
        h: 120,
        text,
        author,
        authorColor,
        targetShapeId,
      },
    } as any);
  }, [session?.user?.id, session?.user?.name]);

  const addInlineCommentToShape = useCallback(
    (targetShapeId: string, text: string) => {
      const editor = editorRef.current;
      if (!editor || !targetShapeId || !text.trim()) return;

      const shape = editor.getShape(targetShapeId as any) as any;
      if (!shape?.props) return;

      const userId = session?.user?.id ?? `anon-${Date.now()}`;
      const author = session?.user?.name?.trim() || "Anonymous";
      const authorColor = getPresenceColor(userId);

      let existing: InlineComment[] = [];
      const raw = shape.props.comments;
      if (typeof raw === "string" && raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            existing = parsed.filter((c) => c && typeof c.text === "string");
          }
        } catch {
          existing = [];
        }
      }

      const next: InlineComment[] = [
        ...existing,
        {
          id: `c-${Date.now()}`,
          text: text.trim(),
          author,
          authorColor,
        },
      ];

      editor.updateShape({
        id: shape.id,
        type: shape.type,
        props: {
          ...shape.props,
          comments: JSON.stringify(next),
        },
      } as any);
    },
    [session?.user?.id, session?.user?.name]
  );

  const handleSaveShapeEdit = useCallback(() => {
    const editor = editorRef.current;
    if (!editor || !shapeEditor) return;

    const currentShape = editor.getShape(shapeEditor.shapeId as any) as any;
    if (!currentShape) {
      setShapeEditor(null);
      return;
    }

    if (shapeEditor.mode === "feature") {
      const [nextTitleRaw, ...rest] = editorDraft.split("\n");
      const nextTitle = (nextTitleRaw || currentShape.props.title || "").trim();
      const nextDescription = rest.join("\n").trim();
      editor.updateShape({
        id: currentShape.id,
        type: currentShape.type,
        props: {
          ...currentShape.props,
          title: nextTitle,
          description: nextDescription,
        },
      } as any);
    } else if (shapeEditor.mode === "risk") {
      editor.updateShape({
        id: currentShape.id,
        type: currentShape.type,
        props: {
          ...currentShape.props,
          reasoning: editorDraft,
        },
      } as any);
    } else if (shapeEditor.mode === "new_comment") {
      if (shapeEditor.targetShapeId) {
        addInlineCommentToShape(shapeEditor.targetShapeId, editorDraft);
      } else {
        createComment(
          shapeEditor.targetX ?? shapeEditor.anchorX,
          shapeEditor.targetY ?? shapeEditor.anchorY,
          editorDraft,
          ""
        );
      }
    } else {
      editor.updateShape({
        id: currentShape.id,
        type: currentShape.type,
        props: {
          ...currentShape.props,
          text: editorDraft,
        },
      } as any);
    }

    setShapeEditor(null);
  }, [addInlineCommentToShape, createComment, editorDraft, shapeEditor]);

  useEffect(() => {
    const handleOpenEditor = (event: Event) => {
      const detail = (event as CustomEvent<ShapeEditorState>).detail;
      if (!detail?.shapeId) return;
      setShapeEditor(detail);
      setEditorDraft(detail.value ?? "");
    };

    const handleCommentForShape = (event: Event) => {
      const detail = (event as CustomEvent<ShapeCommentTarget>).detail;
      if (!detail) return;
      setShapeEditor({
        shapeId: detail.shapeId,
        shapeType: detail.shapeType,
        mode: "new_comment",
        value: "",
        anchorX: detail.anchorX,
        anchorY: detail.anchorY,
        targetX: detail.x,
        targetY: detail.y + detail.h + 16,
        targetShapeId: detail.shapeId,
      });
      setEditorDraft("");
    };

    const handleVisualize = async (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail?.shapeId || !selectedBoardId) return;

      try {
        await fetch(`/api/boards/${selectedBoardId}/agent`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "visualize",
            payload: {
              shapeId: detail.shapeId,
              description: `${detail.title}: ${detail.description}`,
              x: detail.x ?? 0,
              y: detail.y ?? 0,
            },
          }),
        });

        // Poll for shapes pushed by the backend via /api/canvas-updates
        let attempts = 0;
        const maxAttempts = 15; // 30 seconds max
        const pollInterval = setInterval(async () => {
          attempts++;
          try {
            const res = await fetch(
              `/api/canvas-updates?boardId=${encodeURIComponent(selectedBoardId)}`
            );
            if (!res.ok) return;
            const { shapes } = await res.json();
            if (shapes && shapes.length > 0) {
              clearInterval(pollInterval);
              const editor = editorRef.current;
              if (!editor) return;

              for (const shape of shapes) {
                if (shape.type === "image" && shape.props?.url) {
                  const assetId = AssetRecordType.createId();
                  editor.createAssets([
                    {
                      id: assetId,
                      type: "image",
                      typeName: "asset",
                      props: {
                        name: shape.props.name ?? "mock.jpg",
                        src: shape.props.url,
                        w: shape.props.w ?? 600,
                        h: shape.props.h ?? 400,
                        mimeType: "image/jpeg",
                        isAnimated: false,
                      },
                      meta: {},
                    } as any,
                  ]);
                  editor.createShape({
                    id: createShapeId(),
                    type: "image",
                    x: shape.x ?? 0,
                    y: shape.y ?? 0,
                    props: { w: shape.props.w ?? 600, h: shape.props.h ?? 400, assetId },
                  } as any);
                } else {
                  editor.createShape({
                    id: createShapeId(),
                    type: shape.type,
                    x: shape.x ?? 0,
                    y: shape.y ?? 0,
                    props: shape.props ?? {},
                  } as any);
                }
              }
              console.log(`[ForgeAI] Added ${shapes.length} shape(s) from AI agent`);
            }
          } catch {
            // ignore poll errors
          }
          if (attempts >= maxAttempts) clearInterval(pollInterval);
        }, 2000);
      } catch {
        // Silently fail
      }
    };

    const handleFloatingComment = () => {
      const editor = editorRef.current;
      if (!editor) return;
      const center = editor.getViewportScreenCenter();
      createComment(center.x - 110, center.y - 60, "");
    };

    globalThis.addEventListener("forge:open-shape-editor", handleOpenEditor);
    globalThis.addEventListener("forge:add-shape-comment", handleCommentForShape);
    globalThis.addEventListener("forge:visualize-feature", handleVisualize);
    globalThis.addEventListener("forge:add-floating-comment", handleFloatingComment);
    return () => {
      globalThis.removeEventListener("forge:open-shape-editor", handleOpenEditor);
      globalThis.removeEventListener("forge:add-shape-comment", handleCommentForShape);
      globalThis.removeEventListener("forge:visualize-feature", handleVisualize);
      globalThis.removeEventListener("forge:add-floating-comment", handleFloatingComment);
    };
  }, [createComment, selectedBoardId]);

  // Liveblocks real-time listener removed — shape delivery uses polling via /api/canvas-updates

  if (!selectedBoardId) {
    return (
      <div className="h-full flex items-center justify-center bg-forge-bg">
        <div className="text-center max-w-sm">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{
              background:
                "linear-gradient(135deg, rgba(124, 58, 237, 0.10), rgba(37, 99, 235, 0.08))",
              border: "1px solid rgba(15, 23, 42, 0.10)",
            }}
          >
            <SquaresFour size={28} style={{ color: "var(--color-primary-500)" }} />
          </div>
          <h2
            className="text-xl font-bold mb-2 font-display"
            style={{
              backgroundImage:
                "linear-gradient(135deg, var(--color-brand-500), var(--color-primary-500))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Select a Board
          </h2>
          <p className="text-forge-text-dim text-sm leading-relaxed">
            Choose a board from the sidebar to open its discovery canvas, or
            create a new one to start mapping your product insights.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-full w-full relative"
      onDragOver={(e) => {
        e.preventDefault();
        if (e.dataTransfer.types.includes("Files")) {
          setIsDraggingFile(true);
        }
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) {
          setIsDraggingFile(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (
          file &&
          (file.name.endsWith(".txt") ||
            file.name.endsWith(".md") ||
            file.name.endsWith(".vtt"))
        ) {
          handleFileDrop(file);
        }
        setIsDraggingFile(false);
      }}
    >
      <Tldraw
        key={selectedBoardId}
        shapeUtils={customShapeUtils}
        onMount={handleMount}
        persistenceKey={`forge-board-${selectedBoardId}`}
      />

      <div className="pointer-events-none absolute inset-x-4 top-4 z-50 flex items-start justify-between">
        <div className="pointer-events-auto flex h-12 items-center gap-1 rounded-full border border-forge-border bg-forge-surface px-2 shadow-card">
          <button className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-forge-text transition-colors hover:bg-forge-surface-2">
            Page 1
            <CaretDown size={14} className="text-forge-text-dim" />
          </button>
          <div className="mx-1 h-5 w-px bg-forge-border" />
          <button className="rounded-xl p-2 text-forge-text-dim transition-colors hover:bg-forge-surface-2 hover:text-forge-text">
            <ArrowCounterClockwise size={16} />
          </button>
          <button className="rounded-xl p-2 text-forge-text-dim transition-colors hover:bg-forge-surface-2 hover:text-forge-text">
            <ArrowClockwise size={16} />
          </button>
          <button className="rounded-xl p-2 text-forge-text-dim transition-colors hover:bg-forge-surface-2 hover:text-forge-text">
            <DotsThree size={16} />
          </button>
        </div>

        <div className="pointer-events-auto flex h-12 items-center gap-3 rounded-full border border-forge-border bg-forge-surface px-4 shadow-card">
          <MagnifyingGlass size={16} className="text-forge-text-secondary" />
          <div className="flex items-center -space-x-2">
            {["A", "D", "K"].map((initial, index) => (
              <div
                key={initial}
                className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-forge-surface text-[10px] font-semibold text-white"
                style={{
                  background:
                    index === 0
                      ? "#111827"
                      : index === 1
                        ? "#0f766e"
                        : "#7c3aed",
                }}
              >
                {initial}
              </div>
            ))}
          </div>
          <CaretDown size={14} className="text-forge-text-dim" />
          <button className="flex items-center gap-2 rounded-xl border border-forge-border px-3 py-2 text-sm font-medium text-forge-text transition-colors hover:bg-forge-surface-2">
            <ShareNetwork size={16} />
            Share
          </button>
        </div>
      </div>

      {shapeEditor && (
        <div
          className="fixed z-[220] w-[320px] rounded-2xl shadow-panel p-3 border"
          style={{
            left: shapeEditor.anchorX,
            top: shapeEditor.anchorY,
            borderColor: "var(--color-forge-border)",
            background: "var(--color-forge-surface)",
            boxShadow: "var(--shadow-dropdown)",
          }}
        >
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[11px] font-semibold text-forge-text-secondary">
              {shapeEditor.mode === "feature"
                ? "Edit feature card"
                : shapeEditor.mode === "risk"
                  ? "Edit risk"
                  : shapeEditor.mode === "comment"
                    ? "Edit comment"
                    : shapeEditor.mode === "new_comment"
                      ? "Add comment"
                      : "Edit insight"}
            </div>
            <span
              className="text-[10px] px-2 py-0.5 rounded-full text-primary-600 bg-primary-500/10 border border-primary-500/18"
            >
              {shapeEditor.mode === "new_comment" ? "Linked note" : "Quick edit"}
            </span>
          </div>
          <textarea
            value={editorDraft}
            onChange={(e) => setEditorDraft(e.target.value)}
            rows={shapeEditor.mode === "feature" ? 6 : shapeEditor.mode === "new_comment" ? 4 : 5}
            className="w-full rounded-xl px-3 py-2.5 text-xs leading-relaxed outline-none resize-none border border-forge-border text-forge-text bg-forge-surface"
            placeholder={
              shapeEditor.mode === "feature"
                ? "Title\n\nDescription"
                : shapeEditor.mode === "new_comment"
                  ? "Write a focused comment for this card..."
                  : "Write text..."
            }
            autoFocus
          />
          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShapeEditor(null)}
              className="px-2.5 py-1.5 rounded-lg text-[11px] cursor-pointer hover:bg-black/[0.04] dark:hover:bg-white/[0.04] text-forge-text-dim"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveShapeEdit}
              className="px-2.5 py-1.5 rounded-lg text-[11px] cursor-pointer font-medium text-white bg-primary-500 hover:bg-primary-600 transition-colors"
            >
              {shapeEditor.mode === "new_comment" ? "Post Comment" : "Save"}
            </button>
          </div>
        </div>
      )}

      {isDraggingFile && <DiscoveryDropZone />}
    </div>
  );
}
