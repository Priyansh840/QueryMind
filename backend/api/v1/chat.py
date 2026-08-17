import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from langchain_core.messages import HumanMessage

from database.postgres import get_db
from orchestrator.graph import get_orchestrator
from models.orchestrator import Objective
from models.user import User

router = APIRouter()

class ChatRequest(BaseModel):
    query: str
    space_id: str
    user_id: str  # For local dummy testing, frontend will send user_id directly

class ChatResponse(BaseModel):
    objective_id: str
    response: str
    citations: list[str]

@router.post("/", response_model=ChatResponse)
async def chat_with_orchestrator(request: ChatRequest, db: AsyncSession = Depends(get_db)):
    """
    Dummy/Local endpoint to test the orchestrator from the frontend.
    It takes a query, user_id, and space_id, and runs it through the LangGraph Orchestrator.
    """
    try:
        # Check if user exists, if not, create a dummy one just so the DB doesn't crash
        # This is strictly for dummy testing purposes
        user = await db.get(User, uuid.UUID(request.user_id))
        if not user:
            user = User(id=uuid.UUID(request.user_id), email=f"dummy_{request.user_id[:6]}@test.com")
            db.add(user)
            await db.flush()

        # Initialize the graph
        graph = get_orchestrator()
        
        # Create an objective for telemetry
        objective_id = uuid.uuid4()
        objective = Objective(id=objective_id, user_id=user.id, raw_input=request.query)
        db.add(objective)
        await db.commit()
        
        # Prepare graph inputs
        inputs = {
            "messages": [HumanMessage(content=request.query)],
            "raw_query": request.query,
            "user_id": request.user_id,
            "space_id": request.space_id,
            "objective_id": str(objective_id)
        }
        
        # Provide the db session to the LangGraph config
        config = {
            "configurable": {
                "thread_id": f"chat_{request.user_id}",
                "db": db
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
                    
        return ChatResponse(objective_id=str(objective_id), response=final_synthesis, citations=citations)
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
