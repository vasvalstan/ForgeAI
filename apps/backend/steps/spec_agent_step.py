"""
ForgeAI Spec Agent — The Technical Specifier

Motia Queue Step (Python) that reads a PRD and board insights,
optionally fetches GitHub repo context, and generates a detailed
technical specification with acceptance criteria using Claude.

Trigger: queue event "spec.generate"
Enqueues: "canvas.update" with a spec-card shape
"""

import json
import os
import sys
from typing import Any, Optional

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import anthropic
from langsmith import traceable

from models import SpecCreate
from db import get_prd, get_board_insights, create_spec

config = {
    "type": "event",
    "name": "SpecAgent",
    "description": "Generates technical specifications from PRDs and board insights",
    "subscribes": ["spec.generate"],
    "emits": ["canvas.update"],
    "flows": ["spec-flow"],
}

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
CLAUDE_MODEL = "claude-sonnet-4-20250514"

SPEC_SYSTEM_PROMPT = """You are a senior Technical Lead writing a technical specification.

You will receive:
1. A PRD (Product Requirements Document) with problem statement, user stories, and scope
2. User research insights that informed the PRD
3. (Optional) GitHub repository context: file structure, schema, recent PRs

Your task is to produce a technical specification in Markdown with these sections:

## Overview
One paragraph summary of what will be built and why.

## Acceptance Criteria
Numbered list of testable criteria. Each must be verifiable.

## Data Model Changes
Specify any new tables, columns, or schema modifications needed.
If GitHub context is provided, reference the actual schema file.

## API Endpoints
List new or modified endpoints with method, path, request/response shape.

## Implementation Plan
Ordered list of implementation steps. Reference actual file paths if GitHub context is available.

## Edge Cases
List edge cases and how they should be handled.

## Complexity Estimate
Rate as: xs (< 1 day), s (1-2 days), m (3-5 days), l (1-2 weeks), xl (> 2 weeks).
Justify the estimate.

IMPORTANT:
- Be specific and reference actual PRD content
- If GitHub context is provided, reference real file paths and patterns
- Do not be generic — tailor everything to this specific feature
- Return ONLY the markdown content"""


def fetch_github_context(github_repo: Optional[str], github_token: Optional[str]) -> str:
    """Fetch repository context from GitHub if credentials are available."""
    if not github_repo or not github_token:
        return ""

    try:
        from github_context import fetch_file_tree, fetch_key_files
        tree = fetch_file_tree(github_repo, github_token)
        key_files = fetch_key_files(github_repo, github_token)
        return f"\n\nGitHub Repository: {github_repo}\n\nFile Structure:\n{tree}\n\nKey Files:\n{key_files}"
    except Exception:
        return ""


@traceable(name="generate-spec-claude", run_type="llm")
async def generate_spec_with_claude(
    prd_content: str,
    insights_text: str,
    feature_title: str,
    github_context: str,
    ctx: Any,
) -> tuple[str, str]:
    """Use Claude to generate a technical specification. Returns (content, complexity)."""
    try:
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

        user_prompt_parts = []
        if feature_title:
            user_prompt_parts.append(f"Feature to specify: {feature_title}\n")
        if prd_content:
            user_prompt_parts.append(f"PRD:\n{prd_content}\n")
        if insights_text:
            user_prompt_parts.append(f"User Research Insights:\n{insights_text}\n")
        if github_context:
            user_prompt_parts.append(f"Repository Context:{github_context}\n")

        if not user_prompt_parts:
            user_prompt_parts.append("Generate a technical spec for a new feature based on the product context.")

        response = client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=4096,
            system=SPEC_SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": "\n".join(user_prompt_parts),
                }
            ],
        )

        spec_content = response.content[0].text
        ctx.logger.info(f"Claude generated spec ({len(spec_content)} chars)")

        complexity = "m"
        content_lower = spec_content.lower()
        for size in ["xs", "xl", "s", "m", "l"]:
            if f"complexity estimate\n" in content_lower or f"**{size}**" in content_lower:
                if f"**{size}**" in content_lower or f": {size}" in content_lower or f"({size})" in content_lower:
                    complexity = size
                    break

        return spec_content, complexity

    except Exception as e:
        ctx.logger.error(f"Claude spec generation failed: {e}")
        fallback = f"## Overview\nTechnical specification for: {feature_title or 'New Feature'}\n\n## Acceptance Criteria\n1. Feature works as described in the PRD\n\n## Complexity Estimate\nm (3-5 days)"
        return fallback, "m"


@traceable(name="spec-agent", run_type="chain", tags=["spec", "motia-step"])
async def handler(data: dict[str, Any], ctx: Any) -> None:
    """
    Main handler for the Spec Agent.

    1. Reads PRD content and board insights
    2. Optionally fetches GitHub repo context
    3. Generates technical specification with Claude
    4. Saves Spec to Postgres
    5. Enqueues canvas update with spec-card shape
    """
    board_id = data.get("boardId", "")
    prd_id = data.get("prdId")
    feature_title = data.get("featureTitle", "")
    github_repo = data.get("githubRepo")
    github_token = data.get("githubToken")

    ctx.logger.info(f"Spec Agent processing for board: {board_id} prd: {prd_id} feature: {feature_title} hasGithub: {bool(github_repo)}")

    prd_content = ""
    if prd_id:
        prd = get_prd(prd_id)
        if prd:
            prd_content = prd.get("content", "")
            if not feature_title:
                feature_title = prd.get("title", "")

    insights = get_board_insights(board_id)
    insights_text = "\n".join(
        f"- [{ins.get('category')}] {ins.get('content')}" for ins in insights[:15]
    )

    github_context = fetch_github_context(github_repo, github_token)

    spec_content, complexity = await generate_spec_with_claude(
        prd_content, insights_text, feature_title, github_context, ctx
    )

    spec_title = feature_title or "Technical Specification"
    spec_id = create_spec(SpecCreate(
        boardId=board_id,
        prdId=prd_id,
        title=spec_title,
        content=spec_content,
        status="draft",
        complexity=complexity,
    ))

    ctx.logger.info(f"Spec saved: {spec_id} — {spec_title} (complexity: {complexity})")

    await ctx.emit({"topic": "canvas.update", "data": {
        "boardId": board_id,
        "action": "explosion",
        "shapes": [
            {
                "type": "spec-card",
                "x": 400,
                "y": -200,
                "props": {
                    "w": 300,
                    "h": 160,
                    "title": spec_title,
                    "specId": spec_id,
                    "prdId": prd_id or "",
                    "status": "draft",
                    "complexity": complexity,
                    "taskCount": 0,
                },
            }
        ],
    }})

    ctx.logger.info(f"Spec canvas update enqueued for board {board_id}")
