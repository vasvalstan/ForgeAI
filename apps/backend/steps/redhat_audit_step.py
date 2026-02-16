"""
ForgeAI Red Hat Agent — The Adversarial Auditor

Motia Queue Step (Python) that reads current canvas state,
queries pgvector for historical similar insights, sends everything
to Claude for adversarial risk analysis, and creates risk flag shapes.

Trigger: queue event "redhat.audit"
Enqueues: "canvas.update" with risk flag positions
"""

import json
import os
from typing import Any

import anthropic
import openai
from langsmith import traceable

from db import find_similar_insights, get_board_insights
from models import InsightRead

# Motia step config
config = {
    "name": "RedHatAuditAgent",
    "description": "Scans canvas shapes for risks, contradictions, and technical infeasibility",
    "triggers": [
        {
            "type": "queue",
            "topic": "redhat.audit",
        }
    ],
    "enqueues": ["canvas.update"],
    "flows": ["audit-flow"],
}

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
CLAUDE_MODEL = "claude-sonnet-4-20250514"
EMBEDDING_MODEL = "text-embedding-3-small"

AUDIT_SYSTEM_PROMPT = """You are an adversarial product strategy auditor (the "Red Hat").
Your job is to critically examine product decisions and identify risks that the team may be ignoring.

You will receive:
1. Current canvas shapes (sticky notes, feature cards) from a product discovery board
2. Historical insights from past boards that are semantically similar

For each risk you identify, provide:
- targetShapeId: the ID of the shape this risk relates to (empty string if it's a general risk)
- severity: "critical", "high", "medium", or "low"
- reasoning: a clear, actionable explanation of the risk (2-3 sentences)
- riskType: one of "contradiction", "scope_creep", "missing_evidence", "technical_debt", "market_risk", "dependency_risk"

Look for:
- Contradictions between different insights or features
- Scope creep (too many critical priorities, features without matching pain points)
- Missing evidence (high-priority features without user research backing)
- Technical debt risks (features that imply large-scope rewrites)
- Market risks (features that don't address validated pain points)
- Dependency risks (features that depend on unvalidated assumptions)

Be specific and reference the actual content of the shapes. Do NOT be generic.
Return a JSON array of risk objects."""


def get_embedding_for_context(shapes: list[dict], ctx: Any) -> list[float]:
    """Generate an embedding for the combined canvas context."""
    if not OPENAI_API_KEY:
        return []

    combined_text = " ".join(
        s.get("props", {}).get("text", "") or s.get("props", {}).get("title", "") or s.get("props", {}).get("reasoning", "")
        for s in shapes
    )[:8000]

    if not combined_text.strip():
        return []

    try:
        client = openai.OpenAI(api_key=OPENAI_API_KEY)
        response = client.embeddings.create(
            model=EMBEDDING_MODEL,
            input=[combined_text],
        )
        return response.data[0].embedding
    except Exception as e:
        ctx.logger.warn(f"Context embedding failed: {e}")
        return []


@traceable(name="audit-with-claude", run_type="llm")
async def audit_with_claude(
    shapes: list[dict],
    similar_insights: list[dict],
    ctx: Any,
) -> list[dict]:
    """Use Claude to perform adversarial risk analysis."""
    try:
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

        shapes_summary = json.dumps(
            [
                {
                    "id": s.get("id", ""),
                    "type": s.get("type", ""),
                    "text": s.get("props", {}).get("text", ""),
                    "title": s.get("props", {}).get("title", ""),
                    "category": s.get("props", {}).get("category", ""),
                    "priority": s.get("props", {}).get("priority", ""),
                    "sentiment": s.get("props", {}).get("sentiment"),
                }
                for s in shapes
            ],
            indent=2,
        )

        historical_summary = ""
        if similar_insights:
            historical_summary = "\n\nHistorical similar insights from past boards:\n" + json.dumps(
                [
                    {
                        "category": ins.get("category"),
                        "content": ins.get("content"),
                        "sentiment": ins.get("sentiment"),
                        "distance": ins.get("distance"),
                    }
                    for ins in similar_insights
                ],
                indent=2,
            )

        response = client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=4096,
            system=AUDIT_SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": f"Audit the following product discovery board:\n\nCurrent shapes:\n{shapes_summary}{historical_summary}",
                }
            ],
        )

        response_text = response.content[0].text

        json_text = response_text
        if "```json" in json_text:
            json_text = json_text.split("```json")[1].split("```")[0]
        elif "```" in json_text:
            json_text = json_text.split("```")[1].split("```")[0]

        risks = json.loads(json_text.strip())
        ctx.logger.info(f"Claude identified {len(risks)} risks")
        return risks

    except Exception as e:
        ctx.logger.error(f"Claude audit failed: {e}")
        return analyze_risks_heuristic(shapes)


