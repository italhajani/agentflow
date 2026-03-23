from fastapi import APIRouter

from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.agents import router as agents_router
from app.api.v1.endpoints.runs import router as runs_router
from app.api.v1.endpoints.templates import router as templates_router
from app.api.v1.endpoints.dashboard import router as dashboard_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(agents_router)
api_router.include_router(runs_router)
api_router.include_router(templates_router)
api_router.include_router(dashboard_router)
