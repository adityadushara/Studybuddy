"""
app/services/gemini_ai.py - AI integration service via Google Gemini.
"""

from __future__ import annotations

import json
import logging
import os
import uuid
from typing import Any, Dict, List, Optional

from fastapi import HTTPException, status
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = "gemini-3.1-flash-lite-preview"

def _get_client():
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY not set in environment variables.")
    return genai.Client(api_key=GEMINI_API_KEY)

def _build_system_prompt(document_text: str, task: str, json_mode: bool = True) -> str:
    prompt = (
        f"You are Study Buddy, an expert AI study assistant. "
        f"Your task is to {task} based on the provided document content. "
    )
    if json_mode:
        prompt += "Always respond with valid JSON only. No markdown code fences, no extra text.\n\n"
    else:
        prompt += "Use proper text formatting (Markdown) with headings, bold text, and lists for readability. Do not output raw JSON.\n\n"
        
    prompt += f"DOCUMENT CONTENT:\n{document_text}"
    return prompt

def _extract_json(raw: str, expected_type: type = dict) -> Any:
    raw = raw.strip()
    if "```" in raw:
        if "```json" in raw:
            try:
                content = raw.split("```json")[1].split("```")[0].strip()
                return json.loads(content)
            except (IndexError, json.JSONDecodeError):
                pass
        try:
            content = raw.split("```")[1].strip()
            return json.loads(content)
        except (IndexError, json.JSONDecodeError):
            pass

    start_char = '[' if expected_type is list else '{'
    end_char = ']' if expected_type is list else '}'
    
    start = raw.find(start_char)
    end = raw.rfind(end_char) + 1
    
    if start != -1 and end != 0:
        try:
            return json.loads(raw[start:end])
        except json.JSONDecodeError:
            pass

    return json.loads(raw)

async def generate_summary(text: str, length: str, focus_topics: Optional[List[str]] = None) -> Dict[str, Any]:
    prompt = (
        f"Analyze the document and generate an EXHAUSTIVE, high-end study analysis in a 'Professional Word Document' format.\n\n"
        f"Format your response as a JSON object with EXACTLY these keys:\n"
        '{\n'
        '  "topic_name": "Display Title (e.g. Data Mining Overview)",\n'
        '  "content": "HTML-styled document content with EXACTLY this flow:\\n'
        '    <h1>📚 [Topic Name]</h1>\\n'
        '    <h3>Brief Overview</h3>\\n'
        '    <p>A detailed paragraph summarizing the note content. Use <b>bold text</b> and <mark>highlights</mark> for critical numbers or terms.</p>\\n'
        '    <hr/>\\n'
        '    <h3>Key Points</h3>\\n'
        '    <ul><li>Exhaustive bullet point...</li></ul>\\n'
        '    <hr/>\\n'
        '    <h2>📜 [Subsection Topic]</h2>\\n'
        '    <ul><li>Deeply detailed insights...</li></ul>\\n'
        '    <h2>☘️ [What is/Applications]</h2>\\n'
        '    <p>Detailed explanation...</p>",\n'
        '  "word_count": 1234\n'
        "}\n\n"
        "Rules:\n"
        "1. Start with '📚 [Topic Name] Overview' in an H1.\n"
        "2. Use H2/H3 for subsections with appropriate emojis (📜, ☘️, 📊, 📖).\n"
        "3. Use <hr/> to separate main sections.\n"
        "4. Content MUST be exhaustive and formatted for academic study."
    )

    client = _get_client()
    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=[
                types.Content(role="user", parts=[types.Part.from_text(text=_build_system_prompt(text, "summarize the document into a single unified block") + "\n\n" + prompt)])
            ],
            config=types.GenerateContentConfig(
                temperature=0.8,
                max_output_tokens=4000,
                response_mime_type="application/json"
            )
        )
        return _extract_json(response.text, dict)
    except Exception as exc:
        logger.error("Gemini service error (summary): %s", exc)
        raise HTTPException(status_code=502, detail=f"Gemini service error: {exc}")

