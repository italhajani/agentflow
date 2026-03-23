"""
Database models for AgentFlow.

Tables:
  users        — platform accounts
  agents       — user-created AI agents
  tasks        — task definitions assigned to agents
  task_runs    — execution records (one per agent.run(task))
  agent_tools  — which tools each agent can use
"""
from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime,
    ForeignKey, JSON, Enum as SAEnum, Float, Index
)
from sqlalchemy.orm import relationship
import enum

from app.core.database import Base


def utcnow():
    return datetime.now(timezone.utc)


# ── Enums ─────────────────────────────────────────────────────────────────────
class AgentStatus(str, enum.Enum):
    active   = "active"
    paused   = "paused"
    archived = "archived"


class TaskRunStatus(str, enum.Enum):
    queued    = "queued"
    running   = "running"
    completed = "completed"
    failed    = "failed"
    cancelled = "cancelled"


class ModelProvider(str, enum.Enum):
    groq         = "groq"
    huggingface  = "huggingface"
    gemini       = "gemini"
    ollama       = "ollama"   # local fallback


class PlanTier(str, enum.Enum):
    free    = "free"
    pro     = "pro"
    team    = "team"


# ── User ──────────────────────────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, index=True)
    email         = Column(String(255), unique=True, index=True, nullable=False)
    username      = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name     = Column(String(100), nullable=True)
    avatar_url    = Column(String(500), nullable=True)

    # Account state
    is_active     = Column(Boolean, default=True, nullable=False)
    is_verified   = Column(Boolean, default=False, nullable=False)
    plan          = Column(SAEnum(PlanTier), default=PlanTier.free, nullable=False)

    # Usage tracking (rate limiting)
    runs_today    = Column(Integer, default=0, nullable=False)
    runs_reset_at = Column(DateTime(timezone=True), default=utcnow)
    total_runs    = Column(Integer, default=0, nullable=False)

    # Timestamps
    created_at    = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at    = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    last_login_at = Column(DateTime(timezone=True), nullable=True)

    # Relations
    agents        = relationship("Agent", back_populates="owner", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User {self.username}>"


# ── Agent ─────────────────────────────────────────────────────────────────────
class Agent(Base):
    __tablename__ = "agents"

    id            = Column(Integer, primary_key=True, index=True)
    owner_id      = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Identity
    name          = Column(String(100), nullable=False)
    role          = Column(String(200), nullable=False)   # "E-commerce Assistant"
    goal          = Column(Text, nullable=False)           # "Help users find and buy products"
    backstory     = Column(Text, nullable=True)            # personality / context
    instructions  = Column(Text, nullable=True)            # extra system prompt

    # Model config
    model_provider = Column(SAEnum(ModelProvider), default=ModelProvider.groq, nullable=False)
    model_name     = Column(String(100), default="llama3-8b-8192", nullable=False)
    temperature    = Column(Float, default=0.1, nullable=False)
    max_tokens     = Column(Integer, default=1024, nullable=False)

    # Template info (null = custom agent)
    template_id   = Column(String(50), nullable=True)
    template_data = Column(JSON, nullable=True)   # snapshot of template config

    # Tools (stored as list of tool IDs)
    tools         = Column(JSON, default=list)    # ["web_search", "calculator", ...]

    # State
    status        = Column(SAEnum(AgentStatus), default=AgentStatus.active, nullable=False)
    is_public     = Column(Boolean, default=False)   # visible in marketplace
    total_runs    = Column(Integer, default=0)
    avg_rating    = Column(Float, nullable=True)

    # Timestamps
    created_at    = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at    = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    # Relations
    owner         = relationship("User", back_populates="agents")
    task_runs     = relationship("TaskRun", back_populates="agent", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_agents_owner_status", "owner_id", "status"),
    )

    def __repr__(self):
        return f"<Agent {self.name}>"


# ── TaskRun ───────────────────────────────────────────────────────────────────
class TaskRun(Base):
    """
    One execution of an agent on a task.
    Each time a user clicks 'Run', a new TaskRun is created.
    """
    __tablename__ = "task_runs"

    id            = Column(Integer, primary_key=True, index=True)
    agent_id      = Column(Integer, ForeignKey("agents.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id       = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Input
    task_input    = Column(Text, nullable=False)       # the user's task description
    context       = Column(JSON, nullable=True)        # optional extra context dict

    # Output
    status        = Column(SAEnum(TaskRunStatus), default=TaskRunStatus.queued, nullable=False)
    result        = Column(Text, nullable=True)        # final answer from agent
    steps         = Column(JSON, default=list)         # list of {thought, action, observation}
    error_message = Column(Text, nullable=True)
    tokens_used   = Column(Integer, default=0)

    # Timing
    started_at    = Column(DateTime(timezone=True), nullable=True)
    completed_at  = Column(DateTime(timezone=True), nullable=True)
    duration_ms   = Column(Integer, nullable=True)

    # Feedback
    user_rating   = Column(Integer, nullable=True)   # 1-5
    user_feedback = Column(Text, nullable=True)

    # Timestamps
    created_at    = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    # Relations
    agent         = relationship("Agent", back_populates="task_runs")
    user          = relationship("User")

    __table_args__ = (
        Index("ix_task_runs_agent_status", "agent_id", "status"),
        Index("ix_task_runs_user_created", "user_id", "created_at"),
    )

    def __repr__(self):
        return f"<TaskRun {self.id} [{self.status}]>"
