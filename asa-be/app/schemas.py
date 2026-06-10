"""
app/schemas.py - Pydantic v2 schemas for request/response validation.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

class UserCreate(BaseModel):
    email: EmailStr
    username: Optional[str] = Field(None, min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_-]+$")
    password: str = Field(..., min_length=8, max_length=128)
    full_name: Optional[str] = Field(None, max_length=200)


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, max_length=200)
    email: Optional[EmailStr] = None
    avatar_url: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)


class UserOut(BaseModel):
    id: str
    email: str
    username: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: bool
    is_verified: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut


class TokenRefresh(BaseModel):
    refresh_token: str


class GoogleAuthRequest(BaseModel):
    code: str
    redirect_uri: Optional[str] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=128)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8, max_length=128)


# ---------------------------------------------------------------------------
# Document
# ---------------------------------------------------------------------------

class DocumentOut(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    filename: str
    file_size: int
    mime_type: str
    page_count: Optional[int] = None
    owner_id: str
    is_processed: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DocumentUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=300)
    description: Optional[str] = None


# ---------------------------------------------------------------------------
# AI Schemas
# ---------------------------------------------------------------------------

class SummaryRequest(BaseModel):
    document_id: str
    length: Literal["short", "medium", "detailed"] = "medium"
    focus_topics: Optional[List[str]] = None


class SummarySubsection(BaseModel):
    title: str
    bullets: List[str]

class SummaryResponse(BaseModel):
    document_id: str
    length: str
    topic_name: str
    content: str
    word_count: int
    session_id: Optional[str] = None


class Flashcard(BaseModel):
    front: str
    back: str
    difficulty: Literal["easy", "medium", "hard"] = "medium"
    topic: Optional[str] = None


class FlashcardsRequest(BaseModel):
    document_id: str
    count: int = Field(10, ge=1, le=50)
    difficulty: Optional[Literal["easy", "medium", "hard"]] = None
    topics: Optional[List[str]] = None
    mode: Optional[str] = None
    special_instructions: Optional[str] = None


class FlashcardsResponse(BaseModel):
    document_id: str
    flashcards: List[Flashcard]
    total: int
    session_id: Optional[str] = None


class QuizOption(BaseModel):
    id: str
    text: str


class QuizQuestion(BaseModel):
    id: str
    question: str
    options: List[QuizOption]
    correct_answer: str
    explanation: Optional[str] = None
    difficulty: Literal["easy", "medium", "hard"] = "medium"
    topic: Optional[str] = None


class QuizRequest(BaseModel):
    document_id: str
    question_count: int = Field(10, ge=1, le=30)
    difficulty: Optional[Literal["easy", "medium", "hard"]] = None
    question_types: Optional[List[Literal["multiple_choice", "true_false"]]] = None


class QuizResponse(BaseModel):
    document_id: str
    questions: List[QuizQuestion]
    total: int
    session_id: Optional[str] = None


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str
    image_url: Optional[str] = None
    timestamp: Optional[datetime] = None



class ChatAttachment(BaseModel):
    filename: str
    content_type: str
    data: str  # base64 encoded string


class ChatRequest(BaseModel):
    document_id: Optional[str] = None
    message: Optional[str] = Field(None, max_length=2000)
    image_url: Optional[str] = None
    extra_attachment: Optional[ChatAttachment] = None
    history: Optional[List[ChatMessage]] = Field(default_factory=list)
    messages: Optional[List[ChatMessage]] = None


class ChatResponse(BaseModel):
    document_id: Optional[str] = None
    answer: str
    sources: Optional[List[str]] = None
    session_id: Optional[str] = None


# ---------------------------------------------------------------------------
# Study Session
# ---------------------------------------------------------------------------

class StudySessionUpdate(BaseModel):
    duration_seconds: Optional[int] = Field(None, ge=0)
    score: Optional[float] = Field(None, ge=0, le=100)
    result_data: Optional[Dict[str, Any]] = None

class StudySessionOut(BaseModel):
    id: str
    user_id: str
    document_id: Optional[str] = None
    session_type: str
    duration_seconds: Optional[int] = None
    score: Optional[float] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

class DashboardStats(BaseModel):
    total_documents: int
    total_folders: int
    study_sessions: int
    total_study_time: int
    recent_documents: List[DocumentOut]


# ---------------------------------------------------------------------------
# Common
# ---------------------------------------------------------------------------

class MessageResponse(BaseModel):
    message: str
    success: bool = True


class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    page_size: int
    pages: int


class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
    status_code: int
