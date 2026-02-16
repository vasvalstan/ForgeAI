"""
ForgeAI Discovery Agent — The "Explosion Engine"

Motia Queue Step (Python) that receives a transcript, analyzes it with Claude,
generates embeddings with OpenAI, saves structured insights to Postgres with
pgvector, and enqueues canvas updates with spatial layout coordinates.

Trigger: queue event "discovery.analyze"
Enqueues: "canvas.update" with sticky note positions
"""

import json
import math
import os
import random
from typing import Any

import anthropic
import openai
from langsmith import traceable

from models import InsightCreate
from db import (
    create_insights_batch,
    update_discovery_status,
    get_discovery,
)

# Motia step config
config = {
    "name": "DiscoveryAgent",
    "description": "Analyzes transcripts and clusters insights into spatial sticky notes",
    "triggers": [
        {
            "type": "queue",
            "topic": "discovery.analyze",
        }
    ],
    "enqueues": ["canvas.update"],
    "flows": ["discovery-flow"],
}

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")

# Embedding dimension must match schema.prisma vector(1536)
EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIM = 1536

CLAUDE_MODEL = "claude-sonnet-4-20250514"

EXTRACTION_SYSTEM_PROMPT = """You are a Product Discovery Analyst. Your task is to analyze a user research transcript and extract structured insights.

For each insight, provide:
- category: one of "pain_point", "feature_request", "praise", or "question"
- content: a clear, concise summary of the insight (1-2 sentences)
- quote: the exact verbatim quote from the transcript that supports this insight
- sentiment: a float from -1.0 (very negative) to 1.0 (very positive)
- quote_start: the character offset where the quote begins in the original text
- quote_end: the character offset where the quote ends in the original text

Extract at most 20 insights. Focus on the most impactful and actionable ones.
Prioritize pain points and feature requests as they drive product decisions.

Return your response as a JSON array of objects with the fields above."""


def compute_spatial_layout(
    insights: list[dict], canvas_center: tuple = (400, 300)
) -> list[dict]:
    """
    Compute force-directed spatial positions for insights.
    Groups by category and arranges in clusters with organic spacing.
    """
    category_positions = {
        "pain_point": (-300, -200),
        "feature_request": (300, -200),
        "praise": (-300, 200),
        "question": (300, 200),
    }

    positioned = []
    category_counts: dict[str, int] = {}

    for insight in insights:
        cat = insight.get("category", "question")
        count = category_counts.get(cat, 0)
        category_counts[cat] = count + 1

        base_x, base_y = category_positions.get(cat, (0, 0))
        col = count % 3
        row = count // 3
        x = canvas_center[0] + base_x + col * 280 + random.randint(-20, 20)
        y = canvas_center[1] + base_y + row * 200 + random.randint(-20, 20)

        positioned.append({
            **insight,
            "x": x,
            "y": y,
            "w": 260,
            "h": 180,
        })

    return positioned


def find_connections(insights: list[dict]) -> list[dict]:
    """Identify related insights that should be connected with arrows."""
    connections = []
    stop_words = {"the", "a", "an", "is", "are", "to", "in", "of", "and", "it", "for", "on", "that", "this", "with"}

    for i, a in enumerate(insights):
        for j, b in enumerate(insights):
            if i >= j:
                continue
            words_a = set(a.get("content", "").lower().split()) - stop_words
            words_b = set(b.get("content", "").lower().split()) - stop_words
            overlap = words_a & words_b
            if len(overlap) >= 3:
                connections.append({
                    "fromInsightIndex": i,
                    "toInsightIndex": j,
                    "label": ", ".join(list(overlap)[:3]),
                })

    return connections


@traceable(name="extract-insights-claude", run_type="llm")
async def extract_insights_with_claude(content: str, ctx: Any) -> list[dict]:
    """Use Claude to extract structured insights from transcript text."""
    try:
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        response = client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=4096,
            system=EXTRACTION_SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": f"Analyze the following transcript and extract insights:\n\n---\n{content}\n---",
                }
            ],
        )

        response_text = response.content[0].text

        # Parse the JSON response (Claude may wrap in markdown code blocks)
        json_text = response_text
        if "```json" in json_text:
            json_text = json_text.split("```json")[1].split("```")[0]
        elif "```" in json_text:
            json_text = json_text.split("```")[1].split("```")[0]

        insights = json.loads(json_text.strip())
        ctx.logger.info(f"Claude extracted {len(insights)} insights")
        return insights

    except Exception as e:
        ctx.logger.error(f"Claude extraction failed: {e}")
        # Fallback to heuristic extraction
        return extract_insights_heuristic(content)


