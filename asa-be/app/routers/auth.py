"""
app/routers/auth.py - Authentication endpoints: register, login, refresh, Google OAuth.
"""

from __future__ import annotations

import logging
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import User
from app.schemas import (
    GoogleAuthRequest,
    MessageResponse,
    PasswordChange,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    Token,
    TokenRefresh,
    UserCreate,
    UserLogin,
    UserOut,
    UserUpdate,
)
from app.services.auth import (
    create_access_token,
    create_refresh_token,
    create_reset_token,
    decode_token,
    exchange_google_code,
    get_current_active_user,
    hash_password,
    verify_password,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth", tags=["Authentication"])


# ---------------------------------------------------------------------------
# Register
# ---------------------------------------------------------------------------

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    """Create a new user account."""
    # Check duplicates
    existing_email = await db.execute(select(User).where(User.email == payload.email))
    if existing_email.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    username = payload.username
    if not username:
        # Generate username from email
        base_username = payload.email.split("@")[0].replace(".", "_")
        username = base_username
        idx = 1
        while True:
            res = await db.execute(select(User).where(User.username == username))
            if not res.scalar_one_or_none():
                break
            username = f"{base_username}{idx}"
            idx += 1
    else:
        existing_username = await db.execute(select(User).where(User.username == username))
        if existing_username.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Username already taken")

    user = User(
        id=str(uuid.uuid4()),
        email=payload.email,
        username=username,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        is_active=True,
        is_verified=False,
    )

    access_token = create_access_token({"sub": user.id})
    refresh_token = create_refresh_token({"sub": user.id})
    user.refresh_token = refresh_token

    db.add(user)
    await db.flush()
    await db.refresh(user)

    logger.info("New user registered: %s", user.email)
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserOut.model_validate(user),
    )


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------

@router.post("/login", response_model=Token)
async def login(payload: UserLogin, db: AsyncSession = Depends(get_db)):
    """Authenticate with email + password, return JWT tokens."""
    result = await db.execute(select(User).where(User.email == payload.email))
    user: Optional[User] = result.scalar_one_or_none()

    if not user or not user.hashed_password:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    access_token = create_access_token({"sub": user.id})
    refresh_token = create_refresh_token({"sub": user.id})
    user.refresh_token = refresh_token
    await db.flush()

    logger.info("User logged in: %s", user.email)
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserOut.model_validate(user),
    )


# ---------------------------------------------------------------------------
# Token Refresh
# ---------------------------------------------------------------------------

@router.post("/refresh", response_model=Token)
async def refresh_tokens(payload: TokenRefresh, db: AsyncSession = Depends(get_db)):
    """Issue new access + refresh tokens using a valid refresh token."""
    token_data = decode_token(payload.refresh_token)
    if token_data.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user_id = token_data.get("sub")
    result = await db.execute(select(User).where(User.id == user_id))
    user: Optional[User] = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    if user.refresh_token != payload.refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token revoked")

    access_token = create_access_token({"sub": user.id})
    new_refresh = create_refresh_token({"sub": user.id})
    user.refresh_token = new_refresh
    await db.flush()

    return Token(
        access_token=access_token,
        refresh_token=new_refresh,
        user=UserOut.model_validate(user),
    )


# ---------------------------------------------------------------------------
# Forgot & Reset Password
# ---------------------------------------------------------------------------

