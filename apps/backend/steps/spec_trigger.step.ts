import { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import { deductOrganizationCredits, getBoardTenantContext, hasValidInternalSecret } from "./tenant";

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

const SPEC_CREDIT_COST = 3;

export const handler: Handlers['SpecTrigger'] = async (
  req,
  { logger, emit }
) => {
  const { boardId, prdId, featureTitle, internalSecret } = req.body;

  if (!hasValidInternalSecret(internalSecret)) {
    logger.warn("Rejected unauthorized spec request", { boardId });
    return {
      status: 402 as const,
      body: {
        error: "Unauthorized backend request.",
      },
    };
  }

  logger.info("Spec generation requested", { boardId, prdId, featureTitle });

  const board = await getBoardTenantContext(boardId);

  if (!board) {
    return {
      status: 200 as const,
      body: { status: "error", message: "Board not found" },
    };
  }

  const deduction = await deductOrganizationCredits(board.organizationId, SPEC_CREDIT_COST);
  if (!deduction.ok) {
    return {
      status: 402 as const,
      body: {
        error: `Insufficient credits. Spec generation requires ${SPEC_CREDIT_COST} credits, but you have ${deduction.credits}.`,
      },
    };
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
      message: `Spec generation started. ${SPEC_CREDIT_COST} organization credits deducted.`,
    },
  };
};
