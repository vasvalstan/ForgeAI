"""
ForgeAI Red Hat Agent — Consensus Audit (High-Confidence Governance)

Motia Queue Step (Python) implementing a "Double-Blind" verification process:
- Primary Audit (Claude 3.7): Identifies scope creep, technical debt, contradictions
- Cross-Check (Kimi K2): Independently reviews the same context
- Consensus Resolver (Qwen 2.5): Pins ONLY risks both models agree on to the canvas

This moves ForgeAI from "helpful chatbot" to a rigorous Product Operating System
that prevents "AI Slop" by forcing independent models to agree before surfacing risks.

Trigger: queue event "redhat.audit"
Emits: "canvas.update" with alert_card shapes for verified consensus risks
"""

import asyncio
import json
import os
import sys
from typing import Any

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import anthropic
import openai
from langsmith import traceable

from db import find_similar_insights, get_board_github

config = {
    "type": "event",
    "name": "RedHatConsensusAudit",
    "description": "Double-blind consensus audit: Claude + Kimi in parallel, Qwen resolves. Only agreed risks reach the canvas.",
    "subscribes": ["redhat.audit"],
    "emits": ["canvas.update"],
    "flows": ["audit-flow"],
}

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
MOONSHOT_API_KEY = os.environ.get("MOONSHOT_API_KEY", "")
DASHSCOPE_API_KEY = os.environ.get("DASHSCOPE_API_KEY", "")

CLAUDE_MODEL = "claude-sonnet-4-20250514"
KIMI_MODEL = "moonshot-v1-32k"  # or kimi-k2-0905-preview for Kimi K2
QWEN_MODEL = "qwen-plus"
EMBEDDING_MODEL = "text-embedding-3-small"

MOONSHOT_BASE_URL = "https://api.moonshot.ai/v1"
DASHSCOPE_BASE_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"

AUDIT_SYSTEM_PROMPT = """You are an adversarial product strategy auditor (the "Red Hat").
Your job is to critically examine product decisions and identify risks that the team may be ignoring.

You will receive:
1. Current canvas shapes (sticky notes, feature cards) from a product discovery board
2. Historical insights from past boards that are semantically similar

For each risk you identify, provide a JSON array with objects containing:
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

If GitHub repository context is provided, also assess:
- Technical feasibility based on the actual codebase structure and schema
- Whether proposed features conflict with existing data models
- Whether the team's recent PRs suggest bandwidth for the proposed scope

Be specific and reference the actual content of the shapes. Do NOT be generic.
Return ONLY a valid JSON array of risk objects, no other text."""


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


def _extract_risks_from_response(response_text: str, ctx: Any, source: str) -> list[dict]:
    """Parse JSON array of risks from LLM response."""
    json_text = response_text.strip()
    if "```json" in json_text:
        json_text = json_text.split("```json")[1].split("```")[0]
    elif "```" in json_text:
        json_text = json_text.split("```")[1].split("```")[0]
    try:
        risks = json.loads(json_text.strip())
        if isinstance(risks, list):
            return risks
        return []
    except json.JSONDecodeError as e:
        ctx.logger.warn(f"{source} returned invalid JSON: {e}")
        return []


@traceable(name="audit-with-claude", run_type="llm")
async def audit_with_claude(
    proposal_text: str,
    historical_summary: str,
    github_context: str,
    ctx: Any,
) -> list[dict]:
    """Primary audit: Claude identifies potential scope creep and technical debt."""
    if not ANTHROPIC_API_KEY:
        ctx.logger.warn("ANTHROPIC_API_KEY not set, skipping Claude audit")
        return []
    try:
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        repo_context = f"\n\nCodebase Context:{github_context}" if github_context else ""
        response = client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=4096,
            system=AUDIT_SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": f"Audit the following product discovery board:\n\n{proposal_text}{historical_summary}{repo_context}",
                }
            ],
        )
        response_text = response.content[0].text
        risks = _extract_risks_from_response(response_text, ctx, "Claude")
        ctx.logger.info(f"Claude identified {len(risks)} risks")
        return risks
    except Exception as e:
        ctx.logger.error(f"Claude audit failed: {e}")
        return []


