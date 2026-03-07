import { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import { db } from "@forge/db";
import { deductOrganizationCredits, hasValidInternalSecret } from "./tenant";

export const config: ApiRouteConfig = {
  type: "api",
  name: "TaskBreakdownTrigger",
  description:
    "API trigger for task breakdown. Reads a spec and enqueues the Task Agent.",
  path: "/break-down",
  method: "POST",
  emits: ["task.breakdown"],
  flows: ["task-flow"],
  bodySchema: z.object({
    specId: z.string().optional(),
    boardId: z.string().optional(),
    specTitle: z.string().optional(),
    userId: z.string().optional(),
    internalSecret: z.string().optional(),
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

const TASK_CREDIT_COST = 2;

export const handler: Handlers['TaskBreakdownTrigger'] = async (
  req,
  { logger, emit }
) => {
  const { specId, boardId, specTitle, internalSecret } = req.body;

  if (!hasValidInternalSecret(internalSecret)) {
    logger.warn("Rejected unauthorized task breakdown request", { specId, boardId });
    return {
      status: 402 as const,
      body: {
        error: "Unauthorized backend request.",
      },
    };
  }

  logger.info("Task breakdown requested", { specId, boardId });

  // Find the spec — either by ID or by matching title on the board
  let spec: any = null;
  if (specId) {
    spec = await db.spec.findUnique({
      where: { id: specId },
      include: { board: { select: { organizationId: true, githubRepo: true, githubToken: true } } },
    });
  } else if (boardId && specTitle) {
    spec = await db.spec.findFirst({
      where: { boardId, title: { contains: specTitle } },
      include: { board: { select: { organizationId: true, githubRepo: true, githubToken: true } } },
    });
  }

  if (!spec) {
    return {
      status: 200 as const,
      body: { status: "error", message: "Spec not found. Generate a spec first." },
    };
  }

  const deduction = await deductOrganizationCredits(spec.board.organizationId, TASK_CREDIT_COST);
  if (!deduction.ok) {
    return {
      status: 402 as const,
      body: {
        error: `Insufficient credits. Task breakdown requires ${TASK_CREDIT_COST} credits, but you have ${deduction.credits}.`,
      },
    };
  }

  await emit({
    topic: "task.breakdown",
    data: {
      specId: spec.id,
      boardId: spec.boardId,
      githubRepo: spec.board.githubRepo ?? null,
      githubToken: spec.board.githubToken ?? null,
    },
  });

  return {
    status: 200 as const,
    body: {
      status: "processing",
      message: `Task breakdown started for "${spec.title}". ${TASK_CREDIT_COST} organization credits deducted.`,
    },
  };
};
