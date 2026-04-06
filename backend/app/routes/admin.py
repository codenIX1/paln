"""Admin routes for analytics."""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.auth.dependencies import get_current_user
from app.config import get_settings
from app.db.sqlite import get_db

router = APIRouter(prefix="/api/admin", tags=["admin"])


class FollowUpStats(BaseModel):
    total_clicks: int
    messages_with_followups: int
    click_rate: float
    recent_clicks: list[dict]


@router.get("/follow-up-stats", response_model=FollowUpStats)
async def get_follow_up_stats(
    current_user: dict = Depends(get_current_user),
):
    """Get follow-up interaction statistics (admin only)."""
    settings = get_settings()
    
    if not settings.admin_email or current_user.get("email") != settings.admin_email:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    
    db = await get_db()
    
    # Total clicks
    row = await db.execute("SELECT COUNT(*) as cnt FROM follow_up_interactions")
    total_clicks = (await row.fetchone())["cnt"]
    
    # Messages with follow-ups (approximate - count assistant messages with follow_ups in content or from sessions with interactions)
    row = await db.execute(
        """SELECT COUNT(DISTINCT message_id) as cnt FROM follow_up_interactions"""
    )
    messages_with_followups = (await row.fetchone())["cnt"]
    
    # Click rate
    click_rate = round((total_clicks / max(messages_with_followups, 1)) * 100, 1) if messages_with_followups > 0 else 0.0
    
    # Recent clicks (last 20)
    row = await db.execute(
        """SELECT f.*, s.title as session_title
           FROM follow_up_interactions f
           LEFT JOIN sessions s ON f.session_id = s.id
           ORDER BY f.clicked_at DESC
           LIMIT 20""",
    )
    recent = await row.fetchall()
    recent_clicks = [
        {
            "original_question": r["original_question"][:100] + "..." if len(r["original_question"]) > 100 else r["original_question"],
            "follow_up_clicked": r["follow_up_clicked"],
            "clicked_at": r["clicked_at"],
            "session_title": r.get("session_title", "Unknown"),
        }
        for r in recent
    ]
    
    return FollowUpStats(
        total_clicks=total_clicks,
        messages_with_followups=messages_with_followups,
        click_rate=click_rate,
        recent_clicks=recent_clicks,
    )