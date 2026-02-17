"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Tldraw, Editor, createShapeId, AssetRecordType } from "tldraw";
import {
  StickyNoteShapeUtil,
  FeatureCardShapeUtil,
  RiskFlagShapeUtil,
  CommentShapeUtil,
  PRDCardShapeUtil,
  SpecCardShapeUtil,
  TaskListShapeUtil,
} from "@/lib/canvas/shapes";
import { DiscoveryDropZone } from "./discovery-drop-zone";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";
import { ChatCircleDots, SquaresFour } from "@phosphor-icons/react";
import { useSession } from "@/lib/auth-client";
import { getPresenceColor } from "@/lib/liveblocks-client";

const customShapeUtils = [
  StickyNoteShapeUtil,
  FeatureCardShapeUtil,
  RiskFlagShapeUtil,
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

    // Seed demo shapes on first load so the canvas isn't empty
    const existing = editor.getCurrentPageShapes();
    if (existing.length === 0) {
      seedDemoShapes(editor);
    }
  }, []);

  const handleFileDrop = useCallback(
    async (file: File) => {
      const editor = editorRef.current;
      if (!editor || !selectedBoardId) return;

      const text = await file.text();

      try {
        const res = await fetch("http://localhost:3111/discover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            boardId: selectedBoardId,
            content: text,
            sourceType: file.name.endsWith(".vtt") ? "transcript" : "notes",
            fileName: file.name,
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

  const handleAddComment = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const center = editor.getViewportScreenCenter();
    createComment(center.x - 110, center.y - 60, "");
  }, [createComment]);

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

      const MOTIA_BASE = process.env.NEXT_PUBLIC_MOTIA_BASE_URL || "http://localhost:3111";
      try {
        await fetch(`${MOTIA_BASE}/visualize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            boardId: selectedBoardId,
            shapeId: detail.shapeId,
            description: `${detail.title}: ${detail.description}`,
            x: detail.x ?? 0,
            y: detail.y ?? 0,
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

    globalThis.addEventListener("forge:open-shape-editor", handleOpenEditor);
    globalThis.addEventListener("forge:add-shape-comment", handleCommentForShape);
    globalThis.addEventListener("forge:visualize-feature", handleVisualize);
    return () => {
      globalThis.removeEventListener("forge:open-shape-editor", handleOpenEditor);
      globalThis.removeEventListener("forge:add-shape-comment", handleCommentForShape);
      globalThis.removeEventListener("forge:visualize-feature", handleVisualize);
    };
  }, [createComment, selectedBoardId]);

  // Liveblocks real-time listener removed — shape delivery uses polling via /api/canvas-updates

  if (!selectedBoardId) {
    return (
      <div className="h-full flex items-center justify-center">
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

      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={handleAddComment}
          className="glass rounded-xl px-3 py-2 text-sm font-medium transition-colors cursor-pointer hover:bg-forge-surface-2 flex items-center gap-2"
          style={{ color: "var(--color-forge-text)" }}
          title="Drop a comment bubble"
        >
          <ChatCircleDots size={16} style={{ color: "var(--color-brand-500)" }} />
          Add Comment
        </button>
      </div>

      {shapeEditor && (
        <div
          className="fixed z-[220] w-[320px] rounded-2xl shadow-panel p-3 border"
          style={{
            left: shapeEditor.anchorX,
            top: shapeEditor.anchorY,
            borderColor: "rgba(15, 23, 42, 0.10)",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 100%)",
            boxShadow: "0 18px 44px rgba(15, 23, 42, 0.18)",
          }}
        >
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[11px] font-semibold" style={{ color: "var(--color-forge-text-secondary)" }}>
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
              className="text-[10px] px-2 py-0.5 rounded-full"
              style={{
                color: "#1D4ED8",
                background: "rgba(37, 99, 235, 0.10)",
                border: "1px solid rgba(37, 99, 235, 0.18)",
              }}
            >
              {shapeEditor.mode === "new_comment" ? "Linked note" : "Quick edit"}
            </span>
          </div>
          <textarea
            value={editorDraft}
            onChange={(e) => setEditorDraft(e.target.value)}
            className="w-full rounded-xl px-3 py-2.5 text-xs leading-relaxed outline-none resize-none"
            rows={shapeEditor.mode === "feature" ? 6 : shapeEditor.mode === "new_comment" ? 4 : 5}
            style={{
              border: "1px solid rgba(15, 23, 42, 0.12)",
              color: "#0F172A",
              background: "#FFFFFF",
            }}
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
              className="px-2.5 py-1.5 rounded-md text-[11px] cursor-pointer hover:bg-black/[0.04]"
              style={{ color: "var(--color-forge-text-dim)" }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveShapeEdit}
              className="px-2.5 py-1.5 rounded-md text-[11px] cursor-pointer font-medium"
              style={{
                color: "white",
                background: "var(--color-primary-500)",
              }}
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

/**
 * Seed the canvas with demo shapes to showcase the custom shape types.
 */
function seedDemoShapes(editor: Editor) {
  const cx = 400;
  const cy = 300;

  // Pain point sticky notes
  editor.createShape({
    id: createShapeId(),
    type: "sticky-note",
    x: cx - 580,
    y: cy - 280,
    props: {
      w: 260, h: 180,
      text: "Users can't find the export button. 5 out of 8 participants failed this task.",
      quote: "I looked everywhere but couldn't figure out how to get my data out.",
      category: "pain_point",
      sentiment: -0.7,
      insightId: "demo-1",
      source: "",
    },
  } as any);

  editor.createShape({
    id: createShapeId(),
    type: "sticky-note",
    x: cx - 580,
    y: cy - 60,
    props: {
      w: 260, h: 180,
      text: "Onboarding flow takes too long. Average completion time was 12 minutes.",
      quote: "I almost gave up during setup because there were so many steps.",
      category: "pain_point",
      sentiment: -0.5,
      insightId: "demo-2",
      source: "",
    },
  } as any);

  // Feature request sticky notes
  editor.createShape({
    id: createShapeId(),
    type: "sticky-note",
    x: cx - 280,
    y: cy - 280,
    props: {
      w: 260, h: 180,
      text: "Users want real-time collaboration. Mentioned in 6 of 8 interviews.",
      quote: "If I could work on this with my team at the same time, that would be huge.",
      category: "feature_request",
      sentiment: 0.2,
      insightId: "demo-3",
      source: "",
    },
  } as any);

  editor.createShape({
    id: createShapeId(),
    type: "sticky-note",
    x: cx - 280,
    y: cy - 60,
    props: {
      w: 260, h: 180,
      text: "Keyboard shortcuts requested repeatedly. Power users feel slowed down by mouse-only workflows.",
      quote: "I wish I could just hit Cmd+K to do everything.",
      category: "feature_request",
      sentiment: 0.1,
      insightId: "demo-4",
      source: "",
    },
  } as any);

  // Praise sticky notes
  editor.createShape({
    id: createShapeId(),
    type: "sticky-note",
    x: cx + 20,
    y: cy - 280,
    props: {
      w: 260, h: 180,
      text: "Visual design praised by all participants. Dark theme especially loved.",
      quote: "This is honestly the most beautiful tool I've used for this kind of work.",
      category: "praise",
      sentiment: 0.9,
      insightId: "demo-5",
      source: "",
    },
  } as any);

  // Question sticky note
  editor.createShape({
    id: createShapeId(),
    type: "sticky-note",
    x: cx + 20,
    y: cy - 60,
    props: {
      w: 260, h: 180,
      text: "Unclear how the AI features are priced. Users worry about hidden costs.",
      quote: "Is this going to get expensive as my team grows?",
      category: "question",
      sentiment: -0.1,
      insightId: "demo-6",
      source: "",
    },
  } as any);

  // Feature cards
  editor.createShape({
    id: createShapeId(),
    type: "feature-card",
    x: cx - 580,
    y: cy + 180,
    props: {
      w: 300, h: 160,
      title: "Real-time Collaboration",
      description: "Enable multiple users to edit the same board simultaneously with live cursors and presence indicators.",
      priority: "critical",
    },
  } as any);

  editor.createShape({
    id: createShapeId(),
    type: "feature-card",
    x: cx - 250,
    y: cy + 180,
    props: {
      w: 300, h: 160,
      title: "Keyboard Shortcuts System",
      description: "Implement a comprehensive Cmd+K command palette and keyboard shortcuts for power users.",
      priority: "high",
    },
  } as any);

  editor.createShape({
    id: createShapeId(),
    type: "feature-card",
    x: cx + 80,
    y: cy + 180,
    props: {
      w: 300, h: 160,
      title: "Improved Export Flow",
      description: "Redesign the export feature with clearer affordances and multiple format options (PDF, PNG, CSV).",
      priority: "high",
    },
  } as any);

  // Risk flags
  editor.createShape({
    id: createShapeId(),
    type: "risk-flag",
    x: cx + 320,
    y: cy - 280,
    props: {
      w: 280, h: 140,
      severity: "high",
      reasoning: "3 features marked as 'critical' or 'high' priority. Team bandwidth supports 1 major initiative per quarter. Risk of scope creep.",
      targetShapeId: "",
    },
  } as any);

  editor.createShape({
    id: createShapeId(),
    type: "risk-flag",
    x: cx + 320,
    y: cy - 100,
    props: {
      w: 280, h: 140,
      severity: "medium",
      reasoning: "Real-time collaboration is the top request but has no pain point directly tied to it. Validate that this solves a real workflow issue, not just a 'nice to have.'",
      targetShapeId: "",
    },
  } as any);

  // Zoom to fit all shapes
  setTimeout(() => {
    editor.zoomToFit({ animation: { duration: 500 } });
  }, 100);
}
