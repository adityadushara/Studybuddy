"""
app/services/pdf_processor.py - PDF text extraction using PyPDF.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Optional, Tuple

logger = logging.getLogger(__name__)


class PDFProcessingError(Exception):
    """Raised when PDF processing fails."""


async def extract_text_from_pdf(file_path: str) -> Tuple[str, int]:
    """
    Extract text and page count from a PDF file.

    Returns:
        Tuple of (extracted_text, page_count)

    Raises:
        PDFProcessingError: if the file cannot be read or is not a valid PDF.
    """
    try:
        from pypdf import PdfReader  # lazy import
    except ImportError as exc:
        raise PDFProcessingError("pypdf is not installed. Run: pip install pypdf") from exc

    path = Path(file_path)
    if not path.exists():
        raise PDFProcessingError(f"File not found: {file_path}")

    if path.suffix.lower() not in {".pdf"}:
        raise PDFProcessingError(f"Unsupported file type: {path.suffix}")

    try:
        reader = PdfReader(str(path))
        page_count = len(reader.pages)
        texts: list[str] = []

        for i, page in enumerate(reader.pages):
            try:
                page_text = page.extract_text() or ""
                texts.append(page_text)
            except Exception as page_err:
                logger.warning("Could not extract text from page %d: %s", i + 1, page_err)

        full_text = "\n\n".join(t for t in texts if t.strip())
        logger.info("Extracted %d chars from %d pages in '%s'", len(full_text), page_count, path.name)
        return full_text, page_count

    except PDFProcessingError:
        raise
    except Exception as exc:
        raise PDFProcessingError(f"Failed to process PDF '{path.name}': {exc}") from exc


async def extract_text_from_txt(file_path: str) -> Tuple[str, int]:
    """
    Read plain-text file content.

    Returns:
        Tuple of (text_content, estimated_page_count)
    """
    path = Path(file_path)
    if not path.exists():
        raise PDFProcessingError(f"File not found: {file_path}")

    try:
        content = path.read_text(encoding="utf-8", errors="replace")
        # Rough estimate: ~500 words per page, ~5 chars per word
        word_count = len(content.split())
        estimated_pages = max(1, word_count // 500)
        return content, estimated_pages
    except Exception as exc:
        raise PDFProcessingError(f"Failed to read text file: {exc}") from exc


async def process_document(file_path: str, mime_type: str) -> Tuple[str, int]:
    """
    Process a document based on its MIME type.

    Returns:
        Tuple of (extracted_text, page_count)
    """
    if "pdf" in mime_type.lower() or file_path.lower().endswith(".pdf"):
        return await extract_text_from_pdf(file_path)
    elif "text" in mime_type.lower() or file_path.lower().endswith(".txt"):
        return await extract_text_from_txt(file_path)
    else:
        raise PDFProcessingError(f"Unsupported MIME type: {mime_type}")


def truncate_text(text: str, max_chars: int = 30000) -> str:
    """Truncate text to fit within LLM context limits."""
    if len(text) <= max_chars:
        return text
    return text[:max_chars] + "\n\n[... content truncated to fit context limit ...]"
