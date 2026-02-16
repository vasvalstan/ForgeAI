import { type Handlers, type StepConfig } from "motia";
import { z } from "zod";

export const config = {
  name: "CanvasUpdate",
  description:
    "Bridge between AI agents and the Tldraw canvas via Liveblocks REST API",
  triggers: [
    {
      type: "queue",
      topic: "canvas.update",
    },
  ],
  enqueues: [],
  flows: ["discovery-flow", "audit-flow"],
} as const satisfies StepConfig;

interface CanvasShape {
  type: string;
  x: number;
  y: number;
  props: Record<string, unknown>;
}

interface CanvasUpdateEvent {
  boardId: string;
  discoveryId?: string;
  action: "explosion" | "audit";
  shapes: CanvasShape[];
  connections?: Array<{
    fromInsightIndex: number;
    toInsightIndex: number;
    label: string;
  }>;
}

const LIVEBLOCKS_API = "https://api.liveblocks.io/v2";
const LIVEBLOCKS_SECRET = process.env.LIVEBLOCKS_SECRET_KEY ?? "";
const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 50;

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

async function sendShapesToLiveblocks(
  roomId: string,
  shapes: CanvasShape[],
  logger: any
): Promise<void> {
  // Use Liveblocks Storage REST API to broadcast shape data
  // The frontend listens for these events and creates the Tldraw shapes
  const url = `${LIVEBLOCKS_API}/rooms/${encodeURIComponent(roomId)}/broadcast`;

  for (let i = 0; i < shapes.length; i += BATCH_SIZE) {
    const batch = shapes.slice(i, i + BATCH_SIZE);

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
            })),
          },
        }),
      });

      if (!response.ok) {
        logger.warn(
          `Liveblocks broadcast batch ${Math.floor(i / BATCH_SIZE) + 1} returned ${response.status}`
        );
      } else {
        logger.info(
          `Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} shapes broadcast to room ${roomId}`
        );
      }
    } catch (err: any) {
      logger.error(`Liveblocks broadcast failed: ${err.message}`);
    }

    // Delay between batches to avoid canvas flicker
    if (i + BATCH_SIZE < shapes.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }
}

export const handler: Handlers<typeof config> = async (data, { logger }) => {
  const event = data as unknown as CanvasUpdateEvent;
  const { boardId, action, shapes, connections } = event;

  logger.info(`Canvas update: ${action} for board ${boardId}`, {
    shapeCount: shapes.length,
    connectionCount: connections?.length ?? 0,
  });

  // Resolve the Liveblocks room ID
  const roomId = await getLiveblocksRoomId(boardId);

  // Push shapes to Liveblocks in batches
  await sendShapesToLiveblocks(roomId, shapes, logger);

  // Send connections as a separate broadcast event
  if (connections && connections.length > 0) {
    try {
      const url = `${LIVEBLOCKS_API}/rooms/${encodeURIComponent(roomId)}/broadcast`;
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

  logger.info(
    `Canvas update complete: ${shapes.length} shapes for board ${boardId} (room: ${roomId})`
  );
};
