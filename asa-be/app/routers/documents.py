"""
app/routers/documents.py - Document upload and CRUD endpoints.
"""

from __future__ import annotations

import logging
import os
import uuid
from pathlib import Path
from typing import List, Optional

import aiofiles
from fastapi import (
    APIRouter, Depends, File, Form, HTTPException,
    Query, UploadFile, status,
)
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Document, User
from app.schemas import DocumentOut, DocumentUpdate, MessageResponse
from app.services.auth import get_current_active_user
from app.services.pdf_processor import PDFProcessingError, process_document

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/documents", tags=["Documents"])

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "uploads"))
MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_SIZE_MB", "50"))
MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024
ALLOWED_TYPES = {
    "application/pdf",
    "text/plain",
    "text/x-python",
    "text/markdown",
}


def _ensure_upload_dir() -> None:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def _check_owner(doc: Document, user: User) -> None:
    if doc.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorised to access this document")


# ---------------------------------------------------------------------------
# Upload document
# ---------------------------------------------------------------------------

@router.post("/upload", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a PDF or text file and extract its content."""
    _ensure_upload_dir()

    # Content-type validation
    mime = file.content_type or "application/octet-stream"
    filename = file.filename or "upload"
    ext = Path(filename).suffix.lower()

    # Allow by extension if mime is generic
    if mime == "application/octet-stream":
        if ext == ".pdf":
            mime = "application/pdf"
        elif ext in {".txt", ".md"}:
            mime = "text/plain"

    if mime not in ALLOWED_TYPES and ext not in {".pdf", ".txt", ".md"}:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {mime}. Allowed: PDF, TXT, MD",
        )

    # Read file and check size
    file_bytes = await file.read()
    if len(file_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {MAX_UPLOAD_MB} MB",
        )

    # Persist to disk
    safe_filename = f"{uuid.uuid4()}{ext}"
    file_path = UPLOAD_DIR / safe_filename

    async with aiofiles.open(file_path, "wb") as f:
        await f.write(file_bytes)

    # Extract text
    extracted_text: Optional[str] = None
    page_count: Optional[int] = None
    try:
        extracted_text, page_count = await process_document(str(file_path), mime)
        is_processed = True
    except PDFProcessingError as exc:
        logger.warning("Could not process document '%s': %s", filename, exc)
        is_processed = False

    doc = Document(
        id=str(uuid.uuid4()),
        title=title or Path(filename).stem,
        description=description,
        filename=filename,
        file_path=str(file_path),
        file_size=len(file_bytes),
        mime_type=mime,
        page_count=page_count,
        extracted_text=extracted_text,
        owner_id=current_user.id,
        is_processed=is_processed,
    )
    db.add(doc)
    await db.flush()
    await db.refresh(doc)

    logger.info("Document uploaded: %s (%d bytes)", doc.title, doc.file_size)
    return DocumentOut.model_validate(doc)


# ---------------------------------------------------------------------------
# List documents
# ---------------------------------------------------------------------------

@router.get("", response_model=List[DocumentOut])
async def list_documents(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """List all documents owned by the current user."""
    query = select(Document).where(Document.owner_id == current_user.id)
    query = query.order_by(Document.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    docs = result.scalars().all()
    return [DocumentOut.model_validate(d) for d in docs]


@router.get("/test-routing")
async def test_routing():
    return {"message": "Routing is working!"}


@router.get("/{document_id}/view")
async def view_document(
    document_id: str,
    token: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Securely serve the document file content. Supports token in Query param for iframes."""
    logger.info("View request for doc_id: %s (token present: %s)", document_id, token is not None)
    from app.services.auth import decode_token
    
    # 1. Try to find the document first
    result = await db.execute(select(Document).where(Document.id == document_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # 2. Manual Auth check (required for iframe GET requests)
    # If no token in query, we might still have it in headers? 
    # But Depends(get_current_active_user) is more robust for headers.
    # For simplicity, we just check the token param or rely on standard auth if we can.
    # Actually, we can just use the token param and fall back to a manual header check if needed.
    
    actual_token = token
    if not actual_token:
        # We don't have easy access to the header here without Request object
        # but the frontend is updated to send it as ?token=... for the viewer
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = decode_token(actual_token)
        user_id = payload.get("sub")
        if not user_id or user_id != doc.owner_id:
            raise HTTPException(status_code=403, detail="Permission denied")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    file_path = Path(doc.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File content not found on server")
        
    # Ensure correct media type
    media_type = doc.mime_type
    if not media_type or media_type == "application/octet-stream":
        if file_path.suffix.lower() == ".pdf":
            media_type = "application/pdf"
        elif file_path.suffix.lower() == ".txt":
            media_type = "text/plain"

    return FileResponse(
        path=file_path,
        media_type=media_type,
        filename=doc.filename,
        content_disposition_type="inline"
    )


@router.get("/{document_id}", response_model=DocumentOut)
async def get_document(
    document_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get document metadata by ID."""
    result = await db.execute(select(Document).where(Document.id == document_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    _check_owner(doc, current_user)
    return DocumentOut.model_validate(doc)


# ---------------------------------------------------------------------------
# Update document
# ---------------------------------------------------------------------------

@router.put("/{document_id}", response_model=DocumentOut)
async def update_document(
    document_id: str,
    payload: DocumentUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Update document title, description, or folder."""
    result = await db.execute(select(Document).where(Document.id == document_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    _check_owner(doc, current_user)

    if payload.title is not None:
        doc.title = payload.title
    if payload.description is not None:
        doc.description = payload.description

    await db.flush()
    await db.refresh(doc)
    return DocumentOut.model_validate(doc)


# ---------------------------------------------------------------------------
# Delete document
# ---------------------------------------------------------------------------

@router.delete("/{document_id}", response_model=MessageResponse)
async def delete_document(
    document_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a document and remove its file from disk."""
    result = await db.execute(select(Document).where(Document.id == document_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    _check_owner(doc, current_user)

    # Remove file from disk
    file_path = Path(doc.file_path)
    if file_path.exists():
        try:
            file_path.unlink()
        except OSError as exc:
            logger.warning("Could not delete file '%s': %s", file_path, exc)

    await db.delete(doc)
    await db.flush()
    return MessageResponse(message=f"Document '{doc.title}' deleted successfully")


# ---------------------------------------------------------------------------
# Reprocess document
# ---------------------------------------------------------------------------

@router.post("/{document_id}/reprocess", response_model=DocumentOut)
async def reprocess_document(
    document_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Re-extract text from the uploaded file (useful if initial processing failed)."""
    result = await db.execute(select(Document).where(Document.id == document_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    _check_owner(doc, current_user)

    try:
        extracted_text, page_count = await process_document(doc.file_path, doc.mime_type)
        doc.extracted_text = extracted_text
        doc.page_count = page_count
        doc.is_processed = True
    except PDFProcessingError as exc:
        raise HTTPException(status_code=422, detail=f"Processing failed: {exc}")

    await db.flush()
    await db.refresh(doc)
    return DocumentOut.model_validate(doc)


# ---------------------------------------------------------------------------
# Legacy AI Fallbacks (for old frontend versions)
# ---------------------------------------------------------------------------

@router.post("/{document_id}/summary")
async def legacy_summary(
    document_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Legacy endpoint for summary generation."""
    from app.routers.ai import generate_summary
    from app.schemas import SummaryRequest
    return await generate_summary(SummaryRequest(document_id=document_id), current_user, db)


@router.post("/{document_id}/flashcards")
async def legacy_flashcards(
    document_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Legacy endpoint for flashcards generation."""
    from app.routers.ai import generate_flashcards
    from app.schemas import FlashcardsRequest
    return await generate_flashcards(FlashcardsRequest(document_id=document_id, count=10), current_user, db)


@router.post("/{document_id}/quiz")
async def legacy_quiz(
    document_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Legacy endpoint for quiz generation."""
    from app.routers.ai import generate_quiz
    from app.schemas import QuizRequest
    return await generate_quiz(QuizRequest(document_id=document_id, question_count=5), current_user, db)


@router.post("/{document_id}/chat")
async def legacy_chat(
    document_id: str,
    payload: dict,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Legacy endpoint for document chat."""
    from app.routers.ai import chat
    from app.schemas import ChatRequest
    # Simple heuristic to extract message from potential legacy payloads
    message = payload.get("message") or (payload.get("messages")[-1]["content"] if payload.get("messages") else "")
    return await chat(ChatRequest(document_id=document_id, message=message), current_user, db)