@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(payload: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    """Generate a password reset token and 'send' an email."""
    result = await db.execute(select(User).where(User.email == payload.email))
    user: Optional[User] = result.scalar_one_or_none()
    
    if not user or not user.is_active:
        # Don't reveal if user exists or not
        return MessageResponse(message="If that email is registered, a reset link has been sent.")
    
    reset_token = create_reset_token({"sub": user.id})
    reset_link = f"http://localhost:3000/reset-password?token={reset_token}"
    
    # Mocking email sending by logging it
    logger.info(f"Password reset requested for {user.email}. Link: {reset_link}")
    
    return MessageResponse(message="If that email is registered, a reset link has been sent.")


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(payload: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    """Reset the user's password using the token."""
    token_data = decode_token(payload.token)
    if token_data.get("type") != "reset":
        raise HTTPException(status_code=400, detail="Invalid token type")
        
    user_id = token_data.get("sub")
    if not user_id:
        raise HTTPException(status_code=400, detail="Invalid token format")
        
    result = await db.execute(select(User).where(User.id == user_id))
    user: Optional[User] = result.scalar_one_or_none()
    
    if not user or not user.is_active:
        raise HTTPException(status_code=400, detail="User not found or inactive")
        
    user.hashed_password = hash_password(payload.new_password)
    # Revoke current refresh tokens to log out from all devices
    user.refresh_token = None
    
    await db.flush()
    logger.info("Password successfully reset for %s", user.email)
    return MessageResponse(message="Password reset successfully")


# ---------------------------------------------------------------------------
# Logout
# ---------------------------------------------------------------------------

@router.post("/logout", response_model=MessageResponse)
async def logout(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Invalidate the user's refresh token."""
    current_user.refresh_token = None
    await db.flush()
    return MessageResponse(message="Logged out successfully")


# ---------------------------------------------------------------------------
# Google OAuth
# ---------------------------------------------------------------------------

@router.post("/google", response_model=Token)
async def google_auth(payload: GoogleAuthRequest, db: AsyncSession = Depends(get_db)):
    """Exchange Google authorization code for a Study Buddy session."""
    try:
        google_user = await exchange_google_code(payload.code, payload.redirect_uri)
    except Exception as exc:
        logger.error("Google OAuth error: %s", exc)
        raise HTTPException(status_code=400, detail=f"Google authentication failed: {exc}")

    google_id = google_user.get("sub")
    email = google_user.get("email")
    name = google_user.get("name", "")
    picture = google_user.get("picture")

    if not email:
        raise HTTPException(status_code=400, detail="Google account has no email")

    # Check if user exists by Google ID or email
    result = await db.execute(select(User).where(User.google_id == google_id))
    user = result.scalar_one_or_none()

    if not user:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

    if user:
        # Update Google info
        user.google_id = google_id
        user.avatar_url = picture or user.avatar_url
        if not user.is_active:
            raise HTTPException(status_code=403, detail="Account is deactivated")
    else:
        # Create new user
        base_username = email.split("@")[0].replace(".", "_")
        username = base_username
        # Ensure unique username
        idx = 1
        while True:
            res = await db.execute(select(User).where(User.username == username))
            if not res.scalar_one_or_none():
                break
            username = f"{base_username}{idx}"
            idx += 1

        user = User(
            id=str(uuid.uuid4()),
            email=email,
            username=username,
            full_name=name,
            avatar_url=picture,
            google_id=google_id,
            is_active=True,
            is_verified=True,  # Google emails are pre-verified
        )
        db.add(user)
        await db.flush()

    access_token = create_access_token({"sub": user.id})
    refresh_token = create_refresh_token({"sub": user.id})
    user.refresh_token = refresh_token
    await db.flush()
    await db.refresh(user)

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserOut.model_validate(user),
    )


# ---------------------------------------------------------------------------
# Profile
# ---------------------------------------------------------------------------

@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_active_user)):
    """Return the authenticated user's profile."""
    return UserOut.model_validate(current_user)


@router.patch("/me", response_model=UserOut)
async def update_me(
    payload: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Update the authenticated user's profile information."""
    if payload.full_name is not None:
        current_user.full_name = payload.full_name
    if payload.avatar_url is not None:
        current_user.avatar_url = payload.avatar_url
    
    if payload.email is not None and payload.email != current_user.email:
        # Check if email is already taken
        res = await db.execute(select(User).where(User.email == payload.email))
        if res.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Email already registered")
        current_user.email = payload.email

    await db.flush()
    await db.refresh(current_user)
    return UserOut.model_validate(current_user)


@router.post("/me/avatar", response_model=UserOut)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload and set user avatar."""
    from pathlib import Path
    import aiofiles
    import os

    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    upload_dir = Path(os.getenv("UPLOAD_DIR", "uploads")) / "avatars"
    upload_dir.mkdir(parents=True, exist_ok=True)

    ext = Path(file.filename).suffix
    filename = f"{current_user.id}{ext}"
    file_path = upload_dir / filename

    async with aiofiles.open(file_path, "wb") as f:
        content = await file.read()
        await f.write(content)

    # Update user avatar_url
    # We store a path that can be served (e.g., relative to a static route if implemented, 
    # or just the filename if the frontend knows where to look)
    # For now, let's store the relative path from the app root or a placeholder
    current_user.avatar_url = f"/uploads/avatars/{filename}"
    
    await db.flush()
    await db.refresh(current_user)
    return UserOut.model_validate(current_user)


@router.put("/me/password", response_model=MessageResponse)
async def change_password(
    payload: PasswordChange,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Change the current user's password."""
    if not current_user.hashed_password:
        raise HTTPException(status_code=400, detail="Cannot change password for OAuth accounts")
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    current_user.hashed_password = hash_password(payload.new_password)
    # Revoke refresh token to force re-login everywhere
    current_user.refresh_token = None
    await db.flush()
    return MessageResponse(message="Password changed successfully")


@router.delete("/me", response_model=MessageResponse)
async def delete_account(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Permanently delete the authenticated user's account."""
    await db.delete(current_user)
    await db.flush()
    logger.warning("Account deleted: %s", current_user.email)
    return MessageResponse(message="Account deleted successfully")