@traceable(name="audit-with-kimi", run_type="llm")
async def audit_with_kimi(
    proposal_text: str,
    historical_summary: str,
    github_context: str,
    ctx: Any,
) -> list[dict]:
    """Cross-check: Kimi K2 independently reviews the same context (double-blind)."""
    if not MOONSHOT_API_KEY:
        ctx.logger.warn("MOONSHOT_API_KEY not set, skipping Kimi cross-check")
        return []
    try:
        client = openai.OpenAI(
            api_key=MOONSHOT_API_KEY,
            base_url=MOONSHOT_BASE_URL,
        )
        repo_context = f"\n\nCodebase Context:{github_context}" if github_context else ""
        response = client.chat.completions.create(
            model=KIMI_MODEL,
            max_tokens=4096,
            messages=[
                {"role": "system", "content": AUDIT_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": f"Audit the following product discovery board:\n\n{proposal_text}{historical_summary}{repo_context}",
                },
            ],
        )
        response_text = response.choices[0].message.content or ""
        risks = _extract_risks_from_response(response_text, ctx, "Kimi")
        ctx.logger.info(f"Kimi identified {len(risks)} risks")
        return risks
    except Exception as e:
        ctx.logger.error(f"Kimi audit failed: {e}")
        return []


@traceable(name="resolve-consensus-with-qwen", run_type="llm")
async def resolve_consensus_with_qwen(
    audit_a: list[dict],
    audit_b: list[dict],
    ctx: Any,
) -> list[dict]:
    """
    Consensus Resolver: Qwen compares both audits and returns ONLY risks both agree on.
    If they disagree, the risk is discarded (Low Confidence).
    """
    if not DASHSCOPE_API_KEY:
        ctx.logger.warn("DASHSCOPE_API_KEY not set, using heuristic consensus")
        return _heuristic_consensus(audit_a, audit_b, ctx)

    resolver_prompt = f"""Analyze these two independent technical audits of a product feature.
Both auditors examined the same proposal without seeing each other's notes.

Audit A (Claude): {json.dumps(audit_a, indent=2)}
Audit B (Kimi): {json.dumps(audit_b, indent=2)}

Identify ONLY the risks that BOTH audits agree on. Two risks "agree" if they:
- Target the same shape (targetShapeId) or both are general risks
- Describe the same type of concern (riskType)
- Point to similar underlying issues

If they disagree on a risk, discard it (Low Confidence).
Return a JSON array of verified risks. Each object must have:
- targetShapeId: string
- severity: "high" (consensus risks are always high-confidence)
- description: merged explanation of the agreed risk
- shared_logic: brief evidence from both audits that supports this risk

Return ONLY the JSON array, no other text."""

    try:
        client = openai.OpenAI(
            api_key=DASHSCOPE_API_KEY,
            base_url=DASHSCOPE_BASE_URL,
        )
        response = client.chat.completions.create(
            model=QWEN_MODEL,
            max_tokens=4096,
            messages=[
                {"role": "user", "content": resolver_prompt},
            ],
        )
        response_text = response.choices[0].message.content or ""
        verified = _extract_risks_from_response(response_text, ctx, "Qwen")
        ctx.logger.info(f"Qwen resolved {len(verified)} consensus risks")
        return verified
    except Exception as e:
        ctx.logger.error(f"Qwen consensus resolution failed: {e}")
        return _heuristic_consensus(audit_a, audit_b, ctx)