def extract_insights_heuristic(content: str) -> list[dict]:
    """Fallback heuristic extraction when Claude API is unavailable."""
    sentences = [
        s.strip()
        for s in content.replace("\n", ". ").split(". ")
        if len(s.strip()) > 15
    ]

    insights = []
    for i, sentence in enumerate(sentences[:20]):
        lower = sentence.lower()

        if any(w in lower for w in ["problem", "issue", "bug", "broken", "hate", "annoying", "frustrated"]):
            category = "pain_point"
            sentiment = -0.6
        elif any(w in lower for w in ["wish", "want", "need", "should", "could", "feature", "add"]):
            category = "feature_request"
            sentiment = 0.1
        elif any(w in lower for w in ["love", "great", "awesome", "amazing", "perfect", "excellent"]):
            category = "praise"
            sentiment = 0.8
        else:
            category = "question"
            sentiment = 0.0

        # Compute character offsets for source traceability
        start = content.find(sentence)
        end = start + len(sentence) if start >= 0 else -1

        insights.append({
            "content": sentence[:200],
            "quote": sentence[:100] if len(sentence) > 50 else "",
            "category": category,
            "sentiment": sentiment,
            "quote_start": max(start, 0),
            "quote_end": max(end, 0),
        })

    return insights if insights else [{
        "content": content[:200],
        "quote": "",
        "category": "question",
        "sentiment": 0.0,
        "quote_start": 0,
        "quote_end": min(len(content), 200),
    }]


@traceable(name="generate-embeddings", run_type="embedding")
async def generate_embeddings(texts: list[str], ctx: Any) -> list[list[float]]:
    """Generate embeddings using OpenAI's text-embedding-3-small (1536 dims)."""
    if not OPENAI_API_KEY:
        ctx.logger.warn("OPENAI_API_KEY not set, skipping embeddings")
        return [[] for _ in texts]

    try:
        client = openai.OpenAI(api_key=OPENAI_API_KEY)
        response = client.embeddings.create(
            model=EMBEDDING_MODEL,
            input=texts,
        )
        embeddings = [item.embedding for item in response.data]
        ctx.logger.info(f"Generated {len(embeddings)} embeddings (dim={len(embeddings[0]) if embeddings else 0})")
        return embeddings

    except Exception as e:
        ctx.logger.error(f"Embedding generation failed: {e}")
        return [[] for _ in texts]


@traceable(name="discovery-agent", run_type="chain", tags=["discovery", "motia-step"])
async def handler(data: dict[str, Any], ctx: Any) -> None:
    """
    Main handler for the Discovery Agent.

    1. Receives transcript text
    2. Analyzes with Claude for structured insight extraction
    3. Generates embeddings for semantic search (pgvector)
    4. Saves insights to Postgres
    5. Computes spatial layout
    6. Enqueues canvas update
    """
    discovery_id = data.get("discoveryId", "")
    board_id = data.get("boardId", "")
    content = data.get("content", "")

    ctx.logger.info(f"Discovery Agent processing: {discovery_id}", extra={
        "boardId": board_id,
        "contentLength": len(content),
    })

    # Update discovery status to processing
    try:
        update_discovery_status(discovery_id, "processing")
    except Exception as e:
        ctx.logger.warn(f"Could not update discovery status: {e}")

    # Step 1: Extract insights with Claude
    raw_insights = await extract_insights_with_claude(content, ctx)

    # Step 2: Generate embeddings for each insight
    insight_texts = [ins.get("content", "") for ins in raw_insights]
    embeddings = await generate_embeddings(insight_texts, ctx)

    # Step 3: Save insights to Postgres with embeddings
    insight_models = []
    for i, ins in enumerate(raw_insights):
        emb = embeddings[i] if i < len(embeddings) and embeddings[i] else None
        insight_models.append(InsightCreate(
            discoveryId=discovery_id,
            category=ins.get("category", "question"),
            content=ins.get("content", ""),
            quote=ins.get("quote"),
            sentiment=ins.get("sentiment"),
            embedding=emb if emb else None,
        ))

    try:
        insight_ids = create_insights_batch(insight_models)
        ctx.logger.info(f"Saved {len(insight_ids)} insights to Postgres")
    except Exception as e:
        ctx.logger.error(f"Failed to save insights: {e}")
        insight_ids = []

    # Update discovery status to completed
    try:
        update_discovery_status(discovery_id, "completed")
    except Exception as e:
        ctx.logger.warn(f"Could not update discovery status: {e}")

    # Step 4: Compute spatial layout
    positioned_insights = compute_spatial_layout(raw_insights)

    # Step 5: Find connections
    connections = find_connections(raw_insights)

    ctx.logger.info(
        f"Extracted {len(raw_insights)} insights, {len(connections)} connections",
        extra={"discoveryId": discovery_id},
    )

    # Step 6: Enqueue canvas update
    await ctx.enqueue("canvas.update", {
        "boardId": board_id,
        "discoveryId": discovery_id,
        "action": "explosion",
        "shapes": [
            {
                "type": "sticky-note",
                "x": ins["x"],
                "y": ins["y"],
                "props": {
                    "w": ins["w"],
                    "h": ins["h"],
                    "text": ins["content"],
                    "quote": ins.get("quote", ""),
                    "category": ins["category"],
                    "sentiment": ins.get("sentiment", 0),
                    "insightId": insight_ids[idx] if idx < len(insight_ids) else "",
                    "source": json.dumps({
                        "discoveryId": discovery_id,
                        "startOffset": raw_insights[idx].get("quote_start", 0),
                        "endOffset": raw_insights[idx].get("quote_end", 0),
                    }),
                },
            }
            for idx, ins in enumerate(positioned_insights)
        ],
        "connections": connections,
    })

    ctx.logger.info(f"Canvas update enqueued for board {board_id}")
