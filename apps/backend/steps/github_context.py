"""
ForgeAI GitHub Context Utility

Fetches repository context from GitHub for use by the Red Hat Auditor,
Spec Agent, and Task Agent. Provides file tree, key file contents, and
recent PR information.

Uses the GitHub REST API with a Personal Access Token (PAT).
"""

import json
from typing import Optional
from urllib.request import Request, urlopen
from urllib.error import URLError

GITHUB_API = "https://api.github.com"
MAX_KEY_FILE_SIZE = 30000
MAX_TREE_FILES = 200

SCHEMA_PATTERNS = [
    "schema.prisma", "schema.sql", "schema.ts", "schema.py",
    "models.py", "models.ts", "types.ts", "types.d.ts",
]

CONFIG_PATTERNS = [
    "package.json", "requirements.txt", "pyproject.toml",
    "Cargo.toml", "go.mod", "README.md",
]


def _github_get(path: str, token: str) -> Optional[object]:
    """Make a GET request to the GitHub API."""
    url = f"{GITHUB_API}/{path.lstrip('/')}"
    req = Request(url, headers={
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    })
    try:
        with urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode())
    except (URLError, json.JSONDecodeError):
        return None


def _parse_repo(repo: str) -> tuple[str, str]:
    """Parse 'owner/repo' into (owner, repo)."""
    parts = repo.strip("/").split("/")
    if len(parts) >= 2:
        return parts[0], parts[1]
    return repo, repo


def fetch_file_tree(repo: str, token: str) -> str:
    """Fetch the recursive file tree for a repository.

    Returns a newline-separated list of file paths (max MAX_TREE_FILES).
    """
    owner, name = _parse_repo(repo)
    data = _github_get(f"repos/{owner}/{name}/git/trees/HEAD?recursive=1", token)

    if not data or "tree" not in data:
        return "(Could not fetch file tree)"

    files = [
        item["path"]
        for item in data["tree"]
        if item.get("type") == "blob"
    ][:MAX_TREE_FILES]

    return "\n".join(files)


def fetch_key_files(repo: str, token: str) -> str:
    """Fetch the contents of key files (schema, config, README).

    Returns concatenated file contents with headers, truncated to fit
    within context limits.
    """
    owner, name = _parse_repo(repo)

    # First get the file tree to find matching files
    data = _github_get(f"repos/{owner}/{name}/git/trees/HEAD?recursive=1", token)
    if not data or "tree" not in data:
        return "(Could not fetch key files)"

    all_paths = [item["path"] for item in data["tree"] if item.get("type") == "blob"]

    # Find files matching our patterns
    target_files = []
    for path in all_paths:
        filename = path.rsplit("/", 1)[-1] if "/" in path else path
        if filename in SCHEMA_PATTERNS or filename in CONFIG_PATTERNS:
            target_files.append(path)

    # Also grab any migration files (just the names, not content)
    migration_files = [p for p in all_paths if "migration" in p.lower() or "migrate" in p.lower()]

    result_parts = []
    total_size = 0

    for file_path in target_files[:10]:
        if total_size > MAX_KEY_FILE_SIZE:
            break

        file_data = _github_get(f"repos/{owner}/{name}/contents/{file_path}", token)
        if not file_data or "content" not in file_data:
            continue

        import base64
        try:
            content = base64.b64decode(file_data["content"]).decode("utf-8", errors="replace")
        except Exception:
            continue

        # Truncate large files
        if len(content) > 5000:
            content = content[:5000] + "\n... (truncated)"

        result_parts.append(f"--- {file_path} ---\n{content}\n")
        total_size += len(content)

    if migration_files:
        result_parts.append(f"\nMigration files found: {', '.join(migration_files[:10])}")

    return "\n".join(result_parts) if result_parts else "(No key files found)"


def fetch_recent_prs(repo: str, token: str, limit: int = 5) -> str:
    """Fetch recent merged PRs for velocity and pattern context.

    Returns a summary of recent PRs with titles, descriptions, and files changed.
    """
    owner, name = _parse_repo(repo)
    prs = _github_get(f"repos/{owner}/{name}/pulls?state=closed&sort=updated&direction=desc&per_page={limit}", token)

    if not prs or not isinstance(prs, list):
        return "(Could not fetch recent PRs)"

    merged_prs = [pr for pr in prs if pr.get("merged_at")][:limit]

    if not merged_prs:
        return "(No recently merged PRs found)"

    parts = []
    for pr in merged_prs:
        title = pr.get("title", "Untitled")
        number = pr.get("number", "?")
        body = (pr.get("body") or "")[:200]
        merged_at = pr.get("merged_at", "unknown")

        parts.append(f"PR #{number}: {title}\n  Merged: {merged_at}\n  {body}")

    return "\n\n".join(parts)
