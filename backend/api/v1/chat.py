"""
QueryMind - Chat Router
Authenticated orchestration endpoint. Identity is strictly derived from the validated JWT token.
"""

import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from langchain_core.messages import HumanMessage

from api.deps import get_db, get_current_user
from orchestrator.graph import get_orchestrator
from models.orchestrator import Objective
from models.user import User

logger = logging.getLogger(__name__)
router = APIRouter()


class ChatRequest(BaseModel):
    query: str
    space_id: str | None = None


class ChatResponse(BaseModel):
    objective_id: str
    response: str
    citations: list[str]


@router.post("/", response_model=ChatResponse)
async def chat_with_orchestrator(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Authenticated endpoint to execute a query through the LangGraph Orchestrator.
    User identity is derived strictly from the authenticated JWT session.
    """
    try:
        # Initialize the LangGraph Orchestrator
        graph = get_orchestrator()

        # Create an objective for telemetry linked to the authenticated user
        objective_id = uuid.uuid4()
        objective = Objective(
            id=objective_id,
            user_id=current_user.id,
            raw_input=request.query,
        )
        db.add(objective)
        await db.commit()

        user_id_str = str(current_user.id)
        if request.space_id:
            space_id_str = request.space_id
        else:
            from models.core import Space
            stmt_default = select(Space).where(Space.user_id == current_user.id, Space.is_default == True)
            res_default = await db.execute(stmt_default)
            default_sp = res_default.scalar_one_or_none()
            space_id_str = str(default_sp.id) if default_sp else None

        # Prepare graph inputs
        inputs = {
            "messages": [HumanMessage(content=request.query)],
            "raw_query": request.query,
            "user_id": user_id_str,
            "space_id": space_id_str,
            "objective_id": str(objective_id),
        }

        # Provide the db session to the LangGraph config
        config = {
            "configurable": {
                "thread_id": f"chat_{user_id_str}",
                "db": db,
            }
        }

        # Execute the graph
        final_synthesis = "No response generated."
        citations = []

        # Stream events and get the last synthesizer output
        async for event in graph.astream(inputs, config=config):
            for node_name, node_state in event.items():
                if node_name == "synthesizer" and "final_synthesis" in node_state:
                    final_synthesis = node_state["final_synthesis"]
                    citations = node_state.get("citations", [])

        return ChatResponse(
            objective_id=str(objective_id),
            response=final_synthesis,
            citations=citations,
        )

    except Exception as e:
        logger.error(f"Chat orchestration error: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
