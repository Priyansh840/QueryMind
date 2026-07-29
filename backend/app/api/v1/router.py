"""
QueryMind - API v1 Router
Aggregates all route modules into a single router.
"""

from fastapi import APIRouter

api_router = APIRouter()


@api_router.get("/health", tags=["Health"])
async def api_health():
    return {"status": "API v1 is running"}


# Future route includes:
# from app.api.v1 import auth, users, documents, chat, search, memories, timeline, reflections, tags, dashboard
# api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
# api_router.include_router(users.router, prefix="/users", tags=["Users"])
# api_router.include_router(documents.router, prefix="/documents", tags=["Documents"])
# api_router.include_router(chat.router, prefix="/chat", tags=["Chat"])
# api_router.include_router(search.router, prefix="/search", tags=["Search"])
# api_router.include_router(memories.router, prefix="/memories", tags=["Memories"])
# api_router.include_router(timeline.router, prefix="/timeline", tags=["Timeline"])
# api_router.include_router(reflections.router, prefix="/reflections", tags=["Reflections"])
# api_router.include_router(tags.router, prefix="/tags", tags=["Tags"])
# api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
