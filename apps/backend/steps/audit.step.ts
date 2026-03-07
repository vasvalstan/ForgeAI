import { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import { deductOrganizationCredits, getBoardTenantContext, hasValidInternalSecret } from "./tenant";

export const config: ApiRouteConfig = {
  type: "api",
  name: "AuditTrigger",
  description:
    "API trigger for the Red Hat Audit Agent. Receives canvas shapes and enqueues adversarial analysis.",
  path: "/audit",
  method: "POST",
  emits: ["redhat.audit"],
  flows: ["audit-flow"],
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
    internalSecret: z.string().optional(),
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
};

const AUDIT_CREDIT_COST = 5;

export const handler: Handlers['AuditTrigger'] = async (
  req,
  { logger, emit }
) => {
  const { boardId, shapes, internalSecret } = req.body;

  if (!hasValidInternalSecret(internalSecret)) {
    logger.warn("Rejected unauthorized audit request", { boardId });
    return {
      status: 402 as const,
      body: {
        error: "Unauthorized backend request.",
      },
    };
  }

  logger.info("Received audit request", {
    boardId,
    shapeCount: shapes.length,
  });

  // Verify the board exists
  const board = await getBoardTenantContext(boardId);

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
  const deduction = await deductOrganizationCredits(board.organizationId, AUDIT_CREDIT_COST);
  if (!deduction.ok) {
    return {
      status: 402 as const,
      body: {
        error: `Insufficient credits. Deep Red Hat Audit requires ${AUDIT_CREDIT_COST} credits, but you have ${deduction.credits}.`,
      },
    };
  }

  logger.info(`Deducted ${AUDIT_CREDIT_COST} credits from organization ${board.organizationId}`);

  // Enqueue the Python Red Hat Audit Agent
  await emit({ topic: "redhat.audit", data: { boardId, shapes } });

  logger.info("Red Hat audit enqueued", { boardId });

  return {
    status: 200 as const,
    body: {
      status: "processing",
      message: `Red Hat Audit is analyzing ${shapes.length} shapes. ${AUDIT_CREDIT_COST} organization credits deducted.`,
    },
  };
};
