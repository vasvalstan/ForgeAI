import { EventConfig, Handlers } from "motia";

export const config: EventConfig = {
  type: "event",
  name: "CanvasUpdate",
  description:
    "Bridge between AI agents and the Tldraw canvas via Liveblocks REST API",
  subscribes: ["canvas.update"],
  emits: [],
  flows: ["discovery-flow", "audit-flow", "prd-flow", "spec-flow", "task-flow", "mock-flow"],
};

interface CanvasShape {
  type: string;
  x: number;
  y: number;
  props: Record<string, unknown>;
}

interface CanvasUpdateEvent {
  boardId: string;
  discoveryId?: string;
  action: "explosion" | "audit" | "add_consensus_warnings";
  shapes: CanvasShape[];
  connections?: Array<{
    fromInsightIndex: number;
    toInsightIndex: number;
    label: string;
  }>;
}

const AUDIT_SHAPE_TYPES = new Set(["risk-flag", "alert_card"]);
const ANIMATED_SHAPE_TYPES = new Set(["risk-flag", "alert_card"]);

const LIVEBLOCKS_API = "https://api.liveblocks.io/v2";
const LIVEBLOCKS_SECRET = process.env.LIVEBLOCKS_SECRET_KEY ?? "";
const NEXT_PUBLIC_URL = process.env.NEXT_PUBLIC_URL || "http://localhost:4000";
const INTERNAL_SECRET = process.env.FORGE_INTERNAL_SECRET ?? "";
const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 50;
const RISK_FLAG_ANIMATION_STEP_MS = 45;
const RISK_FLAG_ANIMATION_MAX_DELAY_MS = 300;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getLiveblocksRoomId(boardId: string): Promise<string> {
  // Look up the board's Liveblocks room ID from the database
  // Import dynamically to avoid issues with Motia's module resolution
  try {
    const { db } = await import("@forge/db");
    const board = await db.board.findUnique({
      where: { id: boardId },
      select: { liveblocksRoomId: true },
    });
    return board?.liveblocksRoomId ?? `forge-room-${boardId}`;
  } catch {
    // Fallback if DB is unavailable
    return `forge-room-${boardId}`;
  }
}

async function ensureRoomExists(roomId: string, logger: any): Promise<void> {
  const url = `${LIVEBLOCKS_API}/rooms/${encodeURIComponent(roomId)}`;
  try {
    const check = await fetch(url, {
      headers: { Authorization: `Bearer ${LIVEBLOCKS_SECRET}` },
    });
    if (check.status === 404) {
      const create = await fetch(`${LIVEBLOCKS_API}/rooms`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LIVEBLOCKS_SECRET}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: roomId, defaultAccesses: [] }),
      });
      if (create.ok) {
        logger.info(`Created Liveblocks room: ${roomId}`);
      } else {
        logger.warn(`Failed to create room ${roomId}: ${create.status}`);
      }
    }
  } catch (err: any) {
    logger.warn(`Room check failed: ${err.message}`);
  }
}

async function sendShapesToLiveblocks(
  roomId: string,
  action: CanvasUpdateEvent["action"],
  shapes: CanvasShape[],
  logger: any
): Promise<void> {
  await ensureRoomExists(roomId, logger);

  const url = `${LIVEBLOCKS_API}/rooms/${encodeURIComponent(roomId)}/broadcast_event`;
  const effectiveBatchSize = action === "explosion" ? Math.max(shapes.length, 1) : BATCH_SIZE;
  const effectiveBatchDelayMs = action === "explosion" ? 0 : BATCH_DELAY_MS;

  for (let i = 0; i < shapes.length; i += effectiveBatchSize) {
    const batch = shapes.slice(i, i + effectiveBatchSize);
    const broadcastAt = Date.now();

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LIVEBLOCKS_SECRET}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "canvas-update",
          data: {
            shapes: batch.map((shape, idx) => ({
              id: `shape-${Date.now()}-${i + idx}`,
              type: shape.type,
              x: shape.x,
              y: shape.y,
              rotation: 0,
              isLocked: false,
              props: shape.props,
              ...((action === "audit" && shape.type === "risk-flag") ||
              (action === "add_consensus_warnings" && shape.type === "alert_card")
                ? {
                    meta: {
                      entryAnimation: "fade-up",
                      entryAnimationDelayMs: Math.min(
                        (i + idx) * RISK_FLAG_ANIMATION_STEP_MS,
                        RISK_FLAG_ANIMATION_MAX_DELAY_MS
                      ),
                      entryAnimationAt: broadcastAt,
                      ...(action === "add_consensus_warnings"
                        ? { consensusGlow: true }
                        : {}),
                    },
                  }
                : {}),
            })),
          },
        }),
      });

      if (response.ok) {
        logger.info(
          `Batch ${Math.floor(i / effectiveBatchSize) + 1}: ${batch.length} shapes broadcast to room ${roomId}`
        );
      } else {
        logger.warn(
          `Liveblocks broadcast batch ${Math.floor(i / effectiveBatchSize) + 1} returned ${response.status}`
        );
      }
    } catch (err: any) {
      logger.error(`Liveblocks broadcast failed: ${err.message}`);
    }

    // Delay between batches to avoid canvas flicker
    if (i + effectiveBatchSize < shapes.length) {
      await sleep(effectiveBatchDelayMs);
    }
  }
}

export const handler: Handlers['CanvasUpdate'] = async (input, { logger }) => {
  const { boardId, action, shapes, connections } = input as unknown as CanvasUpdateEvent;

  logger.info(`Canvas update: ${action} for board ${boardId}`, {
    shapeCount: shapes.length,
    connectionCount: connections?.length ?? 0,
  });

  // Resolve the Liveblocks room ID
  const roomId = await getLiveblocksRoomId(boardId);

  // Push shapes to Liveblocks in batches
  await sendShapesToLiveblocks(roomId, action, shapes, logger);

  // Send connections as a separate broadcast event
  if (connections && connections.length > 0) {
    try {
      const url = `${LIVEBLOCKS_API}/rooms/${encodeURIComponent(roomId)}/broadcast_event`;
      await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LIVEBLOCKS_SECRET}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "canvas-connections",
          data: { connections },
        }),
      });
      logger.info(`${connections.length} connections broadcast to room ${roomId}`);
    } catch (err: any) {
      logger.error(`Connection broadcast failed: ${err.message}`);
    }
  }

  // Direct push to Next.js API (reliable fallback that doesn't depend on Liveblocks WebSocket)
  try {
    const enrichedShapes = shapes.map((shape, idx) => ({
      id: `shape-${Date.now()}-${idx}`,
      type: shape.type,
      x: shape.x,
      y: shape.y,
      props: shape.props,
    }));

    const pushRes = await fetch(`${NEXT_PUBLIC_URL}/api/canvas-updates`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(INTERNAL_SECRET
          ? { "x-forge-internal-secret": INTERNAL_SECRET }
          : {}),
      },
      body: JSON.stringify({ boardId, shapes: enrichedShapes }),
    });

    if (pushRes.ok) {
      logger.info(`Pushed ${shapes.length} shapes to Next.js for board ${boardId}`);
    } else {
      logger.warn(`Next.js push returned ${pushRes.status}`);
    }
  } catch (err: any) {
    logger.warn(`Next.js push failed: ${err.message}`);
  }

  logger.info(
    `Canvas update complete: ${shapes.length} shapes for board ${boardId} (room: ${roomId})`
  );
};
