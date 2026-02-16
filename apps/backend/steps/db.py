"""
Direct PostgreSQL helper for Python Motia steps.

Since Prisma Client is JS/TS-only, Python steps use psycopg2 to write
directly to the same Neon PostgreSQL database. All queries must stay in
sync with the Prisma schema (packages/db/prisma/schema.prisma).

Uses connection pooling and parameterized queries to prevent SQL injection.
"""

import os
import json
from contextlib import contextmanager
from typing import Optional
from datetime import datetime

import psycopg2
from psycopg2.extras import RealDictCursor, execute_values

from models import InsightCreate, DiscoveryCreate

DATABASE_URL = os.environ.get("DATABASE_URL", "")

# CUID-compatible ID generation (matches Prisma's @default(cuid()))
import random
import string
import time

def generate_cuid() -> str:
    """Generate a CUID-like identifier matching Prisma's default."""
    timestamp = hex(int(time.time() * 1000))[2:]
    random_part = ''.join(random.choices(string.ascii_lowercase + string.digits, k=12))
    return f"c{timestamp}{random_part}"


@contextmanager
def get_connection():
    """Get a database connection with auto-commit and cleanup."""
    conn = psycopg2.connect(DATABASE_URL)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


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
    now = datetime.utcnow()

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
                (status, datetime.utcnow(), discovery_id)
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
    now = datetime.utcnow()

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
    now = datetime.utcnow()

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
