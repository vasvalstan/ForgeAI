"use client";

import {
  CursorClick,
  TextT,
  ChatTeardrop,
  LinkSimple,
  CircleHalf,
  PencilSimple,
  ChatCircle,
  SquaresFour,
  Code,
  ChartLine,
} from "@phosphor-icons/react";
import { useState } from "react";

const toolGroups = [
  {
    id: "analytics",
    tools: [
      { id: "chart", Icon: ChartLine, label: "Analytics" },
    ],
  },
  {
    id: "navigate",
    tools: [
      { id: "cursor", Icon: CursorClick, label: "Select" },
      { id: "text", Icon: TextT, label: "Text" },
      { id: "note", Icon: ChatTeardrop, label: "Note" },
      { id: "link", Icon: LinkSimple, label: "Link" },
      { id: "contrast", Icon: CircleHalf, label: "Contrast" },
      { id: "pencil", Icon: PencilSimple, label: "Pencil" },
      { id: "chat", Icon: ChatCircle, label: "Chat" },
      { id: "grid", Icon: SquaresFour, label: "Grid" },
    ],
  },
  {
    id: "dev",
    tools: [
      { id: "code", Icon: Code, label: "Code" },
    ],
  },
];

export function BottomToolbar() {
  const [activeTool, setActiveTool] = useState("cursor");

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 rounded-full px-3 py-2 flex items-center gap-1 bg-forge-surface border border-forge-border shadow-panel">
      {toolGroups.map((group, gi) => (
        <div key={group.id} className="flex items-center">
          {gi > 0 && (
            <div className="w-px h-5 bg-forge-border mx-2" />
          )}
          {group.tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              title={tool.label}
              className={`p-2.5 rounded-lg transition-colors cursor-pointer ${
                activeTool === tool.id
                  ? "bg-forge-surface-2 text-forge-text"
                  : "text-forge-text-dim hover:bg-forge-surface-2 hover:text-forge-text"
              }`}
            >
              <tool.Icon size={20} weight={activeTool === tool.id ? "bold" : "regular"} />
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
