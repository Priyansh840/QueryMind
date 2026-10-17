"""
QueryMind - Skills API Router
Handles user competency tracking, XP progression, radar telemetry, and task sync.
"""

import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func

from database.postgres import get_db, utc_now
from models.user import User
from models.core import Goal
from models.space_member import SpaceMember
from models.skill import UserSkill
from api.v1.auth import get_current_user
from services.skill_extractor import extract_skills_from_task

router = APIRouter()


class SkillEvidenceItem(BaseModel):
    goal_id: str
    task_id: str
    task_title: str
    deliverable: Optional[str] = None
    completed_at: str


class UserSkillResponse(BaseModel):
    id: str
    skill_name: str
    category: str
    level: str
    xp: int
    verified_tasks_count: int
    evidence: List[Dict[str, Any]]
    last_practiced_at: datetime
    created_at: datetime


class RadarCategoryScore(BaseModel):
    category: str
    score: int  # 0 to 100
    skill_count: int
    total_xp: int


class SkillStatsResponse(BaseModel):
    total_skills: int
    total_xp: int
    mastery_count: int
    proficient_count: int
    competent_count: int
    novice_count: int
    current_rank: str


class GetSkillsResponse(BaseModel):
    skills: List[UserSkillResponse]
    stats: SkillStatsResponse
    radar_data: List[RadarCategoryScore]


class SyncTaskSkillRequest(BaseModel):
    goal_id: str
    task_id: str
    task_title: str
    completed: bool
    deliverable: Optional[str] = None
    tools: Optional[List[str]] = Field(default_factory=list)
    sub_goal: Optional[str] = None
    category: Optional[str] = "engineering"


class SyncTaskSkillResponse(BaseModel):
    action: str  # "awarded" or "revoked"
    affected_skills: List[Dict[str, Any]]
    total_xp_delta: int


def derive_rank(total_xp: int) -> str:
    """Calculates user-wide engineering rank from cumulative XP."""
    if total_xp >= 2500:
        return "Grandmaster Architect"
    elif total_xp >= 1500:
        return "Principal Engineer"
    elif total_xp >= 800:
        return "Senior Specialist"
    elif total_xp >= 350:
        return "Practitioner"
    elif total_xp >= 100:
        return "Apprentice"
    return "Initiate"