def analyze_risks_heuristic(shapes: list[dict]) -> list[dict]:
    """Fallback heuristic risk analysis when Claude API is unavailable."""
    risks = []

    feature_cards = [s for s in shapes if s.get("type") == "feature-card"]
    sticky_notes = [s for s in shapes if s.get("type") == "sticky-note"]
    pain_points = [
        s for s in sticky_notes
        if s.get("props", {}).get("category") == "pain_point"
    ]

    for feature in feature_cards:
        props = feature.get("props", {})
        title = props.get("title", "").lower()
        desc = props.get("description", "").lower()

        if any(w in title + desc for w in ["redesign", "rewrite", "overhaul", "migration"]):
            risks.append({
                "targetShapeId": feature.get("id", ""),
                "severity": "high",
                "reasoning": f"'{props.get('title')}' appears to be a large-scope change. Consider breaking this into smaller, testable increments to reduce risk.",
                "riskType": "scope_creep",
            })

        related_pains = [
            p for p in pain_points
            if any(
                word in p.get("props", {}).get("content", "").lower()
                for word in title.split() if len(word) > 3
            )
        ]
        if not related_pains and props.get("priority") in ("critical", "high"):
            risks.append({
                "targetShapeId": feature.get("id", ""),
                "severity": "medium",
                "reasoning": f"'{props.get('title')}' is marked {props.get('priority')} but has no linked user pain point. Validate this feature against actual user feedback.",
                "riskType": "missing_evidence",
            })

    critical_features = [
        f for f in feature_cards
        if f.get("props", {}).get("priority") == "critical"
    ]
    if len(critical_features) > 3:
        risks.append({
            "targetShapeId": "",
            "severity": "high",
            "reasoning": f"{len(critical_features)} features marked as 'critical'. When everything is critical, nothing is. Consider re-prioritizing.",
            "riskType": "scope_creep",
        })

    return risks


@traceable(name="redhat-audit-agent", run_type="chain", tags=["redhat", "motia-step"])
async def handler(data: dict[str, Any], ctx: Any) -> None:
    """
    Main handler for the Red Hat Audit Agent.

    1. Reads current canvas shapes from the event data
    2. Generates context embedding for pgvector similarity search
    3. Queries historical insights for cross-board patterns
    4. Sends shapes + historical context to Claude for adversarial analysis
    5. Creates risk flag shapes via canvas.update
    """
    board_id = data.get("boardId", "")
    shapes = data.get("shapes", [])

    ctx.logger.info(f"Red Hat auditing board: {board_id}", extra={
        "shapeCount": len(shapes),
    })

    # Step 1: Generate context embedding for similarity search
    context_embedding = get_embedding_for_context(shapes, ctx)

    # Step 2: Find historically similar insights (the "AI Memory" pillar)
    similar_insights = []
    if context_embedding:
        try:
            similar_insights = find_similar_insights(
                embedding=context_embedding,
                limit=10,
            )
            ctx.logger.info(f"Found {len(similar_insights)} similar historical insights")
        except Exception as e:
            ctx.logger.warn(f"pgvector search failed: {e}")

    # Step 3: Audit with Claude
    risks = await audit_with_claude(shapes, similar_insights, ctx)

    ctx.logger.info(f"Found {len(risks)} risks", extra={"boardId": board_id})

    if risks:
        # Position risk flags near their target shapes
        risk_shapes = []
        for i, risk in enumerate(risks):
            target_id = risk.get("targetShapeId", "")
            target_shape = next(
                (s for s in shapes if s.get("id") == target_id),
                None,
            )

            if target_shape:
                x = target_shape.get("x", 0) + 280
                y = target_shape.get("y", 0) + (i % 3) * 50
            else:
                x = 50 + (i % 4) * 300
                y = 50 + (i // 4) * 160

            risk_shapes.append({
                "type": "risk-flag",
                "x": x,
                "y": y,
                "props": {
                    "w": 280,
                    "h": 140,
                    "severity": risk.get("severity", "medium"),
                    "reasoning": risk.get("reasoning", ""),
                    "targetShapeId": target_id,
                },
            })

        await ctx.enqueue("canvas.update", {
            "boardId": board_id,
            "action": "audit",
            "shapes": risk_shapes,
        })

    ctx.logger.info(f"Red Hat audit complete for board {board_id}")
