"use client";

import { useCallback, useState, useRef } from "react";
import { Tldraw, Editor, createShapeId } from "tldraw";
import {
  StickyNoteShapeUtil,
  FeatureCardShapeUtil,
  RiskFlagShapeUtil,
} from "@/lib/canvas/shapes";
import { DiscoveryDropZone } from "./discovery-drop-zone";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";

const customShapeUtils = [
  StickyNoteShapeUtil,
  FeatureCardShapeUtil,
  RiskFlagShapeUtil,
];

export function CanvasPanel() {
  const selectedBoardId = useWorkspaceStore((s) => s.selectedBoardId);
  const editorRef = useRef<Editor | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

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
          },
        } as any);
      }

      setIsDraggingFile(false);
    },
    [selectedBoardId]
  );

  if (!selectedBoardId) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center max-w-md">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{
              background:
                "linear-gradient(135deg, rgba(0, 217, 255, 0.1), rgba(96, 165, 250, 0.1))",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#00D9FF"
              strokeWidth="1.5"
            >
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </div>
          <h2
            className="text-2xl font-bold mb-3 font-display"
            style={{
              backgroundImage: "linear-gradient(135deg, #00D9FF, #52F6E1)",
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
