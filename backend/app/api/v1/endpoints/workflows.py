from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query, Response
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
from app.services.workflow_planner import WorkflowPlanner
from app.services.agent_creator import AgentCreator

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


@router.post("/generate-from-description", status_code=202)
async def generate_workflow_from_description(
    payload: dict,
    background_tasks: BackgroundTasks,
    response: Response,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    AI-powered workflow generator - runs in background to avoid timeout
    """
    description = payload.get("description", "")
    if not description:
        raise HTTPException(status_code=400, detail="Description required")
    
    # Set CORS headers for preflight
    response.headers["Access-Control-Allow-Origin"] = "https://agentflow-henna.vercel.app"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    
    # Create a pending workflow status
    workflow = Workflow(
        user_id=current_user.id,
        name="Generating...",
        description=f"AI is generating workflow for: {description[:100]}",
        schedule_type="manual",
        status="active",
    )
    db.add(workflow)
    await db.flush()
    await db.refresh(workflow)
    
    # Run generation in background
    background_tasks.add_task(
        _generate_workflow_background,
        workflow.id,
        description,
        current_user.id,
    )
    
    return {
        "workflow_id": workflow.id,
        "status": "generating",
        "message": "AI is planning your workflow. Check back in a minute.",
    }


async def _generate_workflow_background(workflow_id: int, description: str, user_id: int):
    """Background task to generate workflow with debug logs"""
    from app.core.database import AsyncSessionLocal
    
    async with AsyncSessionLocal() as db:
        try:
            print(f"🔧 [DEBUG] Starting workflow generation for ID {workflow_id}")
            
            # Get user's existing agents
            agents_result = await db.execute(
                select(Agent).where(Agent.owner_id == user_id, Agent.status == "active")
            )
            existing_agents = [
                {"id": a.id, "name": a.name, "role": a.role}
                for a in agents_result.scalars().all()
            ]
            print(f"📋 [DEBUG] Found {len(existing_agents)} existing agents")
            
            # Step 1: AI plans the workflow
            print("🤖 [DEBUG] Calling AI Planner (this takes 15-30 seconds)...")
            planner = WorkflowPlanner()
            plan = planner.plan_workflow(description, existing_agents)
            print(f"✅ [DEBUG] AI Planner returned plan with {len(plan.get('steps', []))} steps")
            
            # Step 2: Create any missing agents
            print("🏗️ [DEBUG] Creating missing agents...")
            agent_creator = AgentCreator(db, user_id)
            final_steps = []
            
            for step in plan.get("steps", []):
                if step.get("type") == "create_agent":
                    print(f"  ➕ [DEBUG] Creating agent: {step.get('agent_to_create', {}).get('name', 'Unknown')}")
                    agent = await agent_creator.create_agent_from_spec(step.get("agent_to_create", {}))
                    step["agent_id"] = agent.id
                    step["type"] = "use_agent"
                    del step["agent_to_create"]
                    print(f"  ✅ [DEBUG] Agent created with ID {agent.id}")
                final_steps.append(step)
            
            # Step 3: Update workflow
            print("💾 [DEBUG] Saving workflow to database...")
            result = await db.execute(
                select(Workflow).where(Workflow.id == workflow_id)
            )
            workflow = result.scalar_one()
            
            workflow.name = plan.get("name", "AI-Generated Workflow")
            workflow.description = plan.get("description", description[:500])
            
            await db.flush()
            
            # Add workflow steps
            for step_data in final_steps:
                workflow_step = WorkflowStep(
                    workflow_id=workflow_id,
                    step_order=step_data["step_order"],
                    agent_id=step_data.get("agent_id"),
                    input_mapping={"task": "{{previous.result}}" if step_data.get("depends_on") else None},
                    custom_instructions=step_data.get("description", ""),
                )
                db.add(workflow_step)
            
            await db.commit()
            print(f"🎉 [DEBUG] Workflow {workflow_id} generated successfully!")
            
        except Exception as e:
            print(f"❌ [DEBUG] ERROR: {str(e)}")
            import traceback
            traceback.print_exc()
            
            # Update workflow with error
            result = await db.execute(
                select(Workflow).where(Workflow.id == workflow_id)
            )
            workflow = result.scalar_one()
            workflow.name = "Failed to Generate"
            workflow.description = f"Error: {str(e)[:200]}"
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
    # Get total count
    total = (await db.execute(
        select(func.count()).select_from(Workflow).where(Workflow.user_id == current_user.id)
    )).scalar()
    
    # Get workflows with pagination
    result = await db.execute(
        select(Workflow)
        .where(Workflow.user_id == current_user.id)
        .order_by(Workflow.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    workflows = result.scalars().all()
    
    # For each workflow, load steps separately to avoid async issues
    workflow_list = []
    for workflow in workflows:
        # Get steps for this workflow
        steps_result = await db.execute(
            select(WorkflowStep)
            .where(WorkflowStep.workflow_id == workflow.id)
            .order_by(WorkflowStep.step_order)
        )
        steps = steps_result.scalars().all()
        
        # Also load agent names for steps
        for step in steps:
            agent_result = await db.execute(
                select(Agent).where(Agent.id == step.agent_id)
            )
            agent = agent_result.scalar_one_or_none()
            step.agent_name = agent.name if agent else None
        
        # Convert to response format
        workflow_list.append({
            "id": workflow.id,
            "name": workflow.name,
            "description": workflow.description,
            "schedule_type": workflow.schedule_type,
            "schedule_value": workflow.schedule_value,
            "status": workflow.status,
            "total_runs": workflow.total_runs,
            "last_run_at": workflow.last_run_at,
            "created_at": workflow.created_at,
            "steps": steps
        })
    
    return WorkflowListResponse(
        workflows=workflow_list,
        total=total,
        page=page,
        page_size=page_size
    )


# ── Get single workflow ──────────────────────────────────────────────────────
@router.get("/{workflow_id}", response_model=WorkflowResponse)
async def get_workflow(
    workflow_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    # Get workflow
    result = await db.execute(
        select(Workflow).where(Workflow.id == workflow_id, Workflow.user_id == current_user.id)
    )
    workflow = result.scalar_one_or_none()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    # Get steps separately (eager load instead of lazy)
    steps_result = await db.execute(
        select(WorkflowStep)
        .where(WorkflowStep.workflow_id == workflow_id)
        .order_by(WorkflowStep.step_order)
    )
    steps = steps_result.scalars().all()
    
    # Also load agent names for each step
    for step in steps:
        agent_result = await db.execute(
            select(Agent).where(Agent.id == step.agent_id)
        )
        agent = agent_result.scalar_one_or_none()
        if agent:
            step.agent_name = agent.name
    
    return WorkflowResponse(
        id=workflow.id,
        name=workflow.name,
        description=workflow.description,
        schedule_type=workflow.schedule_type,
        schedule_value=workflow.schedule_value,
        status=workflow.status,
        total_runs=workflow.total_runs,
        last_run_at=workflow.last_run_at,
        created_at=workflow.created_at,
        steps=steps
    )


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
            delete(WorkflowStep).where(WorkflowStep.workflow_id == workflow_id)
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