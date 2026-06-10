"""
app/routers/dashboard.py - Dashboard statistics endpoints.
"""

import logging
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Document, StudySession, User
from app.schemas import DashboardStats, DocumentOut
from app.services.auth import get_current_active_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get aggregate statistics for the dashboard."""
    try:
        # Count documents
        doc_count_query = select(func.count(Document.id)).where(Document.owner_id == current_user.id)
        doc_count_result = await db.execute(doc_count_query)
        total_documents = doc_count_result.scalar() or 0

        # Count study sessions and total time
        session_stats_query = select(
            func.count(StudySession.id),
            func.sum(StudySession.duration_seconds)
        ).where(StudySession.user_id == current_user.id)
        session_stats_result = await db.execute(session_stats_query)
        row = session_stats_result.first()
        
        total_sessions = 0
        total_time = 0
        if row:
            total_sessions = row[0] or 0
            total_time = row[1] or 0

        # Recent documents (last 5)
        recent_docs_query = select(Document).where(
            Document.owner_id == current_user.id
        ).order_by(Document.created_at.desc()).limit(5)
        recent_docs_result = await db.execute(recent_docs_query)
        recent_docs = recent_docs_result.scalars().all()

        logger.info("Dashboard stats fetched for user %s: docs=%d, sessions=%d", current_user.email, total_documents, total_sessions)

        return DashboardStats(
            total_documents=total_documents,
            total_folders=0,
            study_sessions=total_sessions,
            total_study_time=total_time,
            recent_documents=[DocumentOut.model_validate(d) for d in recent_docs]
        )
    except Exception as exc:
        logger.error("Error fetching dashboard stats: %s", exc, exc_info=True)
        # Return empty stats instead of failing
        return DashboardStats(
            total_documents=0,
            total_folders=0,
            study_sessions=0,
            total_study_time=0,
            recent_documents=[]
        )