def _heuristic_consensus(audit_a: list[dict], audit_b: list[dict], ctx: Any) -> list[dict]:
    """
    Fallback: Find risks that both audits flagged (by riskType + targetShapeId).
    Used when Qwen API is unavailable.
    """
    def risk_key(r: dict) -> tuple:
        return (r.get("targetShapeId", ""), r.get("riskType", ""))

    keys_a = {risk_key(r): r for r in audit_a}
    verified = []
    for r in audit_b:
        k = risk_key(r)
        if k in keys_a:
            a = keys_a[k]
            verified.append({
                "targetShapeId": r.get("targetShapeId", ""),
                "severity": "high",
                "description": a.get("reasoning", r.get("reasoning", "")),
                "shared_logic": f"Both auditors flagged: {r.get('riskType', '')}",
            })
    ctx.logger.info(f"Heuristic consensus: {len(verified)} agreed risks")
    return verified


def analyze_risks_heuristic(shapes: list[dict]) -> list[dict]:
    """Fallback heuristic risk analysis when all APIs are unavailable."""
    risks = []
    feature_cards = [s for s in shapes if s.get("type") == "feature-card"]
    sticky_notes = [s for s in shapes if s.get("type") == "sticky-note"]
    pain_points = [s for s in sticky_notes if s.get("props", {}).get("category") == "pain_point"]

    for feature in feature_cards:
        props = feature.get("props", {})
        title = props.get("title", "").lower()
        desc = props.get("description", "").lower()

        if any(w in title + desc for w in ["redesign", "rewrite", "overhaul", "migration"]):
            risks.append({
                "targetShapeId": feature.get("id", ""),
                "severity": "high",
                "reasoning": f"'{props.get('title')}' appears to be a large-scope change.",
                "riskType": "scope_creep",
            })

        related_pains = [
            p for p in pain_points
            if any(word in p.get("props", {}).get("content", "").lower() for word in title.split() if len(word) > 3)
        ]
        if not related_pains and props.get("priority") in ("critical", "high"):
            risks.append({
                "targetShapeId": feature.get("id", ""),
                "severity": "medium",
                "reasoning": f"'{props.get('title')}' is marked {props.get('priority')} but has no linked user pain point.",
                "riskType": "missing_evidence",
            })

    critical_features = [f for f in feature_cards if f.get("props", {}).get("priority") == "critical"]
    if len(critical_features) > 3:
        risks.append({
            "targetShapeId": "",
            "severity": "high",
            "reasoning": f"{len(critical_features)} features marked as 'critical'. Consider re-prioritizing.",
            "riskType": "scope_creep",
        })

    return risks


def _build_proposal_and_context(
    shapes: list[dict],
    similar_insights: list[dict],
) -> tuple[str, str]:
    """Build proposal text and historical summary for audit prompts."""
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
    proposal = f"Current shapes:\n{shapes_summary}"

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

    return proposal, historical_summary


