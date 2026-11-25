from collections.abc import Generator
from io import BytesIO

import pytest
from docx import Document
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.routes.ai import router as ai_router
from app.api.routes.auth import router as auth_router
from app.db.base import Base
from app.db.session import get_db
from app.models import User  # noqa: F401


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    test_session = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(bind=engine)

    def override_get_db() -> Generator[Session, None, None]:
        db = test_session()
        try:
            yield db
        finally:
            db.close()

    app = FastAPI()
    app.include_router(auth_router, prefix="/api/v1")
    app.include_router(ai_router, prefix="/api/v1")
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


def _token(client: TestClient) -> str:
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "ml@example.com", "full_name": "ML User", "password": "StrongPass123!"},
    )
    assert response.status_code == 201
    return response.json()["access_token"]


def _docx_resume() -> bytes:
    document = Document()
    document.add_heading("Software Engineer", 0)
    document.add_paragraph(
        "Built Python and Java services with FastAPI, Django, SQL, PostgreSQL, Docker, Git, "
        "Amazon Web Services and React. Developed APIs, automated tests, and deployed reliable applications."
    )
    stream = BytesIO()
    document.save(stream)
    return stream.getvalue()


def test_trained_model_analyzes_authenticated_docx_resume(client: TestClient) -> None:
    token = _token(client)
    response = client.post(
        "/api/v1/ai/analyze-resume",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("resume.docx", _docx_resume(), "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
    )
    assert response.status_code == 200, response.text
    result = response.json()
    assert result["detected_family"]["name"]
    assert len(result["recommendations"]) == 5
    assert result["model_info"]["training_examples"] == 15030
    assert 0 <= result["model_info"]["f1_macro"] <= 1
    assert "not a probability" in result["notice"]


def test_resume_analysis_requires_auth_and_supported_file(client: TestClient) -> None:
    assert client.post("/api/v1/ai/analyze-resume", files={"file": ("resume.txt", b"resume", "text/plain")}).status_code == 401
    token = _token(client)
    response = client.post(
        "/api/v1/ai/analyze-resume",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("resume.txt", b"a long enough text to satisfy no validation on unsupported file", "text/plain")},
    )
    assert response.status_code == 415
