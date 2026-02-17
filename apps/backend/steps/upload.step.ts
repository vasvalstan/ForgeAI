import { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import { db } from "@forge/db";

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
  const { boardId, content, sourceType, fileName, userId } = req.body;

  logger.info("Received transcript upload", {
    boardId,
    sourceType,
    contentLength: content.length,
    fileName,
  });

  // Verify the board exists
  const board = await db.board.findUnique({
    where: { id: boardId },
    select: { id: true, ownerId: true },
  });

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
  const ownerId = userId || board.ownerId;
  if (ownerId) {
    const user = await db.user.findUnique({
      where: { id: ownerId },
      select: { credits: true },
    });

    if (user && user.credits < DISCOVERY_CREDIT_COST) {
      logger.warn(`Insufficient credits for user ${ownerId}`);
      return {
        status: 402 as const,
        body: {
          error: `Insufficient credits. Discovery requires ${DISCOVERY_CREDIT_COST} credit(s), but you have ${user.credits}.`,
        },
      };
    }

    // Deduct credits
    if (user) {
      await db.user.update({
        where: { id: ownerId },
        data: { credits: { decrement: DISCOVERY_CREDIT_COST } },
      });
      logger.info(
        `Deducted ${DISCOVERY_CREDIT_COST} credit(s) from user ${ownerId}`
      );
    }
  }

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
      message: `Discovery "${fileName ?? "upload"}" is being analyzed. ${DISCOVERY_CREDIT_COST} credit(s) deducted.`,
    },
  };
};
