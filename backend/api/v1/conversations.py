import uuid
import logging
import asyncio
from typing import List, Optional
import json
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from langchain_core.messages import HumanMessage, AIMessage
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from api.deps import get_db, get_current_user
from models.conversation import Conversation, Message
from models.core import Space
from models.orchestrator import Objective
from models.user import User
from schemas.conversation import (
    ConversationCreate,
    ConversationResponse,
    ConversationWithMessagesResponse,
    MessageCreate,
    MessageResponse
)
from orchestrator.schemas import DecisionAnalysis, ActionProposal
from orchestrator.graph import get_orchestrator
from repositories.action_proposals import ActionProposalRepository

logger = logging.getLogger(__name__)
router = APIRouter()

async def get_space_conversation(conversation_id: str, current_user: User, db: AsyncSession, min_role: str = "viewer") -> Conversation:
    try:
        c_uuid = uuid.UUID(conversation_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid conversation_id UUID format")

    stmt = select(Conversation).where(Conversation.id == c_uuid)
    result = await db.execute(stmt)
    conversation = result.scalar_one_or_none()

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    from api.deps import get_space_membership
    await get_space_membership(str(conversation.space_id), current_user, db, min_role=min_role)
    return conversation


@router.post("", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    request: ConversationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from api.deps import get_space_membership
    space, membership = await get_space_membership(str(request.space_id), current_user, db, min_role="member")

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
    if space_id:
        from api.deps import get_space_membership
        space, membership = await get_space_membership(space_id, current_user, db, min_role="viewer")
        stmt = select(Conversation).where(Conversation.space_id == space.id).order_by(Conversation.created_at.desc())
    else:
        # If no space filter, return user conversations
        stmt = select(Conversation).where(Conversation.user_id == current_user.id).order_by(Conversation.created_at.desc())

    result = await db.execute(stmt)
    conversations = result.scalars().all()

    return [ConversationResponse.model_validate(c) for c in conversations]


@router.get("/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conversation = await get_space_conversation(conversation_id, current_user, db, min_role="viewer")
    return ConversationResponse.model_validate(conversation)


@router.delete("/{conversation_id}", status_code=status.HTTP_200_OK)
async def delete_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conversation = await get_space_conversation(conversation_id, current_user, db, min_role="admin")

    await db.delete(conversation)
    await db.commit()

    return {"status": "success", "message": f"Conversation {conversation_id} deleted"}


@router.get("/{conversation_id}/messages", response_model=List[MessageResponse])
async def get_conversation_messages(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify viewer access
    conversation = await get_space_conversation(conversation_id, current_user, db, min_role="viewer")

    stmt = select(Message).where(Message.conversation_id == conversation.id).order_by(Message.created_at.asc())
    result = await db.execute(stmt)
    messages = result.scalars().all()

    return [MessageResponse.model_validate(m) for m in messages]


@router.post("/{conversation_id}/messages")
async def send_message(
    conversation_id: str,
    request: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify member access to send messages
    conversation = await get_space_conversation(conversation_id, current_user, db, min_role="member")
    
    # 1. Save user message to DB
    user_msg_id = uuid.uuid4()
    user_msg = Message(
        id=user_msg_id,
        conversation_id=conversation.id,
        role="user",
        content=request.content,
        metadata_json=request.metadata_json,
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
            
    # 3. Create Objective inheriting conversation's space_id
    objective_id = uuid.uuid4()
    objective = Objective(
        id=objective_id,
        user_id=current_user.id,
        space_id=conversation.space_id,
        raw_input=request.content,
    )
    db.add(objective)
    await db.commit()

    personalization = (request.metadata_json or {}).get("personalization") if request.metadata_json else None

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
            "personalization": personalization,
        }
        
        # We need a new session inside the generator because FastAPI background tasks/streaming
        # might conflict with the main request DB session if not careful.
        # But we can try using the existing db since it's an async generator running inside the request.
        config = {"configurable": {"thread_id": str(conversation.id), "db": db}}
        
        try:
            # Yield workflow.started
            yield f"data: {json.dumps({'event': 'workflow.started', 'data': {'objective_id': str(objective_id)}})}\n\n"
            
            # Start context gatherer
            yield f"data: {json.dumps({'event': 'workflow.step.started', 'data': {'step': 'context_gatherer', 'iteration': 1}})}\n\n"
            yield f"data: {json.dumps({'event': 'agent.status', 'data': {'agent': 'context_gatherer', 'status': 'Gathering workspace context...'}})}\n\n"
            
            final_text = ""
            citations = []
            action_proposals_collected = []
            tokens_streamed = 0
            
            # Using stream_mode=["updates", "messages"]
            async for event_type, event_data in graph.astream(inputs, config=config, stream_mode=["updates", "messages"]):
                if event_type == "messages":
                    chunk, metadata = event_data
                    # Only stream tokens from the synthesizer node to avoid leaking intermediate agent JSON
                    if metadata.get("langgraph_node") == "synthesizer" and chunk.content:
                        if isinstance(chunk.content, str):
                            token_text = chunk.content
                        elif isinstance(chunk.content, list):
                            token_text = "".join([part.get("text", "") if isinstance(part, dict) else getattr(part, "text", str(part)) for part in chunk.content])
                        else:
                            token_text = str(chunk.content)
                        tokens_streamed += len(token_text)
                        yield f"data: {json.dumps({'event': 'token', 'data': {'text': token_text}})}\n\n"
                        
                elif event_type == "updates":
                    for node_name, node_state in event_data.items():
                        
                        if node_name == "context_gatherer":
                            summary = node_state.get("workspace_summary", {})
                            yield f"data: {json.dumps({'event': 'workflow.step.completed', 'data': {'step': 'context_gatherer', 'output': summary}})}\n\n"
                            
                            # Now start planner
                            yield f"data: {json.dumps({'event': 'workflow.step.started', 'data': {'step': 'planner', 'iteration': 1}})}\n\n"
                            yield f"data: {json.dumps({'event': 'agent.status', 'data': {'agent': 'planner', 'status': 'Analyzing request...'}})}\n\n"

                        elif node_name == "planner":
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
                                yield f"data: {json.dumps({'event': 'workflow.step.started', 'data': {'step': 'decision_analyzer'}})}\n\n"
                                yield f"data: {json.dumps({'event': 'agent.status', 'data': {'agent': 'decision_analyzer', 'status': 'Analyzing context...'}})}\n\n"
                                
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
                                yield f"data: {json.dumps({'event': 'workflow.step.started', 'data': {'step': 'decision_analyzer'}})}\n\n"
                                yield f"data: {json.dumps({'event': 'agent.status', 'data': {'agent': 'decision_analyzer', 'status': 'Analyzing evidence...'}})}\n\n"
                                
                        elif node_name == "decision_analyzer":
                            d_out = node_state.get("decision_output", {})
                            
                            # Safely validate and sanitize the output for the frontend
                            try:
                                sanitized_da = DecisionAnalysis.model_validate(d_out)
                                # Explicitly dump to get only the defined fields, dropping extra data
                                sanitized_payload = sanitized_da.model_dump()
                            except Exception as e:
                                logger.error(f"Failed to sanitize decision output for SSE: {e}")
                                sanitized_payload = {
                                    "blockers": [],
                                    "recommendations": [],
                                    "uncertainties": ["Decision analysis result was malformed and safely dropped."]
                                }
                                
                            yield f"data: {json.dumps({'event': 'workflow.step.completed', 'data': {'step': 'decision_analyzer', 'output': sanitized_payload}})}\n\n"
                            
                        elif node_name == "action_proposer":
                            raw_proposals = node_state.get("action_proposals", [])
                            # Safely ensure all proposals match ActionProposal schema
                            safe_proposals = []
                            for p in raw_proposals:
                                try:
                                    validated_p = ActionProposal.model_validate(p)
                                    safe_proposals.append(validated_p.model_dump())
                                except Exception as p_err:
                                    logger.warning(f"Discarding invalid proposal for SSE/persistence: {p_err}")
                            action_proposals_collected = safe_proposals
                            yield f"data: {json.dumps({'event': 'workflow.step.completed', 'data': {'step': 'action_proposer', 'output': {'proposals_count': len(safe_proposals), 'action_types': [p['action_type'] for p in safe_proposals]}}})}\n\n"
                            yield f"data: {json.dumps({'event': 'workflow.step.started', 'data': {'step': 'synthesizer'}})}\n\n"
                            yield f"data: {json.dumps({'event': 'agent.status', 'data': {'agent': 'synthesizer', 'status': 'Synthesizing final response...'}})}\n\n"
                                
                        elif node_name == "synthesizer":
                            final_text = node_state.get("final_synthesis", "")
                            citations = node_state.get("citations", [])
                            if final_text and tokens_streamed == 0:
                                yield f"data: {json.dumps({'event': 'token', 'data': {'text': final_text}})}\n\n"
                            yield f"data: {json.dumps({'event': 'workflow.step.completed', 'data': {'step': 'synthesizer'}})}\n\n"
                            
            # Yield citations at the end
            for c in citations:
                yield f"data: {json.dumps({'event': 'citation', 'data': c})}\n\n"
            
            # Save Assistant Message with historical JSONB snapshot
            asst_msg_id = uuid.uuid4()
            metadata_dict = {
                "objective_id": str(objective_id),
                "action_proposals": action_proposals_collected
            }
            asst_msg = Message(
                id=asst_msg_id,
                conversation_id=conversation.id,
                role="assistant",
                content=final_text,
                citations=citations,
                metadata_json=metadata_dict
            )
            db.add(asst_msg)

            # Persist authoritative ActionProposal database rows (Step 9 Phase 3)
            for p_dict in action_proposals_collected:
                await ActionProposalRepository.create(
                    db,
                    proposal_id=p_dict.get("proposal_id", f"prop-{uuid.uuid4().hex[:6]}"),
                    user_id=current_user.id,
                    space_id=conversation.space_id,
                    conversation_id=conversation.id,
                    message_id=asst_msg_id,
                    objective_id=objective_id,
                    action_type=p_dict.get("action_type", "create_goal"),
                    target_id=p_dict.get("target_id"),
                    parameters=p_dict.get("parameters", {}),
                    reason=p_dict.get("reason", ""),
                    source_recommendation=p_dict.get("source_recommendation"),
                    confidence=p_dict.get("confidence", "medium"),
                    status="pending",
                    auto_commit=False
                )

            # Atomically commit Message + ActionProposal rows
            await db.commit()
            
            # Yield message.completed
            yield f"data: {json.dumps({'event': 'message.completed', 'data': {'message_id': str(asst_msg_id), 'content': final_text}})}\n\n"
            
        except asyncio.CancelledError:
            logger.info(f"SSE client disconnected for conversation {conversation.id}; rolling back pending session state")
            await db.rollback()
            raise
        except Exception as e:
            logger.error(f"SSE Error: {e}")
            await db.rollback()
            yield f"data: {json.dumps({'event': 'error', 'data': {'detail': str(e)}})}\n\n"

    return StreamingResponse(sse_generator(), media_type="text/event-stream")

