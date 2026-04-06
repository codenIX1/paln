"""Auth routes - register and login."""

import uuid
from datetime import timedelta

from fastapi import APIRouter, HTTPException, status

from app.auth import (
    Token,
    UserCreate,
    UserLogin,
    create_access_token,
    get_password_hash,
    verify_password,
)
from app.auth.dependencies import get_current_user
from app.config import get_settings
from app.db.sqlite import get_db

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=Token)
async def register(user_data: UserCreate):
    """Register a new user."""
    db = await get_db()
    
    existing = await db.execute(
        "SELECT id FROM users WHERE email = ?",
        (user_data.email,),
    )
    if await existing.fetchone():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    
    user_id = str(uuid.uuid4())
    hashed_password = get_password_hash(user_data.password)
    
    await db.execute(
        """INSERT INTO users (id, email, password_hash, created_at)
           VALUES (?, ?, ?, datetime('now'))""",
        (user_id, user_data.email, hashed_password),
    )
    await db.commit()
    
    access_token = create_access_token(
        data={"sub": user_id, "email": user_data.email},
        expires_delta=timedelta(days=7),
    )
    
    return Token(access_token=access_token)


@router.post("/login", response_model=Token)
async def login(user_data: UserLogin):
    """Login with email and password."""
    db = await get_db()
    
    row = await db.execute(
        "SELECT id, email, password_hash FROM users WHERE email = ?",
        (user_data.email,),
    )
    user = await row.fetchone()
    
    if not user or not verify_password(user_data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    
    access_token = create_access_token(
        data={"sub": user["id"], "email": user["email"]},
        expires_delta=timedelta(days=7),
    )
    
    return Token(access_token=access_token)


@router.get("/me")
async def get_me(current_user: dict = get_current_user):
    """Get current user info."""
    return current_user


@router.post("/nextauth")
async def nextauth_login(user_data: UserLogin):
    """NextAuth-compatible login endpoint.
    
    Validates credentials and returns user info with token.
    Used by NextAuth.js credentials provider.
    """
    db = await get_db()
    
    row = await db.execute(
        "SELECT id, email, password_hash FROM users WHERE email = ?",
        (user_data.email,),
    )
    user = await row.fetchone()
    
    if not user or not verify_password(user_data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    
    access_token = create_access_token(
        data={"sub": user["id"], "email": user["email"]},
        expires_delta=timedelta(days=7),
    )
    
    return {
        "id": user["id"],
        "email": user["email"],
        "accessToken": access_token,
    }
