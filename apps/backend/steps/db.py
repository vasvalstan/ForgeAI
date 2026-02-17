"""
Direct PostgreSQL helper for Python Motia steps.

Since Prisma Client is JS/TS-only, Python steps use psycopg2 to write
directly to the same Neon PostgreSQL database. All queries must stay in
sync with the Prisma schema (packages/db/prisma/schema.prisma).

Uses connection pooling and parameterized queries to prevent SQL injection.
"""

import atexit
import os
from contextlib import contextmanager
from datetime import datetime, timezone
from threading import Lock
from typing import Optional

from cuid2 import cuid_wrapper
from psycopg2.extras import RealDictCursor
from psycopg2.pool import SimpleConnectionPool

from models import (
    InsightCreate, DiscoveryCreate, PRDCreate, SpecCreate, TaskCreate,
    ConversationCreate, MessageCreate, MeetingNoteCreate,
)

DATABASE_URL = os.environ.get("DATABASE_URL", "")
POOL_MIN_CONN = int(os.environ.get("PG_POOL_MIN_CONN", "1"))
POOL_MAX_CONN = int(os.environ.get("PG_POOL_MAX_CONN", "5"))

if POOL_MIN_CONN < 1 or POOL_MAX_CONN < 1 or POOL_MIN_CONN > POOL_MAX_CONN:
    raise ValueError("Invalid pool sizes: ensure 1 <= PG_POOL_MIN_CONN <= PG_POOL_MAX_CONN")


_pool_lock = Lock()
_pool: Optional[SimpleConnectionPool] = None
_cuid2_generator = cuid_wrapper()


def _get_pool() -> SimpleConnectionPool:
    """Lazily initialize and return the shared PostgreSQL connection pool."""
    global _pool
    if _pool is None:
        with _pool_lock:
            if _pool is None:
                if not DATABASE_URL:
                    raise ValueError("DATABASE_URL is required for PostgreSQL operations")
                _pool = SimpleConnectionPool(
                    minconn=POOL_MIN_CONN,
                    maxconn=POOL_MAX_CONN,
                    dsn=DATABASE_URL,
                )
    return _pool


def _close_pool() -> None:
    """Close all pooled connections on process shutdown."""
    global _pool
    if _pool is not None:
        _pool.closeall()
        _pool = None


atexit.register(_close_pool)


def generate_cuid() -> str:
    """Generate a CUID2 identifier."""
    return _cuid2_generator()


@contextmanager
def get_connection():
    """Borrow a pooled connection with auto-commit and cleanup."""
    pool = _get_pool()
    conn = pool.getconn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        pool.putconn(conn)


def get_board(board_id: str) -> Optional[dict]:
    """Fetch a board by ID."""
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                'SELECT id, title, "ownerId", "liveblocksRoomId" FROM "Board" WHERE id = %s',
                (board_id,)
            )
            row = cur.fetchone()
            return dict(row) if row else None


def get_user(user_id: str) -> Optional[dict]:
    """Fetch a user by ID."""
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                'SELECT id, email, name, credits FROM "User" WHERE id = %s',
                (user_id,)
            )
            row = cur.fetchone()
            return dict(row) if row else None


def deduct_credits(user_id: str, amount: int) -> bool:
    """Deduct credits from a user. Returns False if insufficient."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                'UPDATE "User" SET credits = credits - %s WHERE id = %s AND credits >= %s RETURNING credits',
                (amount, user_id, amount)
            )
            result = cur.fetchone()
            return result is not None


def create_discovery(data: DiscoveryCreate) -> str:
    """Create a new Discovery record. Returns the ID."""
    discovery_id = data.id or generate_cuid()
    now = datetime.now(timezone.utc)

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO "Discovery" (id, "boardId", "sourceType", "rawContent", status, "createdAt", "updatedAt")
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (discovery_id, data.boardId, data.sourceType, data.rawContent, data.status, now, now)
            )
    return discovery_id


def update_discovery_status(discovery_id: str, status: str) -> None:
    """Update a Discovery's status."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                'UPDATE "Discovery" SET status = %s, "updatedAt" = %s WHERE id = %s',
                (status, datetime.now(timezone.utc), discovery_id)
            )


def get_discovery(discovery_id: str) -> Optional[dict]:
    """Fetch a Discovery by ID."""
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                'SELECT id, "boardId", "sourceType", "rawContent", status FROM "Discovery" WHERE id = %s',
                (discovery_id,)
            )
            row = cur.fetchone()
            return dict(row) if row else None


