"""
ForgeAI Task Agent — The Engineering Breakdown

Motia Queue Step (Python) that reads a technical specification,
optionally fetches GitHub repo context, and breaks it down into
concrete, implementable engineering tasks.

Trigger: queue event "task.breakdown"
Enqueues: "canvas.update" with a task-list shape
"""

import json
import os
import sys
from typing import Any, Optional

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import anthropic
from langsmith import traceable

from models import TaskCreate
from db import get_spec, create_tasks_batch

config = {
    "type": "event",
    "name": "TaskAgent",
    "description": "Breaks technical specs into concrete engineering tasks",
    "subscribes": ["task.breakdown"],
    "emits": ["canvas.update"],
    "flows": ["task-flow"],
}

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
CLAUDE_MODEL = "claude-sonnet-4-20250514"

TASK_SYSTEM_PROMPT = """You are a senior Engineering Manager breaking down a technical specification into implementation tasks.

You will receive:
1. A technical specification with acceptance criteria, data model changes, and API endpoints
2. (Optional) GitHub repository context: file structure, schema, recent PRs

Your task is to produce a JSON array of engineering tasks. Each task should have:
- title: concise task title (e.g., "Add `status` column to users table")
- description: detailed description including what to do, where to do it, and acceptance criteria for this specific task
- complexity: one of "xs" (< 2 hours), "s" (2-4 hours), "m" (4-8 hours), "l" (1-2 days), "xl" (> 2 days)
- suggested_files: array of file paths that will likely need changes (if GitHub context available)

IMPORTANT RULES:
- Tasks should be atomic — each is a single PR or commit
- Order tasks by dependency (do data model first, then API, then UI)
- Include setup tasks (migrations, config) as explicit tasks
- Include a final "Testing & QA" task
- If GitHub context is provided, reference actual file paths
- Aim for 5-12 tasks. Merge trivial tasks, split complex ones.
- Return ONLY the JSON array, no preamble."""


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


@traceable(name="breakdown-tasks-claude", run_type="llm")
async def breakdown_with_claude(
    spec_content: str,
    github_context: str,
    ctx: Any,
) -> list[dict]:
    """Use Claude to break a spec into engineering tasks."""
    try:
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

        user_parts = [f"Technical Specification:\n{spec_content}"]
        if github_context:
            user_parts.append(f"Repository Context:{github_context}")

        response = client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=4096,
            system=TASK_SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": "\n\n".join(user_parts),
                }
            ],
        )

        response_text = response.content[0].text

        json_text = response_text
        if "```json" in json_text:
            json_text = json_text.split("```json")[1].split("```")[0]
        elif "```" in json_text:
            json_text = json_text.split("```")[1].split("```")[0]

        tasks = json.loads(json_text.strip())
        ctx.logger.info(f"Claude generated {len(tasks)} tasks")
        return tasks

    except Exception as e:
        ctx.logger.error(f"Claude task breakdown failed: {e}")
        return [
            {"title": "Implement feature", "description": "Implement the feature as described in the spec.", "complexity": "m"},
            {"title": "Write tests", "description": "Write unit and integration tests.", "complexity": "s"},
            {"title": "Testing & QA", "description": "Manual testing and QA review.", "complexity": "s"},
        ]


@traceable(name="task-agent", run_type="chain", tags=["task", "motia-step"])
async def handler(data: dict[str, Any], ctx: Any) -> None:
    """
    Main handler for the Task Agent.

    1. Reads the spec from Postgres
    2. Optionally fetches GitHub repo context
    3. Breaks the spec into tasks with Claude
    4. Saves tasks to Postgres
    5. Enqueues canvas update with task-list shape
    """
    spec_id = data.get("specId", "")
    board_id = data.get("boardId", "")
    github_repo = data.get("githubRepo")
    github_token = data.get("githubToken")

    ctx.logger.info(f"Task Agent processing spec: {spec_id} board: {board_id} hasGithub: {bool(github_repo)}")

    spec = get_spec(spec_id)
    if not spec:
        ctx.logger.error(f"Spec not found: {spec_id}")
        return

    spec_content = spec.get("content", "")
    spec_title = spec.get("title", "Spec")

    github_context = fetch_github_context(github_repo, github_token)

    raw_tasks = await breakdown_with_claude(spec_content, github_context, ctx)

    task_models = [
        TaskCreate(
            specId=spec_id,
            title=t.get("title", "Task"),
            description=t.get("description", ""),
            complexity=t.get("complexity", "m"),
        )
        for t in raw_tasks
    ]

    task_ids = create_tasks_batch(task_models)
    ctx.logger.info(f"Saved {len(task_ids)} tasks for spec {spec_id}")

    task_data = [
        {
            "id": task_ids[i] if i < len(task_ids) else "",
            "title": t.get("title", "Task"),
            "status": "todo",
            "complexity": t.get("complexity", "m"),
        }
        for i, t in enumerate(raw_tasks)
    ]

    await ctx.emit({"topic": "canvas.update", "data": {
        "boardId": board_id,
        "action": "explosion",
        "shapes": [
            {
                "type": "task-list",
                "x": 750,
                "y": -200,
                "props": {
                    "w": 280,
                    "h": min(200 + len(task_data) * 20, 400),
                    "specId": spec_id,
                    "specTitle": spec_title,
                    "tasks": json.dumps(task_data),
                },
            }
        ],
    }})

    ctx.logger.info(f"Task canvas update enqueued for board {board_id}")
