"use client";

import { useCallback, useState, useMemo } from "react";
import { Tldraw, Editor, createShapeId } from "tldraw";
import {
  StickyNoteShapeUtil,
  FeatureCardShapeUtil,
  RiskFlagShapeUtil,
} from "@/lib/canvas/shapes";
import { AISidebar } from "./_components/ai-sidebar";
import { DiscoveryDropZone } from "./_components/discovery-drop-zone";
import { Sparkle } from "@phosphor-icons/react";

const customShapeUtils = [StickyNoteShapeUtil, FeatureCardShapeUtil, RiskFlagShapeUtil];

interface BoardPageProps {
  params: Promise<{ boardId: string }>;
}

export default function BoardPage({ params }: BoardPageProps) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const resolvedParams = useMemo(() => {
    let boardId = "";
    params.then((p) => (boardId = p.boardId));
    return { boardId };
  }, [params]);

  const handleMount = useCallback((editor: Editor) => {
    setEditor(editor);
  }, []);

  const handleFileDrop = useCallback(
    async (file: File) => {
      if (!editor) return;

      const text = await file.text();

      // TODO: Send to Motia backend for "Explosion"
      // For now, create a single sticky note with the content
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
        },
      } as any);

      setIsDraggingFile(false);
    },
    [editor]
  );

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-forge-bg">
      {/* Canvas */}
      <div
        className="flex-1 relative"
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
          if (file && (file.name.endsWith(".txt") || file.name.endsWith(".md") || file.name.endsWith(".vtt"))) {
            handleFileDrop(file);
          }
          setIsDraggingFile(false);
        }}
      >
        <Tldraw
          shapeUtils={customShapeUtils}
          onMount={handleMount}
          persistenceKey={`forge-board-${resolvedParams.boardId}`}
        />

        {/* Top-right controls */}
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="glass rounded-xl px-4 py-2.5 text-sm font-medium text-forge-text hover:bg-forge-surface-2 transition-all duration-200 flex items-center gap-2 cursor-pointer"
          >
            <Sparkle size={16} style={{ color: "var(--color-brand-500)" }} />
            AI Agent
          </button>
        </div>

        {/* Drop zone overlay */}
        {isDraggingFile && <DiscoveryDropZone />}
      </div>

      {/* AI Sidebar */}
      {sidebarOpen && (
        <AISidebar
          boardId={resolvedParams.boardId}
          onClose={() => setSidebarOpen(false)}
          editor={editor}
        />
      )}
    </div>
  );
}
