"""
QueryMind - API v1 Router
Aggregates all route modules into a single router.
"""

from fastapi import APIRouter

from api.v1 import auth, documents, spaces, knowledge

api_router = APIRouter()

# Auth endpoint
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])

# Spaces endpoint
api_router.include_router(spaces.router, prefix="/spaces", tags=["Spaces"])

# Documents endpoint
api_router.include_router(documents.router, prefix="/documents", tags=["Documents"])

# Knowledge endpoint
api_router.include_router(knowledge.router, prefix="/knowledge", tags=["Knowledge"])


@api_router.get("/health", tags=["Health"])
async def api_health():
    return {"status": "API v1 is running"}


# Objectives/Trace endpoint
from api.v1 import objectives
api_router.include_router(objectives.router, prefix="/objectives", tags=["Objectives"])

from api.v1 import projects, goals, memories, conversations, actions, search, workflows, space_members, outcomes, reflections

api_router.include_router(space_members.router, tags=["Space Members"])
api_router.include_router(projects.router, prefix="/projects", tags=["Projects"])
api_router.include_router(goals.router, prefix="/goals", tags=["Goals"])
api_router.include_router(memories.router, prefix="/memories", tags=["Memories"])
api_router.include_router(conversations.router, prefix="/conversations", tags=["Conversations"])
api_router.include_router(actions.router, prefix="/actions", tags=["Actions"])
api_router.include_router(outcomes.router, prefix="/outcomes", tags=["Outcomes"])
api_router.include_router(reflections.router, prefix="/reflections", tags=["Reflections"])
api_router.include_router(search.router, prefix="/search", tags=["Search"])
api_router.include_router(workflows.router, prefix="/workflows", tags=["Workflows"])