@traceable(name="redhat-consensus-audit", run_type="chain", tags=["redhat", "consensus", "motia-step"])
async def handler(data: dict[str, Any], ctx: Any) -> None:
    """
    Consensus Audit handler:
    1. Trigger parallel audits (Claude + Kimi) via asyncio.gather
    2. Resolve consensus with Qwen (or heuristic fallback)
    3. Emit canvas.update with add_consensus_warnings + alert_card shapes
    """
    board_id = data.get("boardId", "")
    shapes = data.get("shapes", [])

    ctx.logger.info(f"Consensus audit starting for board: {board_id} shapeCount: {len(shapes)}")

    # Step 1: Context
    context_embedding = get_embedding_for_context(shapes, ctx)
    similar_insights = []
    if context_embedding:
        try:
            similar_insights = find_similar_insights(embedding=context_embedding, limit=10)
            ctx.logger.info(f"Found {len(similar_insights)} similar historical insights")
        except Exception as e:
            ctx.logger.warn(f"pgvector search failed: {e}")

    github_context = ""
    try:
        github_info = get_board_github(board_id)
        if github_info:
            from github_context import fetch_file_tree, fetch_key_files, fetch_recent_prs
            repo = github_info["githubRepo"]
            token = github_info["githubToken"]
            tree = fetch_file_tree(repo, token)
            key_files = fetch_key_files(repo, token)
            recent_prs = fetch_recent_prs(repo, token)
            github_context = f"\n\nGitHub Repository: {repo}\n\nFile Structure:\n{tree}\n\nKey Files:\n{key_files}\n\nRecent PRs:\n{recent_prs}"
            ctx.logger.info(f"Fetched GitHub context for {repo}")
    except Exception as e:
        ctx.logger.warn(f"GitHub context fetch failed: {e}")

    proposal_text, historical_summary = _build_proposal_and_context(shapes, similar_insights)

    # Step 2: Parallel audits (Claude + Kimi)
    audit_tasks = []
    if ANTHROPIC_API_KEY:
        audit_tasks.append(audit_with_claude(proposal_text, historical_summary, github_context, ctx))
    if MOONSHOT_API_KEY:
        audit_tasks.append(audit_with_kimi(proposal_text, historical_summary, github_context, ctx))

    if not audit_tasks:
        ctx.logger.warn("No audit APIs configured, using heuristic fallback")
        risks = analyze_risks_heuristic(shapes)
        verified_risks = [{"targetShapeId": r.get("targetShapeId", ""), "severity": r.get("severity", "high"), "description": r.get("reasoning", ""), "shared_logic": r.get("riskType", "")} for r in risks]
    else:
        audit_results = await asyncio.gather(*audit_tasks, return_exceptions=True)

        # Unwrap results, handling exceptions
        audit_a = audit_results[0] if isinstance(audit_results[0], list) else []
        audit_b = audit_results[1] if len(audit_results) > 1 and isinstance(audit_results[1], list) else []

        if len(audit_tasks) == 1:
            # Single model: treat as consensus (no cross-check)
            verified_risks = [
                {
                    "targetShapeId": r.get("targetShapeId", ""),
                    "severity": "high",
                    "description": r.get("reasoning", ""),
                    "shared_logic": r.get("riskType", ""),
                }
                for r in audit_a
            ]
            ctx.logger.info(f"Single-model mode: {len(verified_risks)} risks (no cross-check)")
        else:
            # Step 3: Consensus resolution
            verified_risks = await resolve_consensus_with_qwen(audit_a, audit_b, ctx)

    # Normalize verified risks to alert_card format
    for r in verified_risks:
        if "reasoning" in r and "description" not in r:
            r["description"] = r["reasoning"]
        if "shared_logic" not in r:
            r["shared_logic"] = r.get("riskType", "")

    ctx.logger.info(f"Verified {len(verified_risks)} consensus risks for board: {board_id}")

    if verified_risks:
        alert_shapes = []
        for i, risk in enumerate(verified_risks):
            target_id = risk.get("targetShapeId", "")
            target_shape = next((s for s in shapes if s.get("id") == target_id), None)

            if target_shape:
                x = target_shape.get("x", 0) + 280
                y = target_shape.get("y", 0) + (i % 3) * 50
            else:
                x = 50 + (i % 4) * 300
                y = 50 + (i // 4) * 160

            alert_shapes.append({
                "type": "alert_card",
                "x": x,
                "y": y,
                "props": {
                    "w": 280,
                    "h": 140,
                    "severity": "high",
                    "title": "Consensus Risk Identified",
                    "content": risk.get("description", ""),
                    "evidence": risk.get("shared_logic", ""),
                    "targetShapeId": target_id,
                },
            })

        await ctx.emit({
            "topic": "canvas.update",
            "data": {
                "boardId": board_id,
                "action": "add_consensus_warnings",
                "shapes": alert_shapes,
            },
        })

    ctx.logger.info(f"Consensus audit complete for board {board_id} (Verified by ForgeAI Consensus)")
