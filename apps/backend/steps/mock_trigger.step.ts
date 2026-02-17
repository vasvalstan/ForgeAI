import { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import { db } from "@forge/db";

export const config: ApiRouteConfig = {
  type: "api",
  name: "MockTrigger",
  description:
    "API trigger for visual mock generation via Prodia. Takes a feature description and generates a UI mock.",
  path: "/visualize",
  method: "POST",
  emits: ["feature.visualize"],
  flows: ["mock-flow"],
  bodySchema: z.object({
    boardId: z.string(),
    shapeId: z.string().optional(),
    description: z.string(),
    x: z.number().optional(),
    y: z.number().optional(),
    userId: z.string().optional(),
  }),
  responseSchema: {
    200: z.object({
      status: z.string(),
      message: z.string(),
    }),
    402: z.object({
      error: z.string(),
    }),
  },
};

const MOCK_CREDIT_COST = 2;

export const handler: Handlers['MockTrigger'] = async (
  req,
  { logger, emit }
) => {
  const { boardId, shapeId, description, x, y, userId } = req.body;

  logger.info("Mock generation requested", { boardId, shapeId, description: description.slice(0, 60) });

  const board = await db.board.findUnique({
    where: { id: boardId },
    select: { id: true, ownerId: true },
  });

  if (!board) {
    return {
      status: 200 as const,
      body: { status: "error", message: "Board not found" },
    };
  }

  const ownerId = userId || board.ownerId;
  if (ownerId) {
    const user = await db.user.findUnique({
      where: { id: ownerId },
      select: { credits: true },
    });

    if (user && user.credits < MOCK_CREDIT_COST) {
      return {
        status: 402 as const,
        body: {
          error: `Insufficient credits. Mock generation requires ${MOCK_CREDIT_COST} credits, but you have ${user.credits}.`,
        },
      };
    }

    if (user) {
      await db.user.update({
        where: { id: ownerId },
        data: { credits: { decrement: MOCK_CREDIT_COST } },
      });
    }
  }

  await emit({
    topic: "feature.visualize",
    data: {
      boardId,
      shapeId: shapeId ?? "",
      description,
      x: x ?? 0,
      y: y ?? 0,
    },
  });

  return {
    status: 200 as const,
    body: {
      status: "processing",
      message: `Mock generation started. ${MOCK_CREDIT_COST} credits deducted. The visual will appear on your canvas shortly.`,
    },
  };
};
