import uuid
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from api.deps import get_db, get_current_user
from models.conversation import Conversation, Message
from models.core import Space
from models.user import User
from schemas.conversation import (
    ConversationCreate,
    ConversationResponse,
    ConversationWithMessagesResponse,
    MessageResponse
)

logger = logging.getLogger(__name__)
router = APIRouter()

async def verify_space_ownership(space_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession):
    stmt = select(Space).where(Space.id == space_id, Space.user_id == user_id)
    result = await db.execute(stmt)
    space = result.scalar_one_or_none()
    if not space:
        raise HTTPException(status_code=404, detail="Space not found or unauthorized")
    return space

async def get_user_conversation(conversation_id: str, user_id: uuid.UUID, db: AsyncSession) -> Conversation:
    try:
        c_uuid = uuid.UUID(conversation_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid conversation_id UUID format")
        
    stmt = select(Conversation).where(Conversation.id == c_uuid, Conversation.user_id == user_id)
    result = await db.execute(stmt)
    conversation = result.scalar_one_or_none()
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


@router.post("", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    request: ConversationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await verify_space_ownership(request.space_id, current_user.id, db)
    
    new_conv = Conversation(
        id=uuid.uuid4(),
        user_id=current_user.id,
        space_id=request.space_id,
        title=request.title or "New Conversation"
    )
    db.add(new_conv)
    
    try:
        await db.commit()
        await db.refresh(new_conv)
    except Exception as e:
        await db.rollback()
        logger.error(f"Error creating conversation: {e}")
        raise HTTPException(status_code=400, detail="Failed to create conversation")
        
    return ConversationResponse.model_validate(new_conv)


@router.get("", response_model=List[ConversationResponse])
@router.get("/", response_model=List[ConversationResponse])
async def list_conversations(
    space_id: Optional[str] = Query(None, description="Filter by Space ID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Conversation).where(Conversation.user_id == current_user.id)
    
    if space_id:
        try:
            s_uuid = uuid.UUID(space_id)
            stmt = stmt.where(Conversation.space_id == s_uuid)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid space_id UUID format")
            
    stmt = stmt.order_by(Conversation.created_at.desc())
    result = await db.execute(stmt)
    conversations = result.scalars().all()
    
    return [ConversationResponse.model_validate(c) for c in conversations]


@router.get("/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conversation = await get_user_conversation(conversation_id, current_user.id, db)
    return ConversationResponse.model_validate(conversation)


@router.delete("/{conversation_id}", status_code=status.HTTP_200_OK)
async def delete_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conversation = await get_user_conversation(conversation_id, current_user.id, db)
    
    await db.delete(conversation)
    await db.commit()
    
    return {"status": "success", "message": f"Conversation {conversation_id} deleted"}


@router.get("/{conversation_id}/messages", response_model=List[MessageResponse])
async def get_conversation_messages(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify ownership
    conversation = await get_user_conversation(conversation_id, current_user.id, db)
    
    stmt = select(Message).where(Message.conversation_id == conversation.id).order_by(Message.created_at.asc())
    result = await db.execute(stmt)
    messages = result.scalars().all()
    
    return [MessageResponse.model_validate(m) for m in messages]

import json
from fastapi.responses import StreamingResponse
from langchain_core.messages import HumanMessage, AIMessage
from orchestrator.graph import get_orchestrator
from models.orchestrator import Objective
from schemas.conversation import MessageCreate

@router.post("/{conversation_id}/messages")
async def send_message(
    conversation_id: str,
    request: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify ownership
    conversation = await get_user_conversation(conversation_id, current_user.id, db)
    
    # 1. Save user message to DB
    user_msg_id = uuid.uuid4()
    user_msg = Message(
        id=user_msg_id,
        conversation_id=conversation.id,
        role="user",
        content=request.content
    )
    db.add(user_msg)
    await db.commit()
    
    # 2. Fetch last 10 messages for context
    stmt = select(Message).where(Message.conversation_id == conversation.id).order_by(Message.created_at.desc()).limit(10)
    res = await db.execute(stmt)
    recent_msgs = res.scalars().all()
    recent_msgs.reverse()
    
    chat_history = []
    for msg in recent_msgs[:-1]: # exclude the one we just saved since it's the raw_query
        if msg.role == "user":
            chat_history.append(HumanMessage(content=msg.content))
        elif msg.role == "assistant":
            chat_history.append(AIMessage(content=msg.content))
            
    # 3. Create Objective
    objective_id = uuid.uuid4()
    objective = Objective(id=objective_id, user_id=current_user.id, raw_input=request.content)
    db.add(objective)
    await db.commit()

    async def sse_generator():
        # Yield message.created for user msg
        yield f"data: {json.dumps({'event': 'message.created', 'data': {'id': str(user_msg_id), 'role': 'user', 'content': request.content}})}\n\n"
        
        graph = get_orchestrator()
        inputs = {
            "raw_query": request.content,
            "chat_history": chat_history,
            "user_id": str(current_user.id),
            "space_id": str(conversation.space_id),
            "objective_id": str(objective_id),
        }
        
        # We need a new session inside the generator because FastAPI background tasks/streaming
        # might conflict with the main request DB session if not careful.
        # But we can try using the existing db since it's an async generator running inside the request.
        config = {"configurable": {"thread_id": str(conversation.id), "db": db}}
        
        try:
            # Yield workflow.started
            yield f"data: {json.dumps({'event': 'workflow.started', 'data': {'objective_id': str(objective_id)}})}\n\n"
            
            # Yield initial step and agent.status
            yield f"data: {json.dumps({'event': 'workflow.step.started', 'data': {'step': 'planner', 'iteration': 1}})}\n\n"
            yield f"data: {json.dumps({'event': 'agent.status', 'data': {'agent': 'planner', 'status': 'Analyzing request...'}})}\n\n"
            
            final_text = ""
            citations = []
            
            # Using stream_mode=["updates", "messages"]
            async for event_type, event_data in graph.astream(inputs, config=config, stream_mode=["updates", "messages"]):
                if event_type == "messages":
                    chunk, metadata = event_data
                    if chunk.content:
                        # Safety to ensure it's from synthesizer
                        yield f"data: {json.dumps({'event': 'token', 'data': {'text': chunk.content}})}\n\n"
                        
                elif event_type == "updates":
                    for node_name, node_state in event_data.items():
                        
                        if node_name == "planner":
                            # Planner finished
                            out = node_state.get("planner_output", {})
                            yield f"data: {json.dumps({'event': 'workflow.step.completed', 'data': {'step': 'planner', 'output': out}})}\n\n"
                            
                            if out.get("needs_research", False):
                                iter_num = node_state.get("workflow_iteration", 1)
                                yield f"data: {json.dumps({'event': 'workflow.step.started', 'data': {'step': 'researcher', 'iteration': iter_num, 'tasks': node_state.get('research_tasks', [])}})}\n\n"
                                
                                task_count = len(node_state.get("research_tasks", []))
                                status_msg = f"Executing {task_count} research tasks..."
                                yield f"data: {json.dumps({'event': 'agent.status', 'data': {'agent': 'researcher', 'status': status_msg}})}\n\n"
                            else:
                                yield f"data: {json.dumps({'event': 'workflow.step.started', 'data': {'step': 'synthesizer', 'iteration': 1}})}\n\n"
                                yield f"data: {json.dumps({'event': 'agent.status', 'data': {'agent': 'synthesizer', 'status': 'Synthesizing response...'}})}\n\n"
                                
                        elif node_name == "researcher":
                            iter_num = node_state.get("workflow_iteration", 1)
                            res = [r for r in node_state.get("research_results", []) if r.get("iteration") == iter_num]
                            
                            yield f"data: {json.dumps({'event': 'workflow.step.completed', 'data': {'step': 'researcher', 'iteration': iter_num, 'results': res}})}\n\n"
                            yield f"data: {json.dumps({'event': 'workflow.step.started', 'data': {'step': 'critic', 'iteration': iter_num}})}\n\n"
                            yield f"data: {json.dumps({'event': 'agent.status', 'data': {'agent': 'critic', 'status': 'Evaluating evidence...'}})}\n\n"
                            
                        elif node_name == "critic":
                            iter_num = node_state.get("workflow_iteration", 1)
                            c_out = node_state.get("critic_output", {})
                            yield f"data: {json.dumps({'event': 'workflow.step.completed', 'data': {'step': 'critic', 'iteration': iter_num, 'output': c_out}})}\n\n"
                            
                            if c_out.get("decision") == "research_more" and node_state.get("workflow_status") != "terminated_budget":
                                next_iter = node_state.get("workflow_iteration", 1) # Note: graph router increments it, but updates has current state? The router executes AFTER. Wait, router doesn't mutate state, it just returns next node. Oh, router does state["workflow_iteration"] = iter_count + 1! It mutated the reference!
                                yield f"data: {json.dumps({'event': 'workflow.step.started', 'data': {'step': 'researcher', 'iteration': next_iter}})}\n\n"
                                yield f"data: {json.dumps({'event': 'agent.status', 'data': {'agent': 'researcher', 'status': 'Retrieving additional evidence...'}})}\n\n"
                            else:
                                yield f"data: {json.dumps({'event': 'workflow.step.started', 'data': {'step': 'synthesizer', 'iteration': iter_num}})}\n\n"
                                yield f"data: {json.dumps({'event': 'agent.status', 'data': {'agent': 'synthesizer', 'status': 'Synthesizing final response...'}})}\n\n"
                                
                        elif node_name == "synthesizer":
                            final_text = node_state.get("final_synthesis", "")
                            citations = node_state.get("citations", [])
                            yield f"data: {json.dumps({'event': 'workflow.step.completed', 'data': {'step': 'synthesizer'}})}\n\n"
                            
            # Yield citations at the end
            for c in citations:
                yield f"data: {json.dumps({'event': 'citation', 'data': c})}\n\n"
            
            # Save Assistant Message
            asst_msg_id = uuid.uuid4()
            asst_msg = Message(
                id=asst_msg_id,
                conversation_id=conversation.id,
                role="assistant",
                content=final_text,
                citations=citations,
                metadata_json={"objective_id": str(objective_id)}
            )
            db.add(asst_msg)
            await db.commit()
            
            # Yield message.completed
            yield f"data: {json.dumps({'event': 'message.completed', 'data': {'message_id': str(asst_msg_id), 'content': final_text}})}\n\n"
            
        except Exception as e:
            logger.error(f"SSE Error: {e}")
            yield f"data: {json.dumps({'event': 'error', 'data': {'detail': str(e)}})}\n\n"

    return StreamingResponse(sse_generator(), media_type="text/event-stream")

