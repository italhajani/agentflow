from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.user import User, Agent, AgentStatus
from app.schemas.schemas import (
    AgentCreate, AgentUpdate, AgentResponse, AgentListResponse
)

router = APIRouter(prefix="/agents", tags=["agents"])


# ── List my agents ────────────────────────────────────────────────────────────
@router.get("/", response_model=AgentListResponse)
async def list_agents(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[AgentStatus] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    query = select(Agent).where(Agent.owner_id == current_user.id)
    if status:
        query = query.where(Agent.status == status)

    # Total count
    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar()

    # Paginated results
    query = query.order_by(Agent.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    agents = result.scalars().all()

    return AgentListResponse(agents=agents, total=total, page=page, page_size=page_size)


# ── Create agent ──────────────────────────────────────────────────────────────
@router.post("/", response_model=AgentResponse, status_code=201)
async def create_agent(
    payload: AgentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    # Free tier: max 5 agents
    count_q = select(func.count()).where(
        Agent.owner_id == current_user.id,
        Agent.status != AgentStatus.archived
    )
    agent_count = (await db.execute(count_q)).scalar()

    if current_user.plan == "free" and agent_count >= 5:
        raise HTTPException(
            status_code=403,
            detail="Free tier allows up to 5 active agents. Upgrade to Pro for unlimited agents.",
        )

    agent = Agent(
        owner_id=current_user.id,
        name=payload.name,
        role=payload.role,
        goal=payload.goal,
        backstory=payload.backstory,
        instructions=payload.instructions,
        model_provider=payload.model_provider,
        model_name=payload.model_name,
        temperature=payload.temperature,
        max_tokens=payload.max_tokens,
        tools=payload.tools,
        template_id=payload.template_id,
        is_public=payload.is_public,
    )
    db.add(agent)
    await db.flush()
    await db.refresh(agent)
    return agent


# ── Get single agent ──────────────────────────────────────────────────────────
@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(
    agent_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(
        select(Agent).where(Agent.id == agent_id, Agent.owner_id == current_user.id)
    )
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


# ── Update agent ──────────────────────────────────────────────────────────────
@router.patch("/{agent_id}", response_model=AgentResponse)
async def update_agent(
    agent_id: int,
    payload: AgentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(
        select(Agent).where(Agent.id == agent_id, Agent.owner_id == current_user.id)
    )
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(agent, field, value)

    await db.flush()
    await db.refresh(agent)
    return agent


# ── Delete (archive) agent ────────────────────────────────────────────────────
@router.delete("/{agent_id}", status_code=204)
async def delete_agent(
    agent_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(
        select(Agent).where(Agent.id == agent_id, Agent.owner_id == current_user.id)
    )
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    # Soft delete — archive instead of hard delete to preserve history
    agent.status = AgentStatus.archived
    await db.flush()
