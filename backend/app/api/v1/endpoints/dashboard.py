from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.core.config import settings
from app.models.user import User, Agent, TaskRun, AgentStatus, TaskRunStatus
from app.schemas.schemas import DashboardStats

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/", response_model=DashboardStats)
async def get_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    uid = current_user.id

    # Agent counts
    total_agents = (await db.execute(
        select(func.count(Agent.id)).where(Agent.owner_id == uid)
    )).scalar()

    active_agents = (await db.execute(
        select(func.count(Agent.id)).where(Agent.owner_id == uid, Agent.status == AgentStatus.active)
    )).scalar()

    # Run counts
    total_runs = (await db.execute(
        select(func.count(TaskRun.id)).where(TaskRun.user_id == uid)
    )).scalar()

    successful_runs = (await db.execute(
        select(func.count(TaskRun.id)).where(
            TaskRun.user_id == uid, TaskRun.status == TaskRunStatus.completed
        )
    )).scalar()

    failed_runs = (await db.execute(
        select(func.count(TaskRun.id)).where(
            TaskRun.user_id == uid, TaskRun.status == TaskRunStatus.failed
        )
    )).scalar()

    # Recent 10 runs
    recent_q = (
        select(TaskRun)
        .where(TaskRun.user_id == uid)
        .order_by(TaskRun.created_at.desc())
        .limit(10)
    )
    recent_runs = (await db.execute(recent_q)).scalars().all()

    daily_limit = settings.FREE_TIER_DAILY_RUNS if current_user.plan == "free" else 999999

    return DashboardStats(
        total_agents=total_agents,
        active_agents=active_agents,
        total_runs=total_runs,
        runs_today=current_user.runs_today,
        runs_limit=daily_limit,
        successful_runs=successful_runs,
        failed_runs=failed_runs,
        recent_runs=recent_runs,
    )
