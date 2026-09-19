"""
QueryMind - Durable Workflow Worker
PostgreSQL-backed job queue for autonomous multi-agent workflows.
Implements:
- Atomic job claim via SELECT FOR UPDATE SKIP LOCKED
- Real-time step and run status tracking
- Stale job detection and automatic recovery
- Bounded retry lifecycle
- ActionProposal idempotency on retry
"""

import os
import socket
import uuid
import logging
import asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, update, and_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from database.postgres import async_session
from models.orchestrator import Objective, Workflow, WorkflowStep, AgentRun, Synthesis
from models.conversation import Conversation, Message
from models.action_proposal import ActionProposal
from models.outcome import Outcome
from repositories.action_proposals import ActionProposalRepository
from orchestrator.graph import get_orchestrator

logger = logging.getLogger(__name__)


async def _record_workflow_failure_outcome(
    db: AsyncSession,
    workflow: Workflow,
    error_message: str,
    user_id: Optional[uuid.UUID] = None,
    space_id: Optional[uuid.UUID] = None,
):
    """
    Idempotently records an Outcome for a failed workflow execution.
    Ensures that retries, stale recovery, and cancellations never duplicate or fabricate outcomes.
    """
    if workflow.status == "cancelled":
        return

    stmt_check = select(Outcome).where(
        Outcome.workflow_id == workflow.id,
        Outcome.target_entity_type == "workflow",
    )
    res_check = await db.execute(stmt_check)
    if res_check.scalar_one_or_none():
        return

    target_space_id = space_id or workflow.space_id
    target_user_id = user_id
    if not target_user_id or not target_space_id:
        stmt_obj = select(Objective).where(Objective.id == workflow.objective_id)
        res_obj = await db.execute(stmt_obj)
        obj = res_obj.scalar_one_or_none()
        if obj:
            target_user_id = target_user_id or obj.user_id
            target_space_id = target_space_id or obj.space_id

    if not target_space_id or not target_user_id:
        logger.warning(f"Cannot record workflow failure outcome for {workflow.id}: missing space/user")
        return

    # Determine actual provenance: check if objective was spawned by an AI action proposal,
    # otherwise it was directly requested by the human user.
    stmt_prop = select(ActionProposal.id).where(ActionProposal.objective_id == workflow.objective_id)
    res_prop = await db.execute(stmt_prop)
    origin_initiated_by = "ai_proposal" if res_prop.scalar_one_or_none() is not None else "human"

    now = datetime.now(timezone.utc)
    outcome = Outcome(
        id=uuid.uuid4(),
        space_id=target_space_id,
        user_id=target_user_id,
        workflow_id=workflow.id,
        action_proposal_id=None,
        target_entity_type="workflow",
        target_entity_id=workflow.id,
        initiated_by=origin_initiated_by,
        status="failed",
        expected_outcome="Execute autonomous multi-agent workflow",
        actual_outcome=f"Workflow failed: {error_message[:500]}",
        state_delta=None,
        created_at=now,
        updated_at=now,
    )
    db.add(outcome)
    await db.flush()


