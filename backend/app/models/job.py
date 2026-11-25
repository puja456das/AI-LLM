from datetime import datetime, timezone

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class CorporateJob(Base):
    __tablename__ = "corporate_jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    company: Mapped[str] = mapped_column(String(150), nullable=False)
    location: Mapped[str] = mapped_column(String(100), default="Remote", nullable=False)
    salary_range: Mapped[str] = mapped_column(String(100), default="Competitive", nullable=False)
    required_skills: Mapped[str] = mapped_column(String(500), default="", nullable=False)
    description: Mapped[str] = mapped_column(String(2500), default="", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
