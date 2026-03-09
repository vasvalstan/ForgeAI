"use client";

import {
  CursorClick,
  TextT,
  Sticker,
  Shapes,
  CircleHalf,
  PencilSimple,
  ChatCircle,
  SquaresFour,
  Code,
} from "@phosphor-icons/react";
import { useState } from "react";

const tools = [
  { id: "cursor", Icon: CursorClick, label: "Select" },
  { id: "text", Icon: TextT, label: "Text" },
  { id: "note", Icon: Sticker, label: "Note" },
  { id: "shape", Icon: Shapes, label: "Shape" },
  { id: "contrast", Icon: CircleHalf, label: "Contrast" },
  { id: "pencil", Icon: PencilSimple, label: "Pencil" },
  { id: "chat", Icon: ChatCircle, label: "Chat" },
  { id: "grid", Icon: SquaresFour, label: "Grid" },
];

export function BottomToolbar() {
  const [activeTool, setActiveTool] = useState("cursor");

  return (
    <div className="pointer-events-none fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-4">
      <button
        type="button"
        onClick={() => globalThis.dispatchEvent(new CustomEvent("forge:add-floating-comment"))}
        className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-forge-border bg-forge-surface text-forge-text-secondary shadow-card transition-colors hover:bg-forge-surface-2 hover:text-forge-text"
        title="Add comment"
      >
        <Sticker size={22} />
      </button>

      <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-forge-border bg-forge-surface px-4 py-3 shadow-panel">
        {tools.map((tool, index) => (
          <div key={tool.id} className="flex items-center">
            <button
              onClick={() => setActiveTool(tool.id)}
              title={tool.label}
              className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors cursor-pointer ${
                activeTool === tool.id
                  ? "bg-forge-surface-2 text-forge-text"
                  : "text-forge-text-dim hover:bg-forge-surface-2 hover:text-forge-text"
              }`}
            >
              <tool.Icon size={18} weight={activeTool === tool.id ? "bold" : "regular"} />
            </button>
            {index < tools.length - 1 && (
              <div className="mx-2 h-5 w-px bg-forge-border" />
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-forge-border bg-forge-surface text-forge-text-secondary shadow-card transition-colors hover:bg-forge-surface-2 hover:text-forge-text"
        title="Code"
      >
        <Code size={22} />
      </button>
    </div>
  );
}
