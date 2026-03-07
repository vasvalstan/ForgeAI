import { NextRequest, NextResponse } from "next/server";
import { requireBoardAccess } from "@/lib/tenant-auth";

/**
 * In-memory store for pending canvas shapes pushed by the Motia backend.
 * Keyed by boardId → array of shape payloads.
 * This avoids relying on Liveblocks real-time for shape delivery.
 */
type PendingShape = Record<string, unknown>;

const pendingShapes = new Map<string, PendingShape[]>();
const INTERNAL_SECRET = process.env.FORGE_INTERNAL_SECRET ?? "";

// Auto-expire entries after 60 seconds to prevent memory leaks
const TTL_MS = 60_000;
const timestamps = new Map<string, number>();

function cleanup() {
  const now = Date.now();
  for (const [key, ts] of timestamps) {
    if (now - ts > TTL_MS) {
      pendingShapes.delete(key);
      timestamps.delete(key);
    }
  }
}

/**
 * POST /api/canvas-updates
 * Called by Motia's canvas_update.step.ts to push shapes for a board.
 */
export async function POST(req: NextRequest) {
  try {
    const internalSecret = req.headers.get("x-forge-internal-secret") ?? "";
    if (INTERNAL_SECRET && internalSecret !== INTERNAL_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { boardId, shapes } = await req.json();

    if (!boardId || !Array.isArray(shapes)) {
      return NextResponse.json({ error: "boardId and shapes required" }, { status: 400 });
    }

    cleanup();

    const existing = pendingShapes.get(boardId) ?? [];
    existing.push(...shapes);
    pendingShapes.set(boardId, existing);
    timestamps.set(boardId, Date.now());

    return NextResponse.json({ ok: true, queued: shapes.length });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

/**
 * GET /api/canvas-updates?boardId=xxx
 * Called by the canvas panel to poll for pending shapes.
 * Returns and clears all pending shapes for the board.
 */
export async function GET(req: NextRequest) {
  const boardId = req.nextUrl.searchParams.get("boardId");

  if (!boardId) {
    return NextResponse.json({ shapes: [] });
  }

  const access = await requireBoardAccess(boardId, "viewer");
  if ("response" in access) {
    return access.response;
  }

  cleanup();

  const shapes = pendingShapes.get(boardId) ?? [];
  if (shapes.length > 0) {
    pendingShapes.delete(boardId);
    timestamps.delete(boardId);
  }

  return NextResponse.json({ shapes });
}
