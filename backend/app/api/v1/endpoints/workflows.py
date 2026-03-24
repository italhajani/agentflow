from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from typing import Optional, List, Dict
import asyncio
import time
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.user import User, Agent, Workflow, WorkflowStep, WorkflowExecution, TaskRunStatus
from app.schemas.schemas import (
    WorkflowCreate, WorkflowUpdate, WorkflowResponse, WorkflowListResponse,
    WorkflowRunCreate, WorkflowExecutionResponse
)
from app.services.agent_runner import AgentRunner

router = APIRouter(prefix="/workflows", tags=["workflows"])


async def _execute_workflow(execution_id: int, workflow_id: int, user_id: int, input_data: dict):
    """Background task: run all steps in order"""
    from app.core.database import AsyncSessionLocal
    
    async with AsyncSessionLocal() as db:
        # Mark as running
        await db.execute(
            update(WorkflowExecution)
            .where(WorkflowExecution.id == execution_id)
            .values(status=TaskRunStatus.running, started_at=datetime.now(timezone.utc))
        )
        await db.commit()
        
        # Get workflow and steps
        result = await db.execute(
            select(Workflow).where(Workflow.id == workflow_id)
        )
        workflow = result.scalar_one()
        
        steps_result = await db.execute(
            select(WorkflowStep)
            .where(WorkflowStep.workflow_id == workflow_id)
            .order_by(WorkflowStep.step_order)
        )
        steps = steps_result.scalars().all()
        
        step_results = []
        current_input = input_data.get("task", "") if input_data else ""
        
        for step in steps:
            # Get agent
            agent_result = await db.execute(
                select(Agent).where(Agent.id == step.agent_id)
            )
            agent = agent_result.scalar_one_or_none()
            if not agent:
                step_results.append({"step": step.step_order, "error": "Agent not found"})
                continue
            
            # Prepare task input (with template substitution)
            task_input = current_input
            if step.input_mapping and "task" in step.input_mapping:
                template = step.input_mapping["task"]
                if "{{previous.result}}" in template:
                    task_input = template.replace("{{previous.result}}", str(current_input))
            
            # Run agent
            runner = AgentRunner(agent)
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None, lambda: runner.run_simple(task_input, {})
            )
            
            step_result = {
                "step": step.step_order,
                "agent_id": step.agent_id,
                "agent_name": agent.name,
                "status": result["status"],
                "result": result["result"],
                "error": result.get("error")
            }
            step_results.append(step_result)
            
            if result["status"] == TaskRunStatus.completed:
                current_input = result["result"]
            else:
                break  # Stop on failure
        
        # Check overall status
        all_completed = all(r.get("status") == TaskRunStatus.completed for r in step_results)
        final_status = TaskRunStatus.completed if all_completed else TaskRunStatus.failed
        
        # Update execution
        await db.execute(
            update(WorkflowExecution)
            .where(WorkflowExecution.id == execution_id)
            .values(
                status=final_status,
                step_results=step_results,
                final_result=current_input if all_completed else None,
                error_message=next((r.get("error") for r in step_results if r.get("error")), None),
                completed_at=datetime.now(timezone.utc),
                duration_ms=int((time.time() - (await db.execute(
                    select(WorkflowExecution.started_at).where(WorkflowExecution.id == execution_id)
                )).scalar().timestamp()) * 1000) if final_status == TaskRunStatus.completed else None
            )
        )
        
        # Update workflow total runs
        await db.execute(
            update(Workflow)
            .where(Workflow.id == workflow_id)
            .values(total_runs=Workflow.total_runs + 1, last_run_at=datetime.now(timezone.utc))
        )
        await db.commit()


