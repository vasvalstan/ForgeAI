import { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";

export const config: ApiRouteConfig = {
  type: "api",
  name: "AskTrigger",
  description:
    "API trigger for the General Q&A Agent. Receives a question and enqueues analysis with board context.",
  path: "/ask",
  method: "POST",
  emits: ["general.ask"],
  flows: ["general-flow"],
  bodySchema: z.object({
    boardId: z.string(),
    question: z.string(),
    userId: z.string().optional(),
  }),
  responseSchema: {
    200: z.object({
      status: z.string(),
      answer: z.string(),
    }),
  },
};

export const handler: Handlers['AskTrigger'] = async (
  req,
  { logger, emit }
) => {
  const { boardId, question } = req.body;

  logger.info("Received general question", {
    boardId,
    questionLength: question.length,
  });

  // Enqueue the Python General Agent for async processing
  await emit({ topic: "general.ask", data: { boardId, question } });

  return {
    status: 200 as const,
    body: {
      status: "processing",
      answer: `Your question is being analyzed with the board context. The General Agent will provide insights based on all discoveries and insights for this board.`,
    },
  };
};
