import { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import { deductOrganizationCredits, getBoardTenantContext, hasValidInternalSecret } from "./tenant";

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

const PRD_CREDIT_COST = 3;

export const handler: Handlers['PRDTrigger'] = async (
  req,
  { logger, emit }
) => {
  const { boardId, insightIds, internalSecret } = req.body;

  if (!hasValidInternalSecret(internalSecret)) {
    logger.warn("Rejected unauthorized PRD request", { boardId });
    return {
      status: 402 as const,
      body: {
        error: "Unauthorized backend request.",
      },
    };
  }

  logger.info("PRD generation requested", { boardId, insightCount: insightIds?.length ?? "all" });

  const board = await getBoardTenantContext(boardId);

  if (!board) {
    return {
      status: 200 as const,
      body: { status: "error", message: "Board not found" },
    };
  }

  const deduction = await deductOrganizationCredits(board.organizationId, PRD_CREDIT_COST);
  if (!deduction.ok) {
    return {
      status: 402 as const,
      body: {
        error: `Insufficient credits. PRD generation requires ${PRD_CREDIT_COST} credits, but you have ${deduction.credits}.`,
      },
    };
  }

  logger.info(`Deducted ${PRD_CREDIT_COST} credits from organization ${board.organizationId}`);

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
      message: `PRD generation started. ${PRD_CREDIT_COST} organization credits deducted. The PRD will appear on your canvas shortly.`,
    },
  };
};
