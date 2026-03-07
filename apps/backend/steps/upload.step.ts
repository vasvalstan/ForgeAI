import { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import { db } from "@forge/db";
import { deductOrganizationCredits, getBoardTenantContext, hasValidInternalSecret } from "./tenant";

export const config: ApiRouteConfig = {
  type: "api",
  name: "UploadTranscript",
  description:
    "Receives a transcript file upload, creates a Discovery record in Postgres, and triggers the Discovery Agent",
  path: "/discover",
  method: "POST",
  emits: ["discovery.analyze"],
  flows: ["discovery-flow"],
  bodySchema: z.object({
    boardId: z.string(),
    content: z.string(),
    sourceType: z
      .enum(["transcript", "audio", "notes", "meeting_notes"])
      .default("transcript"),
    fileName: z.string().optional(),
    userId: z.string().optional(),
    internalSecret: z.string().optional(),
  }),
  responseSchema: {
    200: z.object({
      discoveryId: z.string(),
      status: z.string(),
      message: z.string(),
    }),
    402: z.object({
      error: z.string(),
    }),
  },
};

const DISCOVERY_CREDIT_COST = 1;

export const handler: Handlers['UploadTranscript'] = async (
  req,
  { logger, emit }
) => {
  const { boardId, content, sourceType, fileName, internalSecret } = req.body;

  if (!hasValidInternalSecret(internalSecret)) {
    logger.warn("Rejected unauthorized discovery request", { boardId });
    return {
      status: 402 as const,
      body: {
        error: "Unauthorized backend request.",
      },
    };
  }

  logger.info("Received transcript upload", {
    boardId,
    sourceType,
    contentLength: content.length,
    fileName,
  });

  // Verify the board exists
  const board = await getBoardTenantContext(boardId);

  if (!board) {
    logger.warn(`Board not found: ${boardId}`);
    return {
      status: 200 as const,
      body: {
        discoveryId: "",
        status: "error",
        message: "Board not found",
      },
    };
  }

  // Check and deduct credits
  const deduction = await deductOrganizationCredits(board.organizationId, DISCOVERY_CREDIT_COST);
  if (!deduction.ok) {
    logger.warn(`Insufficient credits for organization ${board.organizationId}`);
    return {
      status: 402 as const,
      body: {
        error: `Insufficient credits. Discovery requires ${DISCOVERY_CREDIT_COST} credit(s), but you have ${deduction.credits}.`,
      },
    };
  }

  logger.info(`Deducted ${DISCOVERY_CREDIT_COST} credit(s) from organization ${board.organizationId}`);

  // If meeting notes, also create a MeetingNote record
  if (sourceType === "meeting_notes") {
    await db.meetingNote.create({
      data: {
        boardId,
        title: fileName ?? `Meeting Notes — ${new Date().toLocaleDateString()}`,
        content,
      },
    });
    logger.info("MeetingNote record created", { boardId });
  }

  // Create Discovery record in Postgres via Prisma
  const discovery = await db.discovery.create({
    data: {
      boardId,
      sourceType,
      rawContent: content,
      status: "pending",
    },
  });

  logger.info("Discovery record created", {
    discoveryId: discovery.id,
    boardId,
  });

  // Enqueue the Python Discovery Agent
  await emit({
    topic: "discovery.analyze",
    data: {
      discoveryId: discovery.id,
      boardId,
      content,
      sourceType,
    },
  });

  logger.info("Discovery analysis enqueued", {
    discoveryId: discovery.id,
  });

  return {
    status: 200 as const,
    body: {
      discoveryId: discovery.id,
      status: "processing",
      message: `Discovery "${fileName ?? "upload"}" is being analyzed. ${DISCOVERY_CREDIT_COST} organization credit(s) deducted.`,
    },
  };
};
