"""
app/routers/ai.py - AI-powered study endpoints: summaries, flashcards, quizzes, chat.
"""

from __future__ import annotations

import json
import logging
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Document, StudySession, User
from app.schemas import (
    ChatRequest,
    ChatResponse,
    ChatMessage,
    FlashcardsRequest,
    FlashcardsResponse,
    Flashcard,
    QuizRequest,
    QuizResponse,
    QuizQuestion,
    QuizOption,
    SummaryRequest,
    SummaryResponse,
    StudySessionOut,
    StudySessionUpdate,
)
from app.services import gemini_ai
from app.services.auth import get_current_active_user
from app.services.pdf_processor import truncate_text

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ai", tags=["AI Study Tools"])


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

async def _get_user_document(document_id: str, user: User, db: AsyncSession) -> Document:
    """Fetch a document, verify ownership, and ensure text has been extracted."""
    result = await db.execute(select(Document).where(Document.id == document_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorised to access this document")
    if not doc.extracted_text:
        raise HTTPException(
            status_code=422,
            detail="Document text has not been extracted yet. "
                   "Please reprocess the document first via POST /api/documents/{id}/reprocess",
        )
    return doc


async def _save_session(
    user_id: str,
    document_id: str | None,
    session_type: str,
    result_data: dict,
    db: AsyncSession,
    duration_seconds: int | None = None,
) -> str:
    """Persist a study session and return its ID."""
    session = StudySession(
        id=str(uuid.uuid4()),
        user_id=user_id,
        document_id=document_id,
        session_type=session_type,
        result_data=json.dumps(result_data),
        duration_seconds=duration_seconds,
    )
    db.add(session)
    await db.commit()
    return session.id


# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

@router.post("/summary", response_model=SummaryResponse)
async def generate_summary(
    payload: SummaryRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate a document summary (short / medium / detailed)."""
    doc = await _get_user_document(payload.document_id, current_user, db)
    text = truncate_text(doc.extracted_text, max_chars=28000)

    ai_result = await gemini_ai.generate_summary(text, payload.length, payload.focus_topics)

    # Use .get() with fallback and explicit check for None
    topic_name_raw = ai_result.get("topic_name")
    content_raw = ai_result.get("content")
    
    topic_name = str(topic_name_raw) if topic_name_raw is not None else "Document Summary"
    content = str(content_raw) if content_raw is not None else ""
    
    # Final check for the literal string "undefined" which can sometimes come from bad JS/AI interactions
    if content.lower() == "undefined":
        content = ""
    if topic_name.lower() == "undefined":
        topic_name = "Document Summary"

    word_count = ai_result.get("word_count") or (len(content.split()) if content else 0)

    session_id = await _save_session(
        current_user.id,
        payload.document_id,
        "summary",
        {
            "length": payload.length,
            "topic_name": topic_name,
            "content": content
        },
        db,
    )

    return SummaryResponse(
        document_id=payload.document_id,
        length=payload.length,
        topic_name=topic_name,
        content=content,
        word_count=word_count,
        session_id=session_id,
    )


# ---------------------------------------------------------------------------
# Flashcards
# ---------------------------------------------------------------------------

@router.post("/flashcards", response_model=FlashcardsResponse)
async def generate_flashcards(
    payload: FlashcardsRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate study flashcards from a document."""
    doc = await _get_user_document(payload.document_id, current_user, db)
    text = truncate_text(doc.extracted_text, max_chars=28000)

    raw_cards = await gemini_ai.generate_flashcards(
        text, 
        payload.count, 
        payload.difficulty, 
        payload.topics,
        payload.mode,
        payload.special_instructions
    )

    flashcards = [
        Flashcard(
            front=c.get("front", ""),
            back=c.get("back", ""),
            difficulty=c.get("difficulty", "medium"),
            topic=c.get("topic"),
        )
        for c in raw_cards
        if c.get("front") and c.get("back")
    ]

    session_id = await _save_session(
        current_user.id,
        payload.document_id,
        "flashcards",
        {"count": len(flashcards), "cards": [c.model_dump() for c in flashcards]},
        db,
    )

    return FlashcardsResponse(
        document_id=payload.document_id,
        flashcards=flashcards,
        total=len(flashcards),
        session_id=session_id,
    )


# ---------------------------------------------------------------------------
# Quiz
# ---------------------------------------------------------------------------

@router.post("/quiz", response_model=QuizResponse)
async def generate_quiz(
    payload: QuizRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate a multiple-choice quiz from a document."""
    doc = await _get_user_document(payload.document_id, current_user, db)
    text = truncate_text(doc.extracted_text, max_chars=28000)

    raw_questions = await gemini_ai.generate_quiz(text, payload.question_count, payload.difficulty)

    questions = []
    for q in raw_questions:
        options_raw = q.get("options", [])
        options = [QuizOption(id=o.get("id", ""), text=o.get("text", "")) for o in options_raw]
        questions.append(
            QuizQuestion(
                id=q.get("id", str(uuid.uuid4())),
                question=q.get("question", ""),
                options=options,
                correct_answer=q.get("correct_answer", ""),
                explanation=q.get("explanation"),
                difficulty=q.get("difficulty", "medium"),
                topic=q.get("topic"),
            )
        )

    session_id = await _save_session(
        current_user.id,
        payload.document_id,
        "quiz",
        {
            "question_count": len(questions),
            "questions": [q.model_dump() for q in questions],
        },
        db,
    )

    return QuizResponse(
        document_id=payload.document_id,
        questions=questions,
        total=len(questions),
        session_id=session_id,
    )


# ---------------------------------------------------------------------------
# Chat
# ---------------------------------------------------------------------------

@router.post("/chat", response_model=ChatResponse)
async def chat(
    payload: ChatRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Chat with AI – either specialized on a document or general."""
    if payload.document_id:
        doc = await _get_user_document(payload.document_id, current_user, db)
        text = truncate_text(doc.extracted_text, max_chars=20000)
        
        # Process extra attachment if present
        extra_text = ""
        if payload.extra_attachment:
            import base64
            import tempfile
            import os
            from app.services.pdf_processor import process_document
            
            try:
                # Create a temp file to process
                ext = ".pdf" if "pdf" in payload.extra_attachment.content_type.lower() else ".txt"
                with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
                    tmp.write(base64.b64decode(payload.extra_attachment.data.split(",")[-1]))
                    tmp_path = tmp.name
                
                try:
                    att_text, _ = await process_document(tmp_path, payload.extra_attachment.content_type)
                    extra_text = f"\n\n--- CONTENT FROM ATTACHED FILE ({payload.extra_attachment.filename}) ---\n{att_text}\n--- END ATTACHMENT ---"
                    logger.info("Successfully extracted %d characters from attachment '%s'", len(att_text), payload.extra_attachment.filename)
                finally:
                    if os.path.exists(tmp_path):
                        os.remove(tmp_path)
            except Exception as e:
                logger.error("Failed to process attachment '%s': %s", payload.extra_attachment.filename, e, exc_info=True)
                extra_text = f"\n\n[Warning: System could not process attached file {payload.extra_attachment.filename}]"
        
        history_dicts = [
            {"role": m.role, "content": m.content, "image_url": m.image_url}
            for m in (payload.history or [])
        ]
        
        context_with_extra = text + extra_text
        answer = await gemini_ai.chat_with_document(context_with_extra, payload.message or "", history_dicts, payload.image_url)
        msg_to_save = payload.message or ""
    else:
        # General chat
        messages = payload.messages or payload.history or []
        if not messages and payload.message:
            messages = [ChatMessage(role="user", content=payload.message, image_url=payload.image_url)]
        
        history_dicts = [
            {"role": m.role, "content": m.content, "image_url": m.image_url}
            for m in messages
        ]
        res = await gemini_ai.general_chat(history_dicts)
        answer = res.get("message", "")
        msg_to_save = messages[-1].content if messages else (payload.message or "")

    session_id = await _save_session(
        current_user.id,
        payload.document_id,
        "chat",
        {"message": msg_to_save, "answer": answer, "image_url": payload.image_url},
        db,
    )

    return ChatResponse(
        document_id=payload.document_id,
        answer=answer,
        session_id=session_id,
    )


# ---------------------------------------------------------------------------
# Study sessions history
# ---------------------------------------------------------------------------

@router.get("/sessions", response_model=List[StudySessionOut])
async def list_sessions(
    document_id: str | None = None,
    session_type: str | None = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """List study sessions for the current user."""
    query = select(StudySession).where(StudySession.user_id == current_user.id)
    if document_id:
        query = query.where(StudySession.document_id == document_id)
    if session_type:
        query = query.where(StudySession.session_type == session_type)

    query = query.order_by(StudySession.created_at.desc()).limit(100)
    result = await db.execute(query)
    sessions = result.scalars().all()
    return [StudySessionOut.model_validate(s) for s in sessions]


@router.get("/sessions/{session_id}", response_model=StudySessionOut)
async def get_session(
    session_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single study session by ID."""
    result = await db.execute(select(StudySession).where(StudySession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorised")
    return StudySessionOut.model_validate(session)


@router.patch("/sessions/{session_id}", response_model=StudySessionOut)
async def update_session(
    session_id: str,
    payload: StudySessionUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing study session (e.g., set duration or score)."""
    result = await db.execute(select(StudySession).where(StudySession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorised")

    if payload.duration_seconds is not None:
        session.duration_seconds = (session.duration_seconds or 0) + payload.duration_seconds
    if payload.score is not None:
        session.score = payload.score
    if payload.result_data is not None:
        # Merge or replace result data
        existing_data = json.loads(session.result_data) if session.result_data else {}
        existing_data.update(payload.result_data)
        session.result_data = json.dumps(existing_data)

    await db.commit()
    await db.refresh(session)
    return StudySessionOut.model_validate(session)


@router.post("/sessions", response_model=StudySessionOut)
async def create_timer_session(
    payload: dict, # simple payload for focus timer
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new study session, primarily for Focus Timer tracking."""
    # We need a dummy or placeholder document_id if none provided, 
    # or allow document_id to be optional in the model (currently it isn't).
    # Let's check the model.
    doc_id = payload.get("document_id")
    if not doc_id:
        # Get the first document if available, or error
        result = await db.execute(select(Document).where(Document.owner_id == current_user.id).limit(1))
        doc = result.scalar_one_or_none()
        if not doc:
            raise HTTPException(status_code=400, detail="At least one document is required to track study time.")
        doc_id = doc.id
    
    # Check if a session already exists for this type today? 
    # For now, just create a new one as requested.
    
    session_id = await _save_session(
        current_user.id,
        doc_id,
        payload.get("session_type", "focus_timer"),
        payload.get("result_data", {}),
        db,
        duration_seconds=payload.get("duration_seconds")
    )
    
    # Return the session
    result = await db.execute(select(StudySession).where(StudySession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=500, detail="Failed to create session")
    return StudySessionOut.model_validate(session)