class WorkflowWorker:
    """
    In-process recoverable worker for autonomous workflows backed by PostgreSQL.
    Survives application restarts by tracking job state in the database.
    """

    def __init__(
        self,
        poll_interval: float = 3.0,
        stale_timeout_seconds: float = 1800.0,  # 30 minutes
        max_retries: int = 3,
        worker_id: Optional[str] = None,
    ):
        self.poll_interval = poll_interval
        self.stale_timeout_seconds = stale_timeout_seconds
        self.max_retries = max_retries
        self.worker_id = worker_id or f"{socket.gethostname()}-{os.getpid()}-{uuid.uuid4().hex[:8]}"
        self._running = False
        self._task: Optional[asyncio.Task] = None

    async def claim_next_job(self) -> Optional[str]:
        """
        Atomically claims the next queued workflow using SELECT FOR UPDATE SKIP LOCKED.
        Returns the workflow_id string if claimed, otherwise None.
        """
        async with async_session() as db:
            stmt = (
                select(Workflow)
                .where(Workflow.status == "queued")
                .order_by(Workflow.created_at.asc())
                .with_for_update(skip_locked=True)
                .limit(1)
            )
            res = await db.execute(stmt)
            wf = res.scalar_one_or_none()
            if not wf:
                return None

            now = datetime.now(timezone.utc)
            wf.status = "running"
            wf.started_at = wf.started_at or now
            wf.locked_at = now
            wf.worker_id = self.worker_id
            await db.commit()
            return str(wf.id)

    async def execute_job(self, workflow_id: str) -> bool:
        """
        Executes an orchestrator workflow for the given workflow_id.
        Reconstructs state from Objective and Workflow, executes LangGraph,
        and records final states, action proposals, and step updates.
        """
        logger.info(f"Worker {self.worker_id} executing workflow {workflow_id}")
        wf_uuid = uuid.UUID(workflow_id)

        # 1. Fetch workflow and objective with lock check
        async with async_session() as db:
            stmt = (
                select(Workflow, Objective)
                .join(Objective, Objective.id == Workflow.objective_id)
                .options(selectinload(Workflow.steps))
                .where(Workflow.id == wf_uuid)
                .with_for_update()
            )
            res = await db.execute(stmt)
            row = res.first()
            if not row:
                logger.error(f"Workflow {workflow_id} or its Objective not found")
                return False

            wf, obj = row

            # Guard 1: Cancellation check
            if wf.status == "cancelled":
                logger.info(f"Workflow {workflow_id} is cancelled; aborting execution.")
                return False

            # Guard 2: Already completed check
            if wf.status == "completed":
                logger.info(f"Workflow {workflow_id} is already completed; skipping execution.")
                return True

            now = datetime.now(timezone.utc)

            # Guard 3: Concurrency check across workers
            if wf.status == "running" and wf.worker_id and wf.worker_id != self.worker_id:
                cutoff = now - timedelta(seconds=self.stale_timeout_seconds)
                if wf.locked_at and wf.locked_at > cutoff:
                    logger.warning(
                        f"Workflow {workflow_id} is already actively running under worker {wf.worker_id}; aborting duplicate execution."
                    )
                    return False

            # Ensure workflow is claimed and locked by this worker
            if wf.status == "queued" or wf.worker_id is None:
                wf.status = "running"
                wf.started_at = wf.started_at or now
                wf.locked_at = now
                wf.worker_id = self.worker_id

            user_id = str(obj.user_id)
            space_id = str(wf.space_id or obj.space_id)
            objective_id = str(obj.id)
            query = obj.raw_input

            # Update first pre-planned step to running if currently pending
            first_step = min(wf.steps, key=lambda s: s.step_order, default=None) if wf.steps else None
            if first_step and first_step.status == "pending":
                first_step.status = "running"

            await db.commit()

        # 2. Prepare LangGraph execution
        app = get_orchestrator()
        initial_state = {
            "user_id": user_id,
            "space_id": space_id,
            "objective_id": objective_id,
            "conversation_id": None,
            "raw_query": query,
            "chat_history": [],
            "workspace_context": {
                "space": None,
                "goals": [],
                "projects": [],
                "memories": [],
            },
            "planner_output": None,
            "research_tasks": [],
            "research_results": [],
            "critic_output": None,
            "workflow_iteration": 1,
            "total_research_tasks": 0,
            "workflow_status": "running",
            "final_synthesis": "",
            "citations": [],
        }

        try:
            async with async_session() as db:
                config = {"configurable": {"db": db}}
                final_state = await app.ainvoke(initial_state, config=config)

                # 3. Post-execution status update with concurrency check
                stmt_re = (
                    select(Workflow)
                    .options(selectinload(Workflow.steps))
                    .where(Workflow.id == wf_uuid)
                    .with_for_update()
                )
                res_re = await db.execute(stmt_re)
                wf_re = res_re.scalar_one_or_none()
                now = datetime.now(timezone.utc)

                if wf_re:
                    # If workflow was cancelled while execution was in flight, preserve cancellation!
                    if wf_re.status == "cancelled":
                        logger.info(
                            f"Workflow {workflow_id} was cancelled during execution; preserving cancelled state and skipping proposals"
                        )
                        await db.commit()
                        return False

                    wf_re.completed_at = now
                    wf_re.locked_at = None
                    wf_re.worker_id = self.worker_id

                    if final_state.get("workflow_status") == "failed":
                        wf_re.status = "failed"
                        wf_re.error = final_state.get("error") or "Workflow execution indicated failure"
                        await _record_workflow_failure_outcome(
                            db, wf_re, wf_re.error, user_id=uuid.UUID(user_id), space_id=uuid.UUID(space_id)
                        )
                    else:
                        wf_re.status = "completed"
                        wf_re.error = None

                    # Mark all pre-planned or remaining steps as completed on success
                    for s in wf_re.steps:
                        if wf_re.status == "completed":
                            if s.status in ("running", "pending"):
                                s.status = "completed"
                        elif wf_re.status == "failed":
                            if s.status == "running":
                                s.status = "failed"

                # 4. Persist Action Proposals produced by the workflow (idempotent)
                action_proposals_data = final_state.get("action_proposals") or []
                if action_proposals_data:
                    user_uuid = uuid.UUID(user_id)
                    space_uuid = uuid.UUID(space_id)
                    obj_uuid = uuid.UUID(objective_id)

                    # Find or create dedicated workflow Conversation
                    conv_id = uuid.uuid5(space_uuid, f"workflow_conv_{obj_uuid}")
                    stmt_conv = select(Conversation).where(Conversation.id == conv_id)
                    res_conv = await db.execute(stmt_conv)
                    conv = res_conv.scalar_one_or_none()
                    if not conv:
                        conv = Conversation(
                            id=conv_id,
                            user_id=user_uuid,
                            space_id=space_uuid,
                            title=f"Workflow: {query[:80]}",
                            created_at=datetime.now(timezone.utc),
                        )
                        db.add(conv)
                        await db.flush()

                    # Find or create assistant workflow Message
                    msg_id = uuid.uuid5(conv.id, f"workflow_msg_{wf_uuid}")
                    stmt_msg = select(Message).where(Message.id == msg_id)
                    res_msg = await db.execute(stmt_msg)
                    msg = res_msg.scalar_one_or_none()
                    if not msg:
                        msg = Message(
                            id=msg_id,
                            conversation_id=conv.id,
                            role="assistant",
                            content=final_state.get("final_synthesis") or "Workflow completed.",
                            citations=final_state.get("citations", []),
                            metadata_json={
                                "workflow_id": str(wf_uuid),
                                "objective_id": str(obj_uuid),
                                "action_proposals": action_proposals_data,
                            },
                            created_at=datetime.now(timezone.utc),
                        )
                        db.add(msg)
                        await db.flush()

                    for p_dict in action_proposals_data:
                        proposal_id = p_dict.get("proposal_id", f"prop-{uuid.uuid4().hex[:6]}")

                        # Idempotency check: prevent duplicate insertion on workflow retry
                        stmt_check = select(ActionProposal).where(
                            ActionProposal.message_id == msg.id,
                            ActionProposal.proposal_id == proposal_id,
                        )
                        res_check = await db.execute(stmt_check)
                        if res_check.scalar_one_or_none():
                            continue

                        await ActionProposalRepository.create(
                            db,
                            proposal_id=proposal_id,
                            user_id=user_uuid,
                            space_id=space_uuid,
                            conversation_id=conv.id,
                            message_id=msg.id,
                            objective_id=obj_uuid,
                            action_type=p_dict.get("action_type", "create_goal"),
                            target_id=p_dict.get("target_id"),
                            parameters=p_dict.get("parameters", {}),
                            reason=p_dict.get("reason", ""),
                            source_recommendation=p_dict.get("source_recommendation"),
                            confidence=p_dict.get("confidence", "medium"),
                            status="pending",
                            auto_commit=False,
                        )

                await db.commit()
                logger.info(f"Workflow {workflow_id} execution finished successfully")
                return True

        except Exception as e:
            logger.error(f"Error executing workflow {workflow_id}: {e}", exc_info=True)
            async with async_session() as err_db:
                stmt_err = (
                    select(Workflow)
                    .options(selectinload(Workflow.steps))
                    .where(Workflow.id == wf_uuid)
                    .with_for_update()
                )
                res_err = await err_db.execute(stmt_err)
                wf_err = res_err.scalar_one_or_none()
                if wf_err:
                    if wf_err.status != "cancelled":
                        wf_err.status = "failed"
                        wf_err.completed_at = datetime.now(timezone.utc)
                        wf_err.locked_at = None
                        wf_err.error = str(e)[:2000]
                        for s in wf_err.steps:
                            if s.status == "running":
                                s.status = "failed"
                        await _record_workflow_failure_outcome(err_db, wf_err, wf_err.error)
                    await err_db.commit()
            return False

    async def recover_stale_jobs(self) -> int:
        """
        Scans for workflows stuck in 'running' state with expired locks.
        Re-queues them if retry_count < max_retries, otherwise marks as failed.
        Returns the count of recovered/handled stale workflows.
        """
        cutoff = datetime.now(timezone.utc) - timedelta(seconds=self.stale_timeout_seconds)
        recovered_count = 0

        async with async_session() as db:
            stmt = (
                select(Workflow)
                .where(
                    Workflow.status == "running",
                    Workflow.locked_at < cutoff,
                )
                .with_for_update(skip_locked=True)
            )
            res = await db.execute(stmt)
            stale_workflows = res.scalars().all()

            for wf in stale_workflows:
                recovered_count += 1
                if wf.retry_count < self.max_retries:
                    wf.status = "queued"
                    wf.retry_count += 1
                    wf.locked_at = None
                    wf.worker_id = None
                    wf.error = f"Recovered from stale lock (attempt {wf.retry_count}/{self.max_retries})"
                    logger.warning(
                        f"Re-queued stale workflow {wf.id} (attempt {wf.retry_count}/{self.max_retries})"
                    )
                else:
                    wf.status = "failed"
                    wf.completed_at = datetime.now(timezone.utc)
                    wf.locked_at = None
                    wf.error = f"Max retries ({self.max_retries}) exceeded after stale worker lock"
                    await _record_workflow_failure_outcome(db, wf, wf.error)
                    logger.error(
                        f"Marked stale workflow {wf.id} as failed after exceeding max retries"
                    )

            if recovered_count > 0:
                await db.commit()

        return recovered_count

    async def claim_and_execute_one(self) -> bool:
        """
        Attempts to claim and execute a single queued workflow.
        Returns True if a job was processed, False if queue was empty.
        """
        workflow_id = await self.claim_next_job()
        if not workflow_id:
            return False
        await self.execute_job(workflow_id)
        return True

    async def run(self) -> None:
        """
        Main worker loop: recover stale jobs on startup and periodically poll for work.
        """
        logger.info(f"WorkflowWorker {self.worker_id} started (poll={self.poll_interval}s)")
        self._running = True

        # Initial stale recovery on worker startup
        try:
            await self.recover_stale_jobs()
        except Exception as e:
            logger.error(f"Error during initial stale job recovery: {e}")

        stale_check_counter = 0
        while self._running:
            try:
                # Periodic stale check every 10 poll cycles
                stale_check_counter += 1
                if stale_check_counter >= 10:
                    stale_check_counter = 0
                    await self.recover_stale_jobs()

                job_processed = await self.claim_and_execute_one()
                if not job_processed:
                    await asyncio.sleep(self.poll_interval)
            except asyncio.CancelledError:
                logger.info(f"WorkflowWorker {self.worker_id} stopping...")
                break
            except Exception as e:
                logger.error(f"WorkflowWorker loop error: {e}", exc_info=True)
                await asyncio.sleep(self.poll_interval)

        self._running = False
        logger.info(f"WorkflowWorker {self.worker_id} stopped")

    def start(self) -> asyncio.Task:
        """Starts the worker loop in the background."""
        if self._task is None or self._task.done():
            self._task = asyncio.create_task(self.run())
        return self._task

    async def stop(self) -> None:
        """Stops the worker gracefully."""
        self._running = False
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        self._task = None


# Global singleton instance for application lifespan
_default_worker: Optional[WorkflowWorker] = None


def get_workflow_worker() -> WorkflowWorker:
    """Returns the global WorkflowWorker instance."""
    global _default_worker
    if _default_worker is None:
        _default_worker = WorkflowWorker()
    return _default_worker
