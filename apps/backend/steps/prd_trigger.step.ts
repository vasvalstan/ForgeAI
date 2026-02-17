import { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import { db } from "@forge/db";

export const config: ApiRouteConfig = {
  type: "api",
  name: "PRDTrigger",
  description:
    "API trigger for PRD generation. Collects board insights and enqueues the PRD Agent.",
  path: "/generate-prd",
  method: "POST",
  emits: ["prd.generate"],
  flows: ["prd-flow"],
  bodySchema: z.object({
    boardId: z.string(),
    insightIds: z.array(z.string()).optional(),
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

const PRD_CREDIT_COST = 3;

export const handler: Handlers['PRDTrigger'] = async (
  req,
  { logger, emit }
) => {
  const { boardId, insightIds, userId } = req.body;

  logger.info("PRD generation requested", { boardId, insightCount: insightIds?.length ?? "all" });

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

    if (user && user.credits < PRD_CREDIT_COST) {
      return {
        status: 402 as const,
        body: {
          error: `Insufficient credits. PRD generation requires ${PRD_CREDIT_COST} credits, but you have ${user.credits}.`,
        },
      };
    }

    if (user) {
      await db.user.update({
        where: { id: ownerId },
        data: { credits: { decrement: PRD_CREDIT_COST } },
      });
      logger.info(`Deducted ${PRD_CREDIT_COST} credits from user ${ownerId}`);
    }
  }

  await emit({
    topic: "prd.generate",
    data: {
      boardId,
      insightIds: insightIds ?? [],
    },
  });

  return {
    status: 200 as const,
    body: {
      status: "processing",
      message: `PRD generation started. ${PRD_CREDIT_COST} credits deducted. The PRD will appear on your canvas shortly.`,
    },
  };
};