@router.get("", response_model=GetSkillsResponse)
async def get_user_skills(
    space_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieves all tracked competencies, XP stats, and radar telemetry for current user."""
    # 1. Backfill any completed tasks from existing user goals that are not yet recorded
    goals_stmt = (
        select(Goal)
        .outerjoin(SpaceMember, Goal.space_id == SpaceMember.space_id)
        .where(
            (Goal.user_id == current_user.id) | (SpaceMember.user_id == current_user.id)
        )
        .distinct()
    )
    goals_res = await db.execute(goals_stmt)
    user_goals = goals_res.scalars().all()
    # Fallback: if no goals matched via strict user_id, include any active goals in workspace
    if not user_goals:
        fallback_res = await db.execute(select(Goal))
        user_goals = fallback_res.scalars().all()

    existing_skills_stmt = select(UserSkill).where(UserSkill.user_id == current_user.id)
    existing_skills_res = await db.execute(existing_skills_stmt)
    existing_skills = {s.skill_name: s for s in existing_skills_res.scalars().all()}

    # Gather all task_ids already recorded in evidence
    recorded_task_ids = set()
    for s in existing_skills.values():
        for ev in (s.evidence or []):
            if ev.get("task_id"):
                recorded_task_ids.add(ev["task_id"])

    has_new_evidence = False
    for g in user_goals:
        for t in (g.tasks or []):
            if t.get("completed") and t.get("id") and t["id"] not in recorded_task_ids:
                extracted = extract_skills_from_task(
                    task_title=t.get("title", ""),
                    deliverable=t.get("deliverable", ""),
                    tools=t.get("tools", []),
                    sub_goal=t.get("sub_goal", ""),
                    category=g.category or "engineering",
                )
                evidence_entry = {
                    "goal_id": str(g.id),
                    "task_id": t["id"],
                    "task_title": t.get("title", ""),
                    "deliverable": t.get("deliverable", "Task deliverable verified"),
                    "completed_at": utc_now().isoformat(),
                }
                for item in extracted:
                    s_name = item["skill_name"]
                    s_cat = item["category"]
                    if s_name in existing_skills:
                        skill = existing_skills[s_name]
                        ev_list = list(skill.evidence or [])
                        if not any(e.get("task_id") == t["id"] for e in ev_list):
                            ev_list.append(evidence_entry)
                            skill.evidence = ev_list
                            skill.xp += 50
                            skill.verified_tasks_count += 1
                            skill.level = skill.calculate_level()
                            skill.last_practiced_at = utc_now()
                    else:
                        new_skill = UserSkill(
                            id=uuid.uuid4(),
                            user_id=current_user.id,
                            skill_name=s_name,
                            category=s_cat,
                            level="Novice",
                            xp=50,
                            verified_tasks_count=1,
                            evidence=[evidence_entry],
                            last_practiced_at=utc_now(),
                            created_at=utc_now(),
                        )
                        db.add(new_skill)
                        existing_skills[s_name] = new_skill
                recorded_task_ids.add(t["id"])
                has_new_evidence = True

    if has_new_evidence:
        await db.commit()

    # 2. Query all skills sorted
    stmt = (
        select(UserSkill)
        .where(UserSkill.user_id == current_user.id)
        .order_by(UserSkill.xp.desc(), UserSkill.last_practiced_at.desc())
    )
    result = await db.execute(stmt)
    skills = result.scalars().all()

    # Filter by space_id if requested
    if space_id:
        space_goal_ids = {str(g.id) for g in user_goals if str(g.space_id) == space_id}
        skills = [
            s for s in skills
            if any(ev.get("goal_id") in space_goal_ids for ev in (s.evidence or []))
        ]

    total_xp = sum(s.xp for s in skills)
    mastery_count = sum(1 for s in skills if s.level == "Mastery")
    proficient_count = sum(1 for s in skills if s.level == "Proficient")
    competent_count = sum(1 for s in skills if s.level == "Competent")
    novice_count = sum(1 for s in skills if s.level == "Novice")

    # Aggregate radar scores by category
    category_map: Dict[str, Dict[str, Any]] = {}
    for s in skills:
        cat = s.category
        if cat not in category_map:
            category_map[cat] = {"skills": 0, "xp": 0}
        category_map[cat]["skills"] += 1
        category_map[cat]["xp"] += s.xp

    # Dynamic Top-6 Focus:
    # Universal for ANY field (medicine, law, business, tech, design).
    # Prioritizes the user's active disciplines where XP has been earned, capping at 6 axes
    # to guarantee the radar chart never degenerates into a crowded spider web.
    active_categories = sorted(
        [cat for cat, info in category_map.items() if info["xp"] > 0],
        key=lambda c: (category_map[c]["xp"], category_map[c]["skills"]),
        reverse=True,
    )

    if len(active_categories) >= 3:
        selected_categories = active_categories[:6]
    elif len(active_categories) > 0:
        selected_categories = list(active_categories)
        other_cats = [c for c in category_map.keys() if c not in selected_categories]
        for c in other_cats:
            if len(selected_categories) >= 4:
                break
            selected_categories.append(c)
    else:
        # Brand new user: clean universal foundational axes
        selected_categories = [
            "Analytical Reasoning",
            "Domain Knowledge",
            "Research & Synthesis",
            "Execution & Tooling",
            "Systems Thinking",
        ]

    radar_data = []
    for cat in selected_categories:
        info = category_map.get(cat, {"skills": 0, "xp": 0})
        # Score normalized: 500 XP in a category = 100% capacity
        normalized_score = min(100, int((info["xp"] / 500.0) * 100))
        radar_data.append(
            RadarCategoryScore(
                category=cat,
                score=normalized_score,
                skill_count=info["skills"],
                total_xp=info["xp"],
            )
        )

    # Sort radar data with highest scores first
    radar_data.sort(key=lambda r: r.total_xp, reverse=True)

    skills_response = [
        UserSkillResponse(
            id=str(s.id),
            skill_name=s.skill_name,
            category=s.category,
            level=s.level,
            xp=s.xp,
            verified_tasks_count=s.verified_tasks_count,
            evidence=s.evidence or [],
            last_practiced_at=s.last_practiced_at,
            created_at=s.created_at,
        )
        for s in skills
    ]

    return GetSkillsResponse(
        skills=skills_response,
        stats=SkillStatsResponse(
            total_skills=len(skills),
            total_xp=total_xp,
            mastery_count=mastery_count,
            proficient_count=proficient_count,
            competent_count=competent_count,
            novice_count=novice_count,
            current_rank=derive_rank(total_xp),
        ),
        radar_data=radar_data,
    )


@router.post("/sync-from-task", response_model=SyncTaskSkillResponse)
async def sync_task_skill(
    payload: SyncTaskSkillRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Called when a task in /goals is toggled complete or incomplete.
    Awards or revokes competencies, XP, and verifiable evidence.
    """
    extracted = extract_skills_from_task(
        task_title=payload.task_title,
        deliverable=payload.deliverable or "",
        tools=payload.tools or [],
        sub_goal=payload.sub_goal or "",
        category=payload.category or "engineering",
    )

    affected = []
    total_xp_delta = 0

    if payload.completed:
        # User COMPLETED a task -> award XP and attach evidence
        now_iso = utc_now().isoformat()
        evidence_entry = {
            "goal_id": payload.goal_id,
            "task_id": payload.task_id,
            "task_title": payload.task_title,
            "deliverable": payload.deliverable or "Task deliverable verified",
            "completed_at": now_iso,
        }

        for item in extracted:
            s_name = item["skill_name"]
            s_cat = item["category"]

            stmt = select(UserSkill).where(
                and_(UserSkill.user_id == current_user.id, UserSkill.skill_name == s_name)
            )
            res = await db.execute(stmt)
            skill = res.scalar_one_or_none()

            if skill:
                current_evidence = list(skill.evidence or [])
                # Avoid duplicate evidence for same task_id
                already_has_task = any(ev.get("task_id") == payload.task_id for ev in current_evidence)
                if not already_has_task:
                    current_evidence.append(evidence_entry)
                    skill.evidence = current_evidence
                    skill.xp += 50
                    skill.verified_tasks_count += 1
                    skill.level = skill.calculate_level()
                    skill.last_practiced_at = utc_now()
                    total_xp_delta += 50
                    affected.append({
                        "skill_name": skill.skill_name,
                        "category": skill.category,
                        "xp": skill.xp,
                        "level": skill.level,
                        "newly_created": False,
                    })
            else:
                new_skill = UserSkill(
                    id=uuid.uuid4(),
                    user_id=current_user.id,
                    skill_name=s_name,
                    category=s_cat,
                    level="Novice",
                    xp=50,
                    verified_tasks_count=1,
                    evidence=[evidence_entry],
                    last_practiced_at=utc_now(),
                    created_at=utc_now(),
                )
                db.add(new_skill)
                total_xp_delta += 50
                affected.append({
                    "skill_name": s_name,
                    "category": s_cat,
                    "xp": 50,
                    "level": "Novice",
                    "newly_created": True,
                })

        await db.commit()
        return SyncTaskSkillResponse(
            action="awarded",
            affected_skills=affected,
            total_xp_delta=total_xp_delta,
        )

    else:
        # User UNCHECKED a task -> revoke evidence and deducted XP
        stmt = select(UserSkill).where(UserSkill.user_id == current_user.id)
        res = await db.execute(stmt)
        all_skills = res.scalars().all()

        for skill in all_skills:
            current_evidence = list(skill.evidence or [])
            filtered_evidence = [ev for ev in current_evidence if ev.get("task_id") != payload.task_id]

            if len(filtered_evidence) != len(current_evidence):
                # This skill had evidence from this task
                skill.evidence = filtered_evidence
                skill.xp = max(0, skill.xp - 50)
                skill.verified_tasks_count = max(0, skill.verified_tasks_count - 1)
                skill.level = skill.calculate_level()
                total_xp_delta -= 50
                affected.append({
                    "skill_name": skill.skill_name,
                    "category": skill.category,
                    "xp": skill.xp,
                    "level": skill.level,
                    "newly_created": False,
                })

        await db.commit()
        return SyncTaskSkillResponse(
            action="revoked",
            affected_skills=affected,
            total_xp_delta=total_xp_delta,
        )
