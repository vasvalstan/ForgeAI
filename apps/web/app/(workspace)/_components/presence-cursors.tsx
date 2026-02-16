"use client";

import { useOthers } from "@/lib/liveblocks";
import { memo } from "react";

function CursorComponent({
  x,
  y,
  name,
  color,
}: {
  x: number;
  y: number;
  name: string;
  color: string;
}) {
  return (
    <div
      className="pointer-events-none absolute z-50"
      style={{
        left: x,
        top: y,
        transition: "left 0.05s linear, top 0.05s linear",
      }}
    >
      {/* Cursor arrow */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        style={{ filter: `drop-shadow(0 1px 2px rgba(0,0,0,0.3))` }}
      >
        <path
          d="M3 3l14 6.5L10.5 12l-2.5 7L3 3z"
          fill={color}
          stroke="white"
          strokeWidth="1"
        />
      </svg>
      {/* Name label */}
      <div
        className="absolute left-4 top-4 px-2 py-0.5 rounded-md text-[10px] font-medium text-white whitespace-nowrap"
        style={{
          background: color,
          boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
        }}
      >
        {name}
      </div>
    </div>
  );
}

const MemoizedCursor = memo(CursorComponent);

export function PresenceCursors() {
  const others = useOthers();

  return (
    <>
      {others.map((other) => {
        if (!other.presence?.cursor) return null;
        return (
          <MemoizedCursor
            key={other.connectionId}
            x={other.presence.cursor.x}
            y={other.presence.cursor.y}
            name={other.info?.name ?? "Anonymous"}
            color={other.info?.color ?? "#9CA3AF"}
          />
        );
      })}
    </>
  );
}
