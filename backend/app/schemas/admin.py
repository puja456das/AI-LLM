from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.auth import UserResponse


class CorporateJobCreate(BaseModel):
    title: str = Field(min_length=2, max_length=150)
    company: str = Field(min_length=2, max_length=150)
    location: str = Field(default="Remote", max_length=100)
    salary_range: str = Field(default="Competitive", max_length=100)
    required_skills: str = Field(default="", max_length=500)
    description: str = Field(default="", max_length=2500)


class CorporateJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    company: str
    location: str
    salary_range: str
    required_skills: str
    description: str
    created_at: datetime


class AdminStatsResponse(BaseModel):
    total_users: int
    total_corporate_jobs: int
    model_profiles_count: int
    model_status: str
    recent_users: list[UserResponse]


class ToggleAdminResponse(BaseModel):
    user_id: int
    email: str
    is_admin: bool
    message: str
