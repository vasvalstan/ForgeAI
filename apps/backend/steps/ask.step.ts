import { type Handlers, type StepConfig } from "motia";
import { z } from "zod";

export const config = {
  name: "AskTrigger",
  description:
    "API trigger for the General Q&A Agent. Receives a question and enqueues analysis with board context.",
  triggers: [
    {
      type: "api",
      path: "/ask",
      method: "POST",
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
    },
  ],
  enqueues: ["general.ask"],
  flows: ["general-flow"],
} as const satisfies StepConfig;

export const handler: Handlers<typeof config> = async (
  req,
  { logger, enqueue }
) => {
  const { boardId, question } = req.body;

  logger.info("Received general question", {
    boardId,
    questionLength: question.length,
  });

  // Enqueue the Python General Agent for async processing
  await enqueue("general.ask", {
    boardId,
    question,
  });

  return {
    status: 200 as const,
    body: {
      status: "processing",
      answer: `Your question is being analyzed with the board context. The General Agent will provide insights based on all discoveries and insights for this board.`,
    },
  };
};
