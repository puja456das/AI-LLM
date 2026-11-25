from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.routes.auth import get_current_admin_user, get_current_user
from app.db.session import get_db
from app.ml.service import load_model
from app.models.job import CorporateJob
from app.models.user import User
from app.schemas.admin import (
    AdminStatsResponse,
    CorporateJobCreate,
    CorporateJobResponse,
    ToggleAdminResponse,
)
from app.schemas.auth import UserResponse

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/stats", response_model=AdminStatsResponse)
def get_admin_stats(
    _: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    total_users = db.scalar(select(func.count(User.id))) or 0
    total_jobs = db.scalar(select(func.count(CorporateJob.id))) or 0

    model_profiles_count = 0
    model_status = "Model Offline"
    try:
        model = load_model()
        model_profiles_count = len(model.get("profiles", []))
        model_status = f"Online · {model_profiles_count} O*NET Occupational Profiles"
    except Exception:
        model_status = "Fallback mode"

    recent_users = db.scalars(
        select(User).order_by(User.created_at.desc()).limit(10)
    ).all()

    return AdminStatsResponse(
        total_users=total_users,
        total_corporate_jobs=total_jobs,
        model_profiles_count=model_profiles_count,
        model_status=model_status,
        recent_users=[UserResponse.model_validate(u) for u in recent_users],
    )


@router.get("/users", response_model=list[UserResponse])
def get_all_users(
    _: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    users = db.scalars(select(User).order_by(User.id.asc())).all()
    return [UserResponse.model_validate(u) for u in users]


@router.post("/users/{user_id}/toggle-admin", response_model=ToggleAdminResponse)
def toggle_user_admin(
    user_id: int,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    if user.id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot remove admin privileges from your own account.",
        )
    user.is_admin = not user.is_admin
    db.commit()
    db.refresh(user)

    state_str = "granted" if user.is_admin else "revoked"
    return ToggleAdminResponse(
        user_id=user.id,
        email=user.email,
        is_admin=user.is_admin,
        message=f"Administrator privileges {state_str} for {user.email}.",
    )


@router.get("/jobs", response_model=list[CorporateJobResponse])
def get_corporate_jobs_admin(
    _: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    jobs = db.scalars(select(CorporateJob).order_by(CorporateJob.created_at.desc())).all()
    return [CorporateJobResponse.model_validate(j) for j in jobs]


@router.post("/jobs", response_model=CorporateJobResponse, status_code=status.HTTP_201_CREATED)
def create_corporate_job(
    payload: CorporateJobCreate,
    _: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    job = CorporateJob(
        title=payload.title.strip(),
        company=payload.company.strip(),
        location=payload.location.strip() or "Remote",
        salary_range=payload.salary_range.strip() or "Competitive",
        required_skills=payload.required_skills.strip(),
        description=payload.description.strip(),
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return CorporateJobResponse.model_validate(job)


@router.delete("/jobs/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_corporate_job(
    job_id: int,
    _: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    job = db.get(CorporateJob, job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Job opening not found"
        )
    db.delete(job)
    db.commit()
    return None


@router.get("/corporate-openings", response_model=list[CorporateJobResponse])
def get_public_corporate_openings(
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Authenticated endpoint for candidates to browse corporate jobs posted by recruiters/admins."""
    jobs = db.scalars(select(CorporateJob).order_by(CorporateJob.created_at.desc())).all()
    return [CorporateJobResponse.model_validate(j) for j in jobs]
