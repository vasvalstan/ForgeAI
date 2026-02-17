import { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import { db } from "@forge/db";

export const config: ApiRouteConfig = {
  type: "api",
  name: "SpecTrigger",
  description:
    "API trigger for technical spec generation. Reads PRD context and enqueues the Spec Agent.",
  path: "/generate-spec",
  method: "POST",
  emits: ["spec.generate"],
  flows: ["spec-flow"],
  bodySchema: z.object({
    boardId: z.string(),
    prdId: z.string().optional(),
    featureTitle: z.string().optional(),
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

const SPEC_CREDIT_COST = 3;

export const handler: Handlers['SpecTrigger'] = async (
  req,
  { logger, emit }
) => {
  const { boardId, prdId, featureTitle, userId } = req.body;

  logger.info("Spec generation requested", { boardId, prdId, featureTitle });

  const board = await db.board.findUnique({
    where: { id: boardId },
    select: { id: true, ownerId: true, githubRepo: true, githubToken: true },
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

    if (user && user.credits < SPEC_CREDIT_COST) {
      return {
        status: 402 as const,
        body: {
          error: `Insufficient credits. Spec generation requires ${SPEC_CREDIT_COST} credits, but you have ${user.credits}.`,
        },
      };
    }

    if (user) {
      await db.user.update({
        where: { id: ownerId },
        data: { credits: { decrement: SPEC_CREDIT_COST } },
      });
    }
  }

  await emit({
    topic: "spec.generate",
    data: {
      boardId,
      prdId: prdId ?? null,
      featureTitle: featureTitle ?? "",
      githubRepo: board.githubRepo ?? null,
      githubToken: board.githubToken ?? null,
    },
  });

  return {
    status: 200 as const,
    body: {
      status: "processing",
      message: `Spec generation started. ${SPEC_CREDIT_COST} credits deducted.`,
    },
  };
};
