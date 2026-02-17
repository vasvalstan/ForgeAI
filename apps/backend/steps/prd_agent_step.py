"""
ForgeAI PRD Agent — The Strategy Synthesizer

Motia Queue Step (Python) that reads board insights, synthesizes them
with Claude into a structured PRD, saves it to Postgres, and enqueues
a canvas update to place a PRD card shape.

Trigger: queue event "prd.generate"
Enqueues: "canvas.update" with a prd-card shape
"""

import json
import os
import sys
from typing import Any

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import anthropic
from langsmith import traceable

from models import PRDCreate
from db import (
    get_board_insights,
    get_board_insights_by_ids,
    create_prd,
)

config = {
    "type": "event",
    "name": "PRDAgent",
    "description": "Synthesizes board insights into a structured Product Requirements Document",
    "subscribes": ["prd.generate"],
    "emits": ["canvas.update"],
    "flows": ["prd-flow"],
}

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
CLAUDE_MODEL = "claude-sonnet-4-20250514"

PRD_SYSTEM_PROMPT = """You are a senior Product Manager creating a Product Requirements Document (PRD).

You will receive a set of user research insights extracted from customer interviews. Each insight has:
- category: pain_point, feature_request, praise, or question
- content: the synthesized insight
- quote: the original user quote (if available)
- sentiment: how positive/negative the feedback was

Your task is to synthesize these insights into a structured PRD. The PRD must be in Markdown format with these sections:

## Problem Statement
Synthesize the pain points into a clear problem statement. Reference specific user quotes.

## User Stories
Convert feature requests and pain points into user stories. Format: "As a [user], I want [goal] so that [benefit]."

## Success Metrics
Define measurable success criteria based on the user feedback patterns.

## Scope
### In Scope
Features and changes that directly address the validated user needs.
### Out of Scope
Things explicitly NOT included in this iteration, with reasoning.

## Technical Considerations
Flag any technical risks, dependencies, or constraints implied by the proposed features.

## Evidence Map
For each key decision, cite the specific insight that supports it using this format:
> [INSIGHT:insight_id] "quoted text"

IMPORTANT RULES:
- Every claim must be traceable to at least one insight
- Prioritize pain points over feature requests
- Flag contradictions between different user feedback
- Be specific, not generic. Reference actual user language.
- Return ONLY the markdown content, no preamble."""


@traceable(name="generate-prd-claude", run_type="llm")
async def generate_prd_with_claude(insights: list[dict], ctx: Any) -> str:
    """Use Claude to synthesize insights into a structured PRD."""
    try:
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

        insights_text = json.dumps(
            [
                {
                    "id": ins.get("id", ""),
                    "category": ins.get("category", ""),
                    "content": ins.get("content", ""),
                    "quote": ins.get("quote", ""),
                    "sentiment": ins.get("sentiment"),
                }
                for ins in insights
            ],
            indent=2,
        )

        response = client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=4096,
            system=PRD_SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": f"Generate a PRD from the following {len(insights)} user research insights:\n\n{insights_text}",
                }
            ],
        )

        prd_content = response.content[0].text
        ctx.logger.info(f"Claude generated PRD ({len(prd_content)} chars)")
        return prd_content

    except Exception as e:
        ctx.logger.error(f"Claude PRD generation failed: {e}")
        return generate_prd_fallback(insights)


def generate_prd_fallback(insights: list[dict]) -> str:
    """Fallback PRD generation when Claude API is unavailable."""
    pain_points = [i for i in insights if i.get("category") == "pain_point"]
    features = [i for i in insights if i.get("category") == "feature_request"]
    praises = [i for i in insights if i.get("category") == "praise"]

    sections = ["## Problem Statement\n"]
    if pain_points:
        sections.append("Users reported the following pain points:\n")
        for p in pain_points[:5]:
            quote = f' — *"{p["quote"]}"*' if p.get("quote") else ""
            sections.append(f"- {p['content']}{quote}\n")
    else:
        sections.append("No explicit pain points identified. Further research needed.\n")

    sections.append("\n## User Stories\n")
    for f in features[:5]:
        sections.append(f"- As a user, I want {f['content'].lower()}\n")

    sections.append("\n## Success Metrics\n")
    sections.append("- Reduction in reported pain points after implementation\n")
    sections.append("- Increase in user satisfaction score\n")

    sections.append("\n## Scope\n")
    sections.append("### In Scope\n")
    for f in features[:3]:
        sections.append(f"- {f['content']}\n")
    sections.append("\n### Out of Scope\n")
    sections.append("- To be determined based on technical review\n")

    sections.append("\n## Technical Considerations\n")
    sections.append("- Technical feasibility review required\n")

    sections.append("\n## Evidence Map\n")
    for ins in insights[:5]:
        if ins.get("quote"):
            sections.append(f'> [INSIGHT:{ins.get("id", "unknown")}] "{ins["quote"]}"\n\n')

    return "".join(sections)


def extract_prd_title(content: str) -> str:
    """Extract a title from the PRD content or generate one."""
    lines = content.strip().split("\n")
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("# "):
            return stripped[2:].strip()
        if stripped.startswith("## Problem Statement"):
            next_idx = lines.index(line) + 1
            if next_idx < len(lines):
                candidate = lines[next_idx].strip()
                if candidate and not candidate.startswith("#"):
                    return candidate[:80]
    return "Product Requirements Document"


@traceable(name="prd-agent", run_type="chain", tags=["prd", "motia-step"])
async def handler(data: dict[str, Any], ctx: Any) -> None:
    """
    Main handler for the PRD Agent.

    1. Reads board insights (all or filtered by IDs)
    2. Synthesizes insights into a structured PRD with Claude
    3. Saves PRD to Postgres
    4. Enqueues canvas update with PRD card shape
    """
    board_id = data.get("boardId", "")
    insight_ids = data.get("insightIds", [])

    ctx.logger.info(f"PRD Agent processing board: {board_id} insightCount: {len(insight_ids)}")

    if insight_ids:
        insights = get_board_insights_by_ids(insight_ids)
    else:
        insights = get_board_insights(board_id)

    if not insights:
        ctx.logger.warn(f"No insights found for board {board_id}")
        return

    ctx.logger.info(f"Loaded {len(insights)} insights for PRD synthesis")

    prd_content = await generate_prd_with_claude(insights, ctx)
    prd_title = extract_prd_title(prd_content)

    prd_id = create_prd(PRDCreate(
        boardId=board_id,
        title=prd_title,
        content=prd_content,
        status="draft",
    ))

    ctx.logger.info(f"PRD saved: {prd_id} — {prd_title}")

    await ctx.emit({"topic": "canvas.update", "data": {
        "boardId": board_id,
        "action": "explosion",
        "shapes": [
            {
                "type": "prd-card",
                "x": 0,
                "y": -400,
                "props": {
                    "w": 360,
                    "h": 200,
                    "title": prd_title,
                    "prdId": prd_id,
                    "status": "draft",
                    "sectionCount": prd_content.count("## "),
                    "insightCount": len(insights),
                },
            }
        ],
    }})

    ctx.logger.info(f"PRD canvas update enqueued for board {board_id}")
