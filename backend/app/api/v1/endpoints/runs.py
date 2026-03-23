import asyncio
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.core.config import settings
from app.models.user import User, Agent, TaskRun, TaskRunStatus
from app.schemas.schemas import (
    TaskRunCreate, TaskRunResponse, TaskRunListResponse, TaskFeedback
)
from app.services.agent_runner import AgentRunner

router = APIRouter(prefix="/agents/{agent_id}/runs", tags=["runs"])


async def _reset_daily_runs_if_needed(user: User, db: AsyncSession):
    """Reset the user's daily run counter if 24 hours have passed."""
    now = datetime.now(timezone.utc)
    reset_at = user.runs_reset_at
    if reset_at and reset_at.tzinfo is None:
        reset_at = reset_at.replace(tzinfo=timezone.utc)
    if not reset_at or (now - reset_at) >= timedelta(hours=24):
        await db.execute(
            update(User)
            .where(User.id == user.id)
            .values(runs_today=0, runs_reset_at=now)
        )
        user.runs_today = 0


async def _execute_run(run_id: int, agent: Agent, task_input: str, context: dict):
    """Background task: run the agent and save the result to DB."""
    from app.core.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        # Mark as running
        await db.execute(
            update(TaskRun)
            .where(TaskRun.id == run_id)
            .values(status=TaskRunStatus.running, started_at=datetime.now(timezone.utc))
        )
        await db.commit()

        # Run in thread pool (sync agent runner)
        loop   = asyncio.get_event_loop()
        runner = AgentRunner(agent)
        result = await loop.run_in_executor(
            None, lambda: runner.run_simple(task_input, context)
        )

        # Save result
        await db.execute(
            update(TaskRun)
            .where(TaskRun.id == run_id)
            .values(
                status=result["status"],
                result=result["result"],
                steps=result["steps"],
                tokens_used=result["tokens_used"],
                duration_ms=result["duration_ms"],
                error_message=result.get("error"),
                completed_at=datetime.now(timezone.utc),
            )
        )
        # Increment agent run counter
        await db.execute(
            update(Agent)
            .where(Agent.id == agent.id)
            .values(total_runs=Agent.total_runs + 1)
        )
        await db.commit()


# ── Run a task ────────────────────────────────────────────────────────────────
@router.post("/", response_model=TaskRunResponse, status_code=202)
async def run_task(
    agent_id: int,
    payload: TaskRunCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    # Get the agent
    result = await db.execute(
        select(Agent).where(Agent.id == agent_id, Agent.owner_id == current_user.id)
    )
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    # Rate limit check
    await _reset_daily_runs_if_needed(current_user, db)
    daily_limit = settings.FREE_TIER_DAILY_RUNS if current_user.plan == "free" else 999999

    if current_user.runs_today >= daily_limit:
        raise HTTPException(
            status_code=429,
            detail=f"Daily limit of {daily_limit} runs reached. Resets in 24 hours.",
        )

    # Create the run record (queued)
    run = TaskRun(
        agent_id=agent.id,
        user_id=current_user.id,
        task_input=payload.task_input,
        context=payload.context,
        status=TaskRunStatus.queued,
    )
    db.add(run)

    # Increment counters
    await db.execute(
        update(User)
        .where(User.id == current_user.id)
        .values(runs_today=User.runs_today + 1, total_runs=User.total_runs + 1)
    )

    await db.flush()
    await db.refresh(run)

    # Kick off in background
    background_tasks.add_task(
        _execute_run, run.id, agent, payload.task_input, payload.context or {}
    )

    return run


# ── Poll run status ───────────────────────────────────────────────────────────
@router.get("/{run_id}", response_model=TaskRunResponse)
async def get_run(
    agent_id: int,
    run_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(
        select(TaskRun).where(
            TaskRun.id == run_id,
            TaskRun.user_id == current_user.id,
            TaskRun.agent_id == agent_id,
        )
    )
    run = result.scalar_one_or_none()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return run


# ── List run history for an agent ─────────────────────────────────────────────
@router.get("/", response_model=TaskRunListResponse)
async def list_runs(
    agent_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    # Verify agent ownership
    agent_q = await db.execute(
        select(Agent).where(Agent.id == agent_id, Agent.owner_id == current_user.id)
    )
    if not agent_q.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Agent not found")

    count_q = select(func.count()).where(
        TaskRun.agent_id == agent_id, TaskRun.user_id == current_user.id
    )
    total = (await db.execute(count_q)).scalar()

    runs_q = (
        select(TaskRun)
        .where(TaskRun.agent_id == agent_id, TaskRun.user_id == current_user.id)
        .order_by(TaskRun.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    runs = (await db.execute(runs_q)).scalars().all()

    return TaskRunListResponse(runs=runs, total=total)


# ── Submit feedback for a run ─────────────────────────────────────────────────
@router.post("/{run_id}/feedback")
async def submit_feedback(
    agent_id: int,
    run_id: int,
    payload: TaskFeedback,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(
        select(TaskRun).where(
            TaskRun.id == run_id,
            TaskRun.user_id == current_user.id,
        )
    )
    run = result.scalar_one_or_none()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    if run.status != TaskRunStatus.completed:
        raise HTTPException(status_code=400, detail="Can only rate completed runs")

    run.user_rating   = payload.rating
    run.user_feedback = payload.feedback
    await db.flush()
    return {"message": "Feedback saved. Thank you!"}