def create_insight(data: InsightCreate) -> str:
    """Create a new Insight with optional pgvector embedding."""
    insight_id = generate_cuid()
    now = datetime.now(timezone.utc)

    with get_connection() as conn:
        with conn.cursor() as cur:
            if data.embedding:
                # Insert with vector embedding
                embedding_str = f"[{','.join(str(v) for v in data.embedding)}]"
                cur.execute(
                    """
                    INSERT INTO "Insight"
                        (id, "discoveryId", category, content, quote, sentiment, "layerId", embedding, "createdAt")
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s::vector, %s)
                    """,
                    (
                        insight_id, data.discoveryId, data.category,
                        data.content, data.quote, data.sentiment,
                        data.layerId, embedding_str, now
                    )
                )
            else:
                cur.execute(
                    """
                    INSERT INTO "Insight"
                        (id, "discoveryId", category, content, quote, sentiment, "layerId", "createdAt")
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        insight_id, data.discoveryId, data.category,
                        data.content, data.quote, data.sentiment,
                        data.layerId, now
                    )
                )
    return insight_id


def create_insights_batch(insights: list[InsightCreate]) -> list[str]:
    """Batch insert multiple insights for efficiency."""
    ids = []
    now = datetime.now(timezone.utc)

    with get_connection() as conn:
        with conn.cursor() as cur:
            for data in insights:
                insight_id = generate_cuid()
                ids.append(insight_id)

                if data.embedding:
                    embedding_str = f"[{','.join(str(v) for v in data.embedding)}]"
                    cur.execute(
                        """
                        INSERT INTO "Insight"
                            (id, "discoveryId", category, content, quote, sentiment, "layerId", embedding, "createdAt")
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s::vector, %s)
                        """,
                        (
                            insight_id, data.discoveryId, data.category,
                            data.content, data.quote, data.sentiment,
                            data.layerId, embedding_str, now
                        )
                    )
                else:
                    cur.execute(
                        """
                        INSERT INTO "Insight"
                            (id, "discoveryId", category, content, quote, sentiment, "layerId", "createdAt")
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        """,
                        (
                            insight_id, data.discoveryId, data.category,
                            data.content, data.quote, data.sentiment,
                            data.layerId, now
                        )
                    )
    return ids


def find_similar_insights(
    embedding: list[float],
    limit: int = 5,
    exclude_discovery_id: Optional[str] = None,
) -> list[dict]:
    """
    Find semantically similar insights using pgvector cosine distance.

    Uses the <=> operator for cosine similarity search.
    Requires the vector extension and an index on the embedding column.
    """
    embedding_str = f"[{','.join(str(v) for v in embedding)}]"

    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            if exclude_discovery_id:
                cur.execute(
                    """
                    SELECT id, "discoveryId", category, content, quote, sentiment,
                           embedding <=> %s::vector AS distance
                    FROM "Insight"
                    WHERE embedding IS NOT NULL AND "discoveryId" != %s
                    ORDER BY embedding <=> %s::vector
                    LIMIT %s
                    """,
                    (embedding_str, exclude_discovery_id, embedding_str, limit)
                )
            else:
                cur.execute(
                    """
                    SELECT id, "discoveryId", category, content, quote, sentiment,
                           embedding <=> %s::vector AS distance
                    FROM "Insight"
                    WHERE embedding IS NOT NULL
                    ORDER BY embedding <=> %s::vector
                    LIMIT %s
                    """,
                    (embedding_str, embedding_str, limit)
                )
            rows = cur.fetchall()
            return [dict(row) for row in rows]


def get_board_insights(board_id: str) -> list[dict]:
    """Get all insights for a board (across all its discoveries)."""
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT i.id, i."discoveryId", i.category, i.content, i.quote, i.sentiment
                FROM "Insight" i
                JOIN "Discovery" d ON d.id = i."discoveryId"
                WHERE d."boardId" = %s
                ORDER BY i."createdAt" DESC
                """,
                (board_id,)
            )
            rows = cur.fetchall()
            return [dict(row) for row in rows]


def get_board_insights_by_ids(insight_ids: list[str]) -> list[dict]:
    """Get insights by a list of IDs."""
    if not insight_ids:
        return []
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            placeholders = ",".join(["%s"] * len(insight_ids))
            cur.execute(
                f"""
                SELECT id, "discoveryId", category, content, quote, sentiment
                FROM "Insight"
                WHERE id IN ({placeholders})
                ORDER BY "createdAt" DESC
                """,
                tuple(insight_ids),
            )
            rows = cur.fetchall()
            return [dict(row) for row in rows]


# ─── PRD Functions ───────────────────────────────────────

def create_prd(data: PRDCreate) -> str:
    """Create a new PRD record. Returns the ID."""
    prd_id = generate_cuid()
    now = datetime.now(timezone.utc)

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO "PRD" (id, "boardId", title, content, status, "createdAt", "updatedAt")
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (prd_id, data.boardId, data.title, data.content, data.status, now, now),
            )
    return prd_id


def get_prd(prd_id: str) -> Optional[dict]:
    """Fetch a PRD by ID."""
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                'SELECT id, "boardId", title, content, status, "createdAt", "updatedAt" FROM "PRD" WHERE id = %s',
                (prd_id,),
            )
            row = cur.fetchone()
            return dict(row) if row else None