async def generate_flashcards(
    text: str,
    count: int = 10,
    difficulty: Optional[str] = None,
    topics: Optional[List[str]] = None,
    mode: Optional[str] = None,
    special_instructions: Optional[str] = None,
) -> List[Dict[str, Any]]:
    topic_str = f" Focus on topics: {', '.join(topics)}." if topics else ""
    instr_default = "cover the full notes comprehensively with a mix of definitions, key facts, examples, and Q&A"
    
    prompt = f"""Generate high-quality flashcards from the following notes (provided in context).

User settings:
- Mode: {mode or 'Standard'}
- Number of flashcards: {count}
- Special instructions: {special_instructions or instr_default}

Rules for flashcards:
- Each flashcard must have a clear front (question/prompt) and back (concise answer/explanation).
- Respond with JSON array only, each item:
{{ "front": "Question?", "back": "Answer", "difficulty": "easy|medium|hard", "topic": "Topic name" }}
{topic_str}"""

    client = _get_client()
    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=[
                types.Content(role="user", parts=[types.Part.from_text(text=_build_system_prompt(text, "create flashcards") + "\n\n" + prompt)])
            ],
            config=types.GenerateContentConfig(
                temperature=0.85,
                max_output_tokens=3000,
                response_mime_type="application/json"
            )
        )
        cards = _extract_json(response.text, list)
        return cards[:count]
    except Exception as exc:
        logger.error("Gemini service error (flashcards): %s", exc)
        raise HTTPException(status_code=502, detail=f"Gemini service error: {exc}")

async def generate_quiz(
    text: str,
    question_count: int = 10,
    difficulty: Optional[str] = None,
) -> List[Dict[str, Any]]:
    diff_str = f" Difficulty: {difficulty}." if difficulty else ""

    prompt = (
        f"Generate exactly {question_count} multiple-choice quiz questions.{diff_str}\n\n"
        "Respond with JSON array only:\n"
        '[\n'
        '  {\n'
        '    "id": "q1",\n'
        '    "question": "Question text?",\n'
        '    "options": [{"id": "A", "text": "..."}, {"id": "B", "text": "..."}, {"id": "C", "text": "..."}, {"id": "D", "text": "..."}],\n'
        '    "correct_answer": "B",\n'
        '    "explanation": "Actual explanation of the concept...",\n'
        '    "difficulty": "easy|medium|hard",\n'
        '    "topic": "Topic name"\n'
        '  }\n'
        ']'
    )

    client = _get_client()
    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=[
                types.Content(role="user", parts=[types.Part.from_text(text=_build_system_prompt(text, "create a quiz") + "\n\n" + prompt)])
            ],
            config=types.GenerateContentConfig(
                temperature=0.85,
                max_output_tokens=4000,
                response_mime_type="application/json"
            )
        )
        questions = _extract_json(response.text, list)
        for i, q in enumerate(questions):
            if not q.get("id"):
                q["id"] = f"q{i + 1}"
        return questions[:question_count]
    except Exception as exc:
        logger.error("Gemini service error (quiz): %s", exc)
        raise HTTPException(status_code=502, detail=f"Gemini service error: {exc}")

async def chat_with_document(
    text: str,
    user_message: str,
    history: Optional[List[Dict[str, str]]] = None,
    image_url: Optional[str] = None,
) -> str:
    messages = []
    # Add history
    if history:
        for msg in history[-10:]:
            role = "user" if msg.get("role") == "user" else "model"
            messages.append(types.Content(role=role, parts=[types.Part.from_text(text=msg.get("content", ""))]))

    # Current message
    parts = [types.Part.from_text(text=user_message or "What's in this image?")]
    if image_url:
        # Note: If image_url is a local path or data URI, we'd need more logic. 
        # google-genai supports image objects. 
        # For now, let's assume image_url can be handled or just skip it if it's complex.
        pass

    messages.append(types.Content(role="user", parts=parts))

    client = _get_client()
    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=messages,
            config=types.GenerateContentConfig(
                system_instruction=_build_system_prompt(text, "answer a user question about the document", json_mode=False),
                temperature=0.7,
                max_output_tokens=4096
            )
        )
        return response.text.strip()
    except Exception as exc:
        logger.error("Gemini service error (chat): %s", exc)
        raise HTTPException(status_code=502, detail=f"Gemini service error: {exc}")

async def general_chat(
    history: List[Dict[str, str]],
) -> Dict[str, Any]:
    messages = []
    for msg in history[-20:]:
        role = "user" if msg.get("role") == "user" else "model"
        messages.append(types.Content(role=role, parts=[types.Part.from_text(text=msg.get("content", ""))]))

    client = _get_client()
    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=messages,
            config=types.GenerateContentConfig(
                system_instruction="You are Study Buddy, a friendly and knowledgeable AI study assistant.",
                temperature=0.7,
                max_output_tokens=4096
            )
        )
        return {"message": response.text.strip()}
    except Exception as exc:
        logger.error("Gemini service error (general_chat): %s", exc)
        raise HTTPException(status_code=502, detail=f"Gemini service error: {exc}")
