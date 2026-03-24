"""
Pydantic schemas — request/response validation for all API endpoints.
"""
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List, Any, Dict
from datetime import datetime
from app.models.user import ModelProvider, AgentStatus, TaskRunStatus, PlanTier
import re


# ═══════════════════════════════════════════════════════════════════════════════
# AUTH SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════════

class UserRegister(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=30)
    password: str = Field(..., min_length=6, max_length=72)
    full_name: Optional[str] = Field(None, max_length=100)

    @field_validator("username")
    @classmethod
    def username_alphanumeric(cls, v: str) -> str:
        if not re.match(r"^[a-zA-Z0-9_-]+$", v):
            raise ValueError("Username must contain only letters, numbers, underscores, or hyphens")
        return v.lower()

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one number")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class RefreshRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    full_name: Optional[str]
    avatar_url: Optional[str]
    plan: PlanTier
    is_verified: bool
    runs_today: int
    total_runs: int
    created_at: datetime

    model_config = {"from_attributes": True}


# ═══════════════════════════════════════════════════════════════════════════════
# AGENT SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════════

class AgentCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    role: str = Field(min_length=5, max_length=200)
    goal: str = Field(min_length=10, max_length=2000)
    backstory: Optional[str] = Field(None, max_length=3000)
    instructions: Optional[str] = Field(None, max_length=3000)

    model_provider: ModelProvider = ModelProvider.groq
    model_name: str = "llama3-8b-8192"
    temperature: float = Field(0.1, ge=0.0, le=1.0)
    max_tokens: int = Field(1024, ge=128, le=4096)

    tools: List[str] = Field(default_factory=list)
    template_id: Optional[str] = None
    is_public: bool = False


class AgentUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    role: Optional[str] = Field(None, min_length=5, max_length=200)
    goal: Optional[str] = Field(None, min_length=10, max_length=2000)
    backstory: Optional[str] = None
    instructions: Optional[str] = None
    model_provider: Optional[ModelProvider] = None
    model_name: Optional[str] = None
    temperature: Optional[float] = Field(None, ge=0.0, le=1.0)
    max_tokens: Optional[int] = Field(None, ge=128, le=4096)
    tools: Optional[List[str]] = None
    status: Optional[AgentStatus] = None
    is_public: Optional[bool] = None


class AgentResponse(BaseModel):
    id: int
    name: str
    role: str
    goal: str
    backstory: Optional[str]
    instructions: Optional[str]
    model_provider: ModelProvider
    model_name: str
    temperature: float
    tools: List[str]
    status: AgentStatus
    is_public: bool
    template_id: Optional[str]
    total_runs: int
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = {"from_attributes": True}


class AgentListResponse(BaseModel):
    agents: List[AgentResponse]
    total: int
    page: int
    page_size: int


# ═══════════════════════════════════════════════════════════════════════════════
# TASK RUN SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════════

class TaskRunCreate(BaseModel):
    task_input: str = Field(min_length=3, max_length=5000)
    context: Optional[Dict[str, Any]] = None


class StepRecord(BaseModel):
    step_number: int
    thought: Optional[str] = None
    action: Optional[str] = None
    action_input: Optional[str] = None
    observation: Optional[str] = None
    timestamp: Optional[str] = None


class TaskRunResponse(BaseModel):
    id: int
    agent_id: int
    task_input: str
    status: TaskRunStatus
    result: Optional[str]
    steps: List[Dict[str, Any]]
    error_message: Optional[str]
    tokens_used: int
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    duration_ms: Optional[int]
    user_rating: Optional[int]
    created_at: datetime

    model_config = {"from_attributes": True}


class TaskRunListResponse(BaseModel):
    runs: List[TaskRunResponse]
    total: int


class TaskFeedback(BaseModel):
    rating: int = Field(ge=1, le=5)
    feedback: Optional[str] = Field(None, max_length=1000)


# ═══════════════════════════════════════════════════════════════════════════════
# TEMPLATE SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════════

class ToolInfo(BaseModel):
    id: str
    name: str
    description: str
    is_free: bool = True


class AgentTemplate(BaseModel):
    id: str
    name: str
    description: str
    category: str
    icon: str
    role: str
    goal: str
    backstory: str
    suggested_tools: List[str]
    model_provider: ModelProvider
    model_name: str
    example_tasks: List[str]
    tags: List[str]
    is_featured: bool = False


class TemplateListResponse(BaseModel):
    templates: List[AgentTemplate]
    categories: List[str]


# ═══════════════════════════════════════════════════════════════════════════════
# WORKFLOW SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════════

class WorkflowStepCreate(BaseModel):
    step_order: int
    agent_id: int
    input_mapping: Optional[Dict[str, Any]] = None
    custom_instructions: Optional[str] = None


class WorkflowStepResponse(BaseModel):
    id: int
    step_order: int
    agent_id: int
    agent_name: Optional[str] = None
    input_mapping: Optional[Dict[str, Any]]
    custom_instructions: Optional[str]

    model_config = {"from_attributes": True}


class WorkflowCreate(BaseModel):
    name: str = Field(min_length=3, max_length=200)
    description: Optional[str] = None
    schedule_type: str = "manual"  # manual, daily, weekly, cron
    schedule_value: Optional[str] = None
    steps: List[WorkflowStepCreate]


class WorkflowUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    schedule_type: Optional[str] = None
    schedule_value: Optional[str] = None
    status: Optional[str] = None
    steps: Optional[List[WorkflowStepCreate]] = None


class WorkflowResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    schedule_type: str
    schedule_value: Optional[str]
    status: str
    total_runs: int
    last_run_at: Optional[datetime]
    created_at: datetime
    steps: List[WorkflowStepResponse]

    model_config = {"from_attributes": True}


class WorkflowListResponse(BaseModel):
    workflows: List[WorkflowResponse]
    total: int
    page: int
    page_size: int


class WorkflowRunCreate(BaseModel):
    input_data: Optional[Dict[str, Any]] = None


class WorkflowExecutionResponse(BaseModel):
    id: int
    workflow_id: int
    status: str
    input_data: Optional[Dict]
    step_results: List[Dict]
    final_result: Optional[str]
    error_message: Optional[str]
    duration_ms: Optional[int]
    created_at: datetime
    completed_at: Optional[datetime]

    model_config = {"from_attributes": True}

# ═══════════════════════════════════════════════════════════════════════════════
# DASHBOARD SCHEMA
# ═══════════════════════════════════════════════════════════════════════════════

class DashboardStats(BaseModel):
    total_agents: int
    active_agents: int
    total_runs: int
    runs_today: int
    runs_limit: int
    successful_runs: int
    failed_runs: int
    recent_runs: List[TaskRunResponse]