def get_board_prds(board_id: str) -> list[dict]:
    """Get all PRDs for a board."""
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, "boardId", title, content, status, "createdAt", "updatedAt"
                FROM "PRD"
                WHERE "boardId" = %s
                ORDER BY "createdAt" DESC
                """,
                (board_id,),
            )
            rows = cur.fetchall()
            return [dict(row) for row in rows]


# ─── Spec Functions ──────────────────────────────────────

def create_spec(data: SpecCreate) -> str:
    """Create a new Spec record. Returns the ID."""
    spec_id = generate_cuid()
    now = datetime.now(timezone.utc)

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO "Spec" (id, "boardId", "prdId", title, content, "shapeId", status, complexity, "createdAt", "updatedAt")
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (spec_id, data.boardId, data.prdId, data.title, data.content, data.shapeId, data.status, data.complexity, now, now),
            )
    return spec_id


def get_spec(spec_id: str) -> Optional[dict]:
    """Fetch a Spec by ID."""
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                'SELECT id, "boardId", "prdId", title, content, "shapeId", status, complexity, "createdAt", "updatedAt" FROM "Spec" WHERE id = %s',
                (spec_id,),
            )
            row = cur.fetchone()
            return dict(row) if row else None


def get_prd_specs(prd_id: str) -> list[dict]:
    """Get all specs for a PRD."""
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, "boardId", "prdId", title, content, "shapeId", status, complexity, "createdAt", "updatedAt"
                FROM "Spec"
                WHERE "prdId" = %s
                ORDER BY "createdAt" DESC
                """,
                (prd_id,),
            )
            rows = cur.fetchall()
            return [dict(row) for row in rows]


def get_board_specs(board_id: str) -> list[dict]:
    """Get all specs for a board."""
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, "boardId", "prdId", title, content, "shapeId", status, complexity, "createdAt", "updatedAt"
                FROM "Spec"
                WHERE "boardId" = %s
                ORDER BY "createdAt" DESC
                """,
                (board_id,),
            )
            rows = cur.fetchall()
            return [dict(row) for row in rows]


# ─── Task Functions ──────────────────────────────────────

def create_tasks_batch(tasks: list[TaskCreate]) -> list[str]:
    """Batch insert multiple tasks. Returns list of IDs."""
    ids = []
    now = datetime.now(timezone.utc)

    with get_connection() as conn:
        with conn.cursor() as cur:
            for data in tasks:
                task_id = generate_cuid()
                ids.append(task_id)
                cur.execute(
                    """
                    INSERT INTO "Task" (id, "specId", title, description, complexity, status, "createdAt", "updatedAt")
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (task_id, data.specId, data.title, data.description, data.complexity, data.status, now, now),
                )
    return ids


def get_spec_tasks(spec_id: str) -> list[dict]:
    """Get all tasks for a spec."""
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, "specId", title, description, complexity, "githubIssueUrl", "githubIssueId", status, "createdAt", "updatedAt"
                FROM "Task"
                WHERE "specId" = %s
                ORDER BY "createdAt" ASC
                """,
                (spec_id,),
            )
            rows = cur.fetchall()
            return [dict(row) for row in rows]


def update_task_github(task_id: str, issue_url: str, issue_id: int) -> None:
    """Update a task with its GitHub Issue URL and ID."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                'UPDATE "Task" SET "githubIssueUrl" = %s, "githubIssueId" = %s, "updatedAt" = %s WHERE id = %s',
                (issue_url, issue_id, datetime.now(timezone.utc), task_id),
            )


# ─── Conversation Functions ──────────────────────────────

def create_conversation(data: ConversationCreate) -> str:
    """Create a new conversation. Returns the ID."""
    conv_id = generate_cuid()
    now = datetime.now(timezone.utc)

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO "Conversation" (id, "boardId", title, "createdAt", "updatedAt")
                VALUES (%s, %s, %s, %s, %s)
                """,
                (conv_id, data.boardId, data.title, now, now),
            )
    return conv_id


def create_message(data: MessageCreate) -> str:
    """Create a new message in a conversation. Returns the ID."""
    msg_id = generate_cuid()
    now = datetime.now(timezone.utc)

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO "Message" (id, "conversationId", role, content, status, "createdAt")
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (msg_id, data.conversationId, data.role, data.content, data.status, now),
            )
    return msg_id


def get_board_github(board_id: str) -> Optional[dict]:
    """Get GitHub connection info for a board."""
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                'SELECT "githubRepo", "githubToken" FROM "Board" WHERE id = %s',
                (board_id,),
            )
            row = cur.fetchone()
            if row and row.get("githubRepo"):
                return dict(row)
            return None


# ─── Meeting Note Functions ──────────────────────────────

def create_meeting_note(data: MeetingNoteCreate) -> str:
    """Create a new meeting note. Returns the ID."""
    note_id = generate_cuid()
    now = datetime.now(timezone.utc)

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO "MeetingNote" (id, "boardId", title, content, "createdAt", "updatedAt")
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (note_id, data.boardId, data.title, data.content, now, now),
            )
    return note_id
