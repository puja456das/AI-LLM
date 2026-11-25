from collections.abc import Generator

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.routes.auth import router
from app.db.base import Base
from app.db.session import get_db
from app.models import User  # noqa: F401


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(bind=engine)

    def override_get_db() -> Generator[Session, None, None]:
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app = FastAPI()
    app.include_router(router, prefix="/api/v1")
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


def test_register_login_and_read_profile(client: TestClient) -> None:
    registered = client.post(
        "/api/v1/auth/register",
        json={"email": "Dev@Example.com", "full_name": "Dev User", "password": "StrongPass123!"},
    )
    assert registered.status_code == 201
    body = registered.json()
    assert body["user"]["email"] == "dev@example.com"
    assert "password_hash" not in body["user"]

    logged_in = client.post(
        "/api/v1/auth/login",
        data={"username": "dev@example.com", "password": "StrongPass123!"},
    )
    assert logged_in.status_code == 200
    profile = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {logged_in.json()['access_token']}"})
    assert profile.status_code == 200
    assert profile.json()["full_name"] == "Dev User"


def test_duplicate_email_and_invalid_login(client: TestClient) -> None:
    payload = {"email": "dev@example.com", "full_name": "Dev User", "password": "StrongPass123!"}
    assert client.post("/api/v1/auth/register", json=payload).status_code == 201
    assert client.post("/api/v1/auth/register", json=payload).status_code == 409
    assert client.post("/api/v1/auth/login", data={"username": "dev@example.com", "password": "wrong-password"}).status_code == 401


def test_profile_requires_a_valid_token(client: TestClient) -> None:
    assert client.get("/api/v1/auth/me").status_code == 401
    assert client.get("/api/v1/auth/me", headers={"Authorization": "Bearer malformed"}).status_code == 401