# ── Create workflow ───────────────────────────────────────────────────────────
@router.post("/", response_model=WorkflowResponse, status_code=201)
async def create_workflow(
    payload: WorkflowCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    # Create workflow
    workflow = Workflow(
        user_id=current_user.id,
        name=payload.name,
        description=payload.description,
        schedule_type=payload.schedule_type,
        schedule_value=payload.schedule_value,
    )
    db.add(workflow)
    await db.flush()
    
    # Add steps
    for step_data in payload.steps:
        step = WorkflowStep(
            workflow_id=workflow.id,
            step_order=step_data.step_order,
            agent_id=step_data.agent_id,
            input_mapping=step_data.input_mapping,
            custom_instructions=step_data.custom_instructions,
        )
        db.add(step)
    
    await db.flush()
    await db.refresh(workflow)
    
    # Load steps for response
    steps_result = await db.execute(
        select(WorkflowStep).where(WorkflowStep.workflow_id == workflow.id)
        .order_by(WorkflowStep.step_order)
    )
    workflow.steps = steps_result.scalars().all()
    
    return workflow


# ── List workflows ───────────────────────────────────────────────────────────
@router.get("/", response_model=WorkflowListResponse)
async def list_workflows(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    query = select(Workflow).where(Workflow.user_id == current_user.id)
    
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar()
    
    query = query.order_by(Workflow.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    workflows = result.scalars().all()
    
    return WorkflowListResponse(workflows=workflows, total=total, page=page, page_size=page_size)


# ── Get single workflow ──────────────────────────────────────────────────────
@router.get("/{workflow_id}", response_model=WorkflowResponse)
async def get_workflow(
    workflow_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(
        select(Workflow).where(Workflow.id == workflow_id, Workflow.user_id == current_user.id)
    )
    workflow = result.scalar_one_or_none()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    steps_result = await db.execute(
        select(WorkflowStep).where(WorkflowStep.workflow_id == workflow_id)
        .order_by(WorkflowStep.step_order)
    )
    workflow.steps = steps_result.scalars().all()
    
    return workflow


# ── Update workflow ──────────────────────────────────────────────────────────
@router.patch("/{workflow_id}", response_model=WorkflowResponse)
async def update_workflow(
    workflow_id: int,
    payload: WorkflowUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(
        select(Workflow).where(Workflow.id == workflow_id, Workflow.user_id == current_user.id)
    )
    workflow = result.scalar_one_or_none()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    update_data = payload.model_dump(exclude_unset=True, exclude={"steps"})
    for field, value in update_data.items():
        setattr(workflow, field, value)
    
    # Update steps if provided
    if payload.steps is not None:
        # Delete existing steps
        await db.execute(
            update(WorkflowStep).where(WorkflowStep.workflow_id == workflow_id).values(status="deleted")
        )
        # Add new steps
        for step_data in payload.steps:
            step = WorkflowStep(
                workflow_id=workflow_id,
                step_order=step_data.step_order,
                agent_id=step_data.agent_id,
                input_mapping=step_data.input_mapping,
                custom_instructions=step_data.custom_instructions,
            )
            db.add(step)
    
    await db.flush()
    await db.refresh(workflow)
    
    steps_result = await db.execute(
        select(WorkflowStep).where(WorkflowStep.workflow_id == workflow_id)
        .order_by(WorkflowStep.step_order)
    )
    workflow.steps = steps_result.scalars().all()
    
    return workflow


# ── Delete workflow ──────────────────────────────────────────────────────────
@router.delete("/{workflow_id}", status_code=204)
async def delete_workflow(
    workflow_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(
        select(Workflow).where(Workflow.id == workflow_id, Workflow.user_id == current_user.id)
    )
    workflow = result.scalar_one_or_none()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    workflow.status = "archived"
    await db.flush()


# ── Run workflow ─────────────────────────────────────────────────────────────
@router.post("/{workflow_id}/run", response_model=WorkflowExecutionResponse, status_code=202)
async def run_workflow(
    workflow_id: int,
    payload: WorkflowRunCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    # Verify workflow exists
    result = await db.execute(
        select(Workflow).where(Workflow.id == workflow_id, Workflow.user_id == current_user.id)
    )
    workflow = result.scalar_one_or_none()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    # Create execution record
    execution = WorkflowExecution(
        workflow_id=workflow_id,
        user_id=current_user.id,
        status=TaskRunStatus.queued,
        input_data=payload.input_data or {},
    )
    db.add(execution)
    await db.flush()
    await db.refresh(execution)
    
    # Run in background
    background_tasks.add_task(
        _execute_workflow, execution.id, workflow_id, current_user.id, payload.input_data or {}
    )
    
    return execution


# ── List workflow executions ─────────────────────────────────────────────────
@router.get("/{workflow_id}/executions", response_model=List[WorkflowExecutionResponse])
async def list_executions(
    workflow_id: int,
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(
        select(WorkflowExecution)
        .where(WorkflowExecution.workflow_id == workflow_id, WorkflowExecution.user_id == current_user.id)
        .order_by(WorkflowExecution.created_at.desc())
        .limit(limit)
    )
    executions = result.scalars().all()
    return executions