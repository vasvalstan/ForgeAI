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
import re
import sys
from typing import Any, Optional

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import anthropic
import openai
from langsmith import traceable

from models import InsightCreate
from db import (
    create_insights_batch,
    update_discovery_status,
    get_discovery,
)

config = {
    "type": "event",
    "name": "DiscoveryAgent",
    "description": "Analyzes transcripts and clusters insights into spatial sticky notes",
    "subscribes": ["discovery.analyze"],
    "emits": ["canvas.update"],
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

MEETING_NOTES_SYSTEM_PROMPT = """You are a Product Discovery Analyst. Your task is to analyze meeting notes and extract structured insights.

For each insight, provide:
- category: one of "pain_point", "feature_request", "praise", "question", "action_item", or "decision"
- content: a clear, concise summary of the insight (1-2 sentences)
- quote: the exact verbatim quote from the notes that supports this insight
- sentiment: a float from -1.0 (very negative) to 1.0 (very positive)
- quote_start: the character offset where the quote begins in the original text
- quote_end: the character offset where the quote ends in the original text

Additional categories for meeting notes:
- action_item: a task or follow-up agreed upon during the meeting
- decision: a decision that was made during the meeting

Extract at most 20 insights. Focus on actionable items and key decisions.

Return your response as a JSON array of objects with the fields above."""


def compute_spatial_layout(
    insights: list[dict],
    connections: Optional[list] = None,
    canvas_center: tuple = (400, 300),
) -> list[dict]:
    """
    Connection-aware force-directed layout engine.

    Uses three forces:
      A. Repulsion — prevents overlap between all node pairs
      B. Category anchor attraction — pulls nodes toward semantic quadrants
      C. Connection spring force — pulls explicitly connected insights together

    Additionally uses keyword-overlap edges so semantically similar notes
    cluster even without explicit connections.
    """
    if not insights:
        return []

    if connections is None:
        connections = []

    card_w = 260
    card_h = 180

    # Wide quadrant anchors — gives the canvas room to breathe
    category_anchors = {
        "pain_point":      (canvas_center[0] - 600, canvas_center[1] - 400),
        "feature_request": (canvas_center[0] + 600, canvas_center[1] - 400),
        "praise":          (canvas_center[0] - 600, canvas_center[1] + 400),
        "question":        (canvas_center[0] + 600, canvas_center[1] + 400),
        "action_item":     (canvas_center[0],       canvas_center[1] + 500),
        "decision":        (canvas_center[0],       canvas_center[1] - 500),
    }

    def tokenize(text: str) -> set[str]:
        stop_words = {
            "the", "a", "an", "is", "are", "to", "in", "of", "and", "it",
            "for", "on", "that", "this", "with", "was", "were", "from",
            "they", "have", "has", "had", "you", "your", "our", "their",
        }
        tokens = re.findall(r"[a-z0-9]+", text.lower())
        return {t for t in tokens if len(t) > 2 and t not in stop_words}

    token_sets = [tokenize(ins.get("content", "")) for ins in insights]

    # Build semantic attraction edges from keyword overlap
    semantic_edges: list[tuple[int, int, float]] = []
    for i in range(len(insights)):
        for j in range(i + 1, len(insights)):
            overlap = len(token_sets[i] & token_sets[j])
            if overlap >= 2:
                semantic_edges.append((i, j, min(1.0, overlap / 6.0)))

    # Initial positions around category anchors with jitter
    n = len(insights)
    positions: list[list[float]] = []
    velocities: list[list[float]] = []
    for insight in insights:
        cat = insight.get("category", "question")
        anchor_x, anchor_y = category_anchors.get(cat, canvas_center)
        angle = random.uniform(0, math.tau)
        radius = random.uniform(60, 200)
        positions.append([
            anchor_x + math.cos(angle) * radius,
            anchor_y + math.sin(angle) * radius,
        ])
        velocities.append([0.0, 0.0])

    # Simulation parameters
    ITERATIONS = 70
    K_REPULSION = 30000.0
    ANCHOR_STRENGTH = 0.035
    SEMANTIC_STRENGTH = 0.05
    LINK_STRENGTH = 0.18         # Spring tension for explicit connections
    TARGET_EDGE_LEN = 240.0
    DAMPING = 0.80
    MAX_STEP = 26.0
    BOUNDS_X = (canvas_center[0] - 1000, canvas_center[0] + 1000)
    BOUNDS_Y = (canvas_center[1] - 800,  canvas_center[1] + 800)

    for _ in range(ITERATIONS):
        forces = [[0.0, 0.0] for _ in range(n)]

        # A. Repulsion (avoid overlap)
        for i in range(n):
            for j in range(i + 1, n):
                dx = positions[j][0] - positions[i][0]
                dy = positions[j][1] - positions[i][1]
                dist_sq = dx * dx + dy * dy + 1.0
                dist = math.sqrt(dist_sq)
                force = K_REPULSION / dist_sq
                fx = force * dx / dist
                fy = force * dy / dist
                forces[i][0] -= fx
                forces[i][1] -= fy
                forces[j][0] += fx
                forces[j][1] += fy

        # B. Category anchor attraction
        for i, insight in enumerate(insights):
            cat = insight.get("category", "question")
            ax, ay = category_anchors.get(cat, canvas_center)
            dx = ax - positions[i][0]
            dy = ay - positions[i][1]
            dist = math.sqrt(dx * dx + dy * dy) + 0.1
            forces[i][0] += (dx / dist) * dist * ANCHOR_STRENGTH
            forces[i][1] += (dy / dist) * dist * ANCHOR_STRENGTH

        # C. Connection spring force (pull explicitly connected insights)
        for conn in connections:
            ci = conn.get("fromInsightIndex", 0)
            cj = conn.get("toInsightIndex", 0)
            if ci >= n or cj >= n:
                continue
            dx = positions[cj][0] - positions[ci][0]
            dy = positions[cj][1] - positions[ci][1]
            fx = dx * LINK_STRENGTH
            fy = dy * LINK_STRENGTH
            forces[ci][0] += fx
            forces[ci][1] += fy
            forces[cj][0] -= fx
            forces[cj][1] -= fy

        # D. Semantic attraction (keyword-overlap edges)
        for i, j, weight in semantic_edges:
            dx = positions[j][0] - positions[i][0]
            dy = positions[j][1] - positions[i][1]
            dist = math.sqrt(dx * dx + dy * dy) + 1e-6
            stretch = dist - TARGET_EDGE_LEN
            force = SEMANTIC_STRENGTH * weight * stretch
            fx = force * dx / dist
            fy = force * dy / dist
            forces[i][0] += fx
            forces[i][1] += fy
            forces[j][0] -= fx
            forces[j][1] -= fy

        # E. Integrate velocity + position with damping
        for i in range(n):
            velocities[i][0] = (velocities[i][0] + forces[i][0]) * DAMPING
            velocities[i][1] = (velocities[i][1] + forces[i][1]) * DAMPING

            step = math.hypot(velocities[i][0], velocities[i][1])
            if step > MAX_STEP:
                scale = MAX_STEP / step
                velocities[i][0] *= scale
                velocities[i][1] *= scale

            positions[i][0] = max(BOUNDS_X[0], min(BOUNDS_X[1], positions[i][0] + velocities[i][0]))
            positions[i][1] = max(BOUNDS_Y[0], min(BOUNDS_Y[1], positions[i][1] + velocities[i][1]))

    # Overlap resolution pass for dense boards
    desired_gap = 230.0
    for _ in range(4):
        for i in range(n):
            for j in range(i + 1, n):
                dx = positions[j][0] - positions[i][0]
                dy = positions[j][1] - positions[i][1]
                dist = math.hypot(dx, dy) + 1e-6
                if dist >= desired_gap:
                    continue
                push = (desired_gap - dist) * 0.5
                nx, ny = dx / dist, dy / dist
                positions[i][0] -= nx * push
                positions[i][1] -= ny * push
                positions[j][0] += nx * push
                positions[j][1] += ny * push

    return [
        {**ins, "x": round(positions[i][0]), "y": round(positions[i][1]), "w": card_w, "h": card_h}
        for i, ins in enumerate(insights)
    ]


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
async def extract_insights_with_claude(content: str, ctx: Any, source_type: str = "transcript") -> list[dict]:
    """Use Claude to extract structured insights from transcript or meeting notes."""
    try:
        system_prompt = MEETING_NOTES_SYSTEM_PROMPT if source_type == "meeting_notes" else EXTRACTION_SYSTEM_PROMPT
        label = "meeting notes" if source_type == "meeting_notes" else "transcript"

        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        response = client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=4096,
            system=system_prompt,
            messages=[
                {
                    "role": "user",
                    "content": f"Analyze the following {label} and extract insights:\n\n---\n{content}\n---",
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
    source_type = data.get("sourceType", "transcript")

    ctx.logger.info(f"Discovery Agent processing: {discovery_id} board: {board_id} contentLen: {len(content)} source: {source_type}")

    # Update discovery status to processing
    try:
        update_discovery_status(discovery_id, "processing")
    except Exception as e:
        ctx.logger.warn(f"Could not update discovery status: {e}")

    # Step 1: Extract insights with Claude
    raw_insights = await extract_insights_with_claude(content, ctx, source_type=source_type)

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

    # Step 4: Find connections between related insights
    connections = find_connections(raw_insights)

    # Step 5: Compute connection-aware spatial layout
    positioned_insights = compute_spatial_layout(raw_insights, connections)

    ctx.logger.info(
        f"Extracted {len(raw_insights)} insights, {len(connections)} connections",
        extra={"discoveryId": discovery_id},
    )

    # Step 6: Emit canvas update
    await ctx.emit({"topic": "canvas.update", "data": {
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
    }})

    ctx.logger.info(f"Canvas update enqueued for board {board_id}")
