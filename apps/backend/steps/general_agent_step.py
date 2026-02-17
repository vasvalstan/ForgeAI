"""
ForgeAI General Agent — Product Strategy Q&A

Motia Queue Step (Python) that answers product questions using
board context from Postgres + pgvector semantic search.

Trigger: queue event "general.ask"
"""

import json
import os
import sys
from typing import Any

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import anthropic
import openai
from langsmith import traceable

from db import get_board_insights, find_similar_insights, create_conversation, create_message
from models import ConversationCreate, MessageCreate

config = {
    "type": "event",
    "name": "GeneralAgent",
    "description": "Answers product strategy questions using board context and semantic memory",
    "subscribes": ["general.ask"],
    "emits": [],
    "flows": ["general-flow"],
}

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
CLAUDE_MODEL = "claude-sonnet-4-20250514"
EMBEDDING_MODEL = "text-embedding-3-small"

QA_SYSTEM_PROMPT = """You are a Product Strategy Advisor for ForgeAI.
You have access to the user's discovery board insights gathered from user research.

Use the provided context (board insights and similar historical patterns) to give
specific, actionable advice. Always reference specific insights when possible.

Be concise but thorough. Structure your response with clear sections if needed.
If you don't have enough context to answer, say so and suggest what data the user
should gather (e.g., "Try running a Discovery Explosion on user interview transcripts").
"""


@traceable(name="general-agent", run_type="chain", tags=["general", "motia-step"])
async def handler(data: dict[str, Any], ctx: Any) -> None:
    """
    Main handler for the General Agent.

    1. Receives a product question
    2. Retrieves board insights from Postgres
    3. Generates question embedding for pgvector similarity search
    4. Sends question + context to Claude
    5. Logs the response (future: write to Conversation/Message table)
    """
    board_id = data.get("boardId", "")
    question = data.get("question", "")

    ctx.logger.info(f"General Agent processing question for board: {board_id}")

    # Step 1: Get board insights
    board_insights = []
    try:
        board_insights = get_board_insights(board_id)
        ctx.logger.info(f"Found {len(board_insights)} board insights")
    except Exception as e:
        ctx.logger.warn(f"Could not fetch board insights: {e}")

    # Step 2: Find semantically similar insights via pgvector
    similar_insights = []
    if OPENAI_API_KEY:
        try:
            client = openai.OpenAI(api_key=OPENAI_API_KEY)
            response = client.embeddings.create(
                model=EMBEDDING_MODEL,
                input=[question],
            )
            question_embedding = response.data[0].embedding

            similar_insights = find_similar_insights(
                embedding=question_embedding,
                limit=5,
            )
            ctx.logger.info(f"Found {len(similar_insights)} similar insights via pgvector")
        except Exception as e:
            ctx.logger.warn(f"Similarity search failed: {e}")

    # Step 3: Build context and ask Claude
    context_parts = []

    if board_insights:
        insights_summary = "\n".join(
            f"- [{ins.get('category', 'unknown')}] {ins.get('content', '')} "
            f"(sentiment: {ins.get('sentiment', 'N/A')})"
            for ins in board_insights[:20]
        )
        context_parts.append(f"Current board insights:\n{insights_summary}")

    if similar_insights:
        similar_summary = "\n".join(
            f"- [{ins.get('category', 'unknown')}] {ins.get('content', '')} "
            f"(similarity distance: {ins.get('distance', 'N/A'):.3f})"
            for ins in similar_insights
        )
        context_parts.append(f"Similar historical insights:\n{similar_summary}")

    context = "\n\n".join(context_parts) if context_parts else "No insights available yet for this board."

    try:
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        response = client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=2048,
            system=QA_SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": f"Board context:\n{context}\n\nQuestion: {question}",
                }
            ],
        )

        answer = response.content[0].text
        ctx.logger.info(f"General Agent answered (length: {len(answer)})")

    except Exception as e:
        ctx.logger.error(f"Claude Q&A failed: {e}")
        answer = (
            f"I couldn't process your question right now. "
            f"Board has {len(board_insights)} insights available. "
            f"Please check that ANTHROPIC_API_KEY is configured."
        )

    # Save to Conversation/Message table for history
    try:
        conv_id = create_conversation(ConversationCreate(
            boardId=board_id,
            title=question[:60] if question else "Q&A",
        ))
        create_message(MessageCreate(
            conversationId=conv_id,
            role="user",
            content=question,
        ))
        create_message(MessageCreate(
            conversationId=conv_id,
            role="assistant",
            content=answer,
            status="completed",
        ))
        ctx.logger.info(f"Saved conversation {conv_id} with Q&A")
    except Exception as e:
        ctx.logger.warn(f"Could not persist conversation: {e}")

    ctx.logger.info(f"General Agent complete for board {board_id}")
