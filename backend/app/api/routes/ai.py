from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.api.routes.auth import get_current_user
from app.core.config import settings
from app.ml.service import (
    ModelNotTrainedError,
    analyze_resume_text,
    get_interview_questions,
    load_model,
    process_ai_chat,
)
from app.models.user import User
from app.schemas.ai import (
    ChatRequest,
    ChatResponse,
    InterviewQuestion,
    InterviewQuestionsRequest,
    InterviewQuestionsResponse,
    ResumeAnalysisResponse,
)
from app.services.resume_parser import extract_resume_text

router = APIRouter(prefix="/ai", tags=["AI and machine learning"])


@router.post("/analyze-resume", response_model=ResumeAnalysisResponse)
async def analyze_resume(
    file: UploadFile = File(...),
    _: User = Depends(get_current_user),
):
    extension = Path(file.filename or "").suffix.lower()
    if extension not in settings.resume_extension_set:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only PDF and DOCX resumes are supported",
        )

    content = await file.read(settings.max_upload_size_mb * 1024 * 1024 + 1)
    if len(content) > settings.max_upload_size_mb * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Resume must be {settings.max_upload_size_mb} MB or smaller",
        )

    try:
        text = extract_resume_text(file.filename or "resume", content)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc

    try:
        return analyze_resume_text(text)
    except ModelNotTrainedError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)
        ) from exc


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(payload: ChatRequest):
    """AI interview and career coach chat powered by Gemini and O*NET dataset."""
    result = process_ai_chat(
        message=payload.message,
        role_context=payload.role_context,
        interviewer_type=payload.interviewer_type,
        interview_mode=payload.interview_mode,
        skills_context=payload.skills_context,
    )
    return ChatResponse(
        reply=result["reply"],
        interviewer_persona=result.get("interviewer_persona"),
        score=result.get("score"),
        suggestions=result.get("suggestions"),
    )


@router.post("/interview-questions", response_model=InterviewQuestionsResponse)
async def interview_questions_endpoint(payload: InterviewQuestionsRequest):
    """Generate role-tailored technical and behavioral interview questions based on O*NET occupations."""
    questions = get_interview_questions(
        role_title=payload.role_title,
        soc_code=payload.soc_code,
        skills=payload.skills,
    )
    return InterviewQuestionsResponse(
        role_title=payload.role_title,
        soc_code=payload.soc_code,
        questions=[InterviewQuestion(**q) for q in questions],
    )


@router.get("/popular-roles")
async def get_popular_roles():
    """Returns a curated list of top in-demand tech and data roles from the O*NET catalogue."""
    try:
        model = load_model()
        roles = []
        for p in model["profiles"]:
            # Pick Computer and Mathematical or Engineering roles
            if p.get("family_code") in ["15", "17", "11", "13"]:
                roles.append({
                    "soc_code": p["soc_code"],
                    "title": p["title"],
                    "family_code": p["family_code"],
                    "skills": p.get("priority_software_skills", [])[:6],
                })
        return {"roles": roles[:40]}
    except Exception:
        return {"roles": []}
