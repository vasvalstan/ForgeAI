"""
Pydantic models that mirror the Prisma schema exactly.

These models ensure Python <-> Prisma consistency when the Python agent
writes directly to PostgreSQL. Any change to schema.prisma MUST be
reflected here to avoid data corruption.

Prisma schema location: packages/db/prisma/schema.prisma
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


# ─── Auth Models ──────────────────────────────────────────

class UserRead(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    image: Optional[str] = None
    credits: int = 100


# ─── Board Models ─────────────────────────────────────────

class BoardRead(BaseModel):
    id: str
    title: str
    ownerId: str
    liveblocksRoomId: str
    thumbnailUrl: Optional[str] = None


# ─── Discovery Models ─────────────────────────────────────

class DiscoveryCreate(BaseModel):
    """Create a new Discovery record."""
    id: str
    boardId: str
    sourceType: str  # "transcript" | "audio" | "notes"
    rawContent: str
    status: str = "pending"  # pending | processing | completed | failed


class DiscoveryUpdate(BaseModel):
    """Update a Discovery's status."""
    id: str
    status: str  # pending | processing | completed | failed


class DiscoveryRead(BaseModel):
    id: str
    boardId: str
    sourceType: str
    rawContent: str
    status: str
    createdAt: datetime


# ─── Insight Models ───────────────────────────────────────

class InsightCreate(BaseModel):
    """Create a new Insight with optional embedding vector.

    IMPORTANT: The embedding dimension MUST match schema.prisma's
    vector(1536). This is calibrated for OpenAI text-embedding-3-small.
    If switching to a different embedding model, update BOTH:
    1. schema.prisma: vector(N)
    2. The embedding generation call in discovery_agent_step.py
    """
    discoveryId: str
    category: str  # pain_point | feature_request | praise | question
    content: str
    quote: Optional[str] = None
    sentiment: Optional[float] = None
    layerId: Optional[str] = None
    embedding: Optional[list[float]] = Field(
        default=None,
        description="1536-dim vector from text-embedding-3-small"
    )


class InsightRead(BaseModel):
    id: str
    discoveryId: str
    category: str
    content: str
    quote: Optional[str] = None
    sentiment: Optional[float] = None
    layerId: Optional[str] = None
    createdAt: datetime


# ─── Conversation Models ──────────────────────────────────

class ConversationCreate(BaseModel):
    boardId: str
    title: str = "New Conversation"


class MessageCreate(BaseModel):
    conversationId: str
    role: str  # user | assistant | system
    content: str
    status: Optional[str] = None  # processing | completed | cancelled


# ─── PRD Models ───────────────────────────────────────────

class PRDCreate(BaseModel):
    boardId: str
    title: str
    content: str
    status: str = "draft"  # draft | review | approved


class PRDRead(BaseModel):
    id: str
    boardId: str
    title: str
    content: str
    status: str
    createdAt: datetime
    updatedAt: datetime


# ─── Spec Models ─────────────────────────────────────────

class SpecCreate(BaseModel):
    boardId: str
    prdId: Optional[str] = None
    title: str
    content: str
    shapeId: Optional[str] = None
    status: str = "draft"  # draft | review | approved | shipped
    complexity: Optional[str] = None  # xs | s | m | l | xl


class SpecRead(BaseModel):
    id: str
    boardId: str
    prdId: Optional[str] = None
    title: str
    content: str
    shapeId: Optional[str] = None
    status: str
    complexity: Optional[str] = None
    createdAt: datetime
    updatedAt: datetime


# ─── Task Models ─────────────────────────────────────────

class TaskCreate(BaseModel):
    specId: str
    title: str
    description: str
    complexity: Optional[str] = None  # xs | s | m | l | xl
    status: str = "todo"  # todo | in_progress | done


class TaskRead(BaseModel):
    id: str
    specId: str
    title: str
    description: str
    complexity: Optional[str] = None
    githubIssueUrl: Optional[str] = None
    githubIssueId: Optional[int] = None
    status: str
    createdAt: datetime
    updatedAt: datetime


# ─── Meeting Note Models ──────────────────────────────────

class MeetingNoteCreate(BaseModel):
    boardId: str
    title: str
    content: str


class MeetingNoteRead(BaseModel):
    id: str
    boardId: str
    title: str
    content: str
    createdAt: datetime
    updatedAt: datetime
