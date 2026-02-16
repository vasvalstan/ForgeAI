import { type Handlers, type StepConfig } from "motia";
import { z } from "zod";
import { db } from "@forge/db";

export const config = {
  name: "AuditTrigger",
  description:
    "API trigger for the Red Hat Audit Agent. Receives canvas shapes and enqueues adversarial analysis.",
  triggers: [
    {
      type: "api",
      path: "/audit",
      method: "POST",
      bodySchema: z.object({
        boardId: z.string(),
        shapes: z.array(
          z.object({
            id: z.string().optional(),
            type: z.string(),
            x: z.number().optional(),
            y: z.number().optional(),
            props: z.record(z.unknown()),
          })
        ),
        userId: z.string().optional(),
      }),
      responseSchema: {
        200: z.object({
          status: z.string(),
          message: z.string(),
          riskCount: z.number().optional(),
        }),
        402: z.object({
          error: z.string(),
        }),
      },
    },
  ],
  enqueues: ["redhat.audit"],
  flows: ["audit-flow"],
} as const satisfies StepConfig;

const AUDIT_CREDIT_COST = 5;

export const handler: Handlers<typeof config> = async (
  req,
  { logger, enqueue }
) => {
  const { boardId, shapes, userId } = req.body;

  logger.info("Received audit request", {
    boardId,
    shapeCount: shapes.length,
  });

  // Verify the board exists
  const board = await db.board.findUnique({
    where: { id: boardId },
    select: { id: true, ownerId: true },
  });

  if (!board) {
    return {
      status: 200 as const,
      body: {
        status: "error",
        message: "Board not found",
      },
    };
  }

  // Check and deduct credits for Deep Red Hat Audit
  const ownerId = userId || board.ownerId;
  if (ownerId) {
    const user = await db.user.findUnique({
      where: { id: ownerId },
      select: { credits: true },
    });

    if (user && user.credits < AUDIT_CREDIT_COST) {
      return {
        status: 402 as const,
        body: {
          error: `Insufficient credits. Deep Red Hat Audit requires ${AUDIT_CREDIT_COST} credits, but you have ${user.credits}.`,
        },
      };
    }

    if (user) {
      await db.user.update({
        where: { id: ownerId },
        data: { credits: { decrement: AUDIT_CREDIT_COST } },
      });
      logger.info(
        `Deducted ${AUDIT_CREDIT_COST} credits from user ${ownerId}`
      );
    }
  }

  // Enqueue the Python Red Hat Audit Agent
  await enqueue("redhat.audit", {
    boardId,
    shapes,
  });

  logger.info("Red Hat audit enqueued", { boardId });

  return {
    status: 200 as const,
    body: {
      status: "processing",
      message: `Red Hat Audit is analyzing ${shapes.length} shapes. ${AUDIT_CREDIT_COST} credits deducted.`,
    },
  };
};
