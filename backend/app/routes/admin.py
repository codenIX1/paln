"""Admin routes for analytics."""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.auth.dependencies import get_current_user
from app.config import get_settings
from app.db.database import get_db
from app.db.models import FollowUpInteraction, Session

router = APIRouter(prefix="/api/admin", tags=["admin"])


class FollowUpStats(BaseModel):
    total_clicks: int
    messages_with_followups: int
    click_rate: float
    recent_clicks: list[dict]


@router.get("/follow-up-stats", response_model=FollowUpStats)
async def get_follow_up_stats(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get follow-up interaction statistics (admin only)."""
    settings = get_settings()
    
    if not settings.admin_email or current_user.get("email") != settings.admin_email:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    
    # Total clicks
    result = await db.execute(select(func.count(FollowUpInteraction.id)))
    total_clicks = result.scalar() or 0
    
    # Messages with follow-ups
    result = await db.execute(
        select(func.count(func.distinct(FollowUpInteraction.message_id)))
    )
    messages_with_followups = result.scalar() or 0
    
    # Click rate
    click_rate = round((total_clicks / max(messages_with_followups, 1)) * 100, 1) if messages_with_followups > 0 else 0.0
    
    # Recent clicks (last 20)
    result = await db.execute(
        select(FollowUpInteraction, Session.title)
        .join(Session, FollowUpInteraction.session_id == Session.id, isouter=True)
        .order_by(FollowUpInteraction.clicked_at.desc())
        .limit(20)
    )
    rows = result.all()
    recent_clicks = [
        {
            "original_question": r[0].original_question[:100] + "..." if len(r[0].original_question) > 100 else r[0].original_question,
            "follow_up_clicked": r[0].follow_up_clicked,
            "clicked_at": str(r[0].clicked_at),
            "session_title": r[1] or "Unknown",
        }
        for r in rows
    ]
    
    return FollowUpStats(
        total_clicks=total_clicks,
        messages_with_followups=messages_with_followups,
        click_rate=click_rate,
        recent_clicks=recent_clicks,
    )