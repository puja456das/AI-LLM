from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, text

from app.api.routes.admin import router as admin_router
from app.api.routes.ai import router as ai_router
from app.api.routes.auth import router as auth_router
from app.core.config import settings
from app.core.security import hash_password
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models import CorporateJob, User  # noqa: F401 - register model metadata


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Ensure tables exist with the latest model definition.
    Base.metadata.create_all(bind=engine)

    # Database schema migration for missing columns
    with engine.begin() as conn:
        try:
            if settings.database_url.startswith("sqlite"):
                cols = [r[1] for r in conn.execute(text("PRAGMA table_info(users)")).fetchall()]
                if "is_admin" not in cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0;"))
            elif settings.database_url.startswith("postgresql"):
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(120);"))
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;"))
        except Exception:
            pass

    # Auto-seed default Administrator account if it does not exist
    try:
        with SessionLocal() as db:
            admin_user = db.scalar(select(User).where(User.email == "admin@careerpilot.ai"))
            if not admin_user:
                new_admin = User(
                    email="admin@careerpilot.ai",
                    full_name="Platform Administrator",
                    password_hash=hash_password("AdminPass123!"),
                    is_admin=True,
                )
                db.add(new_admin)
                db.commit()
            elif not admin_user.is_admin:
                admin_user.is_admin = True
                db.commit()
    except Exception:
        pass

    yield


app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_router, prefix=settings.api_v1_prefix)
app.include_router(ai_router, prefix=settings.api_v1_prefix)
app.include_router(admin_router, prefix=settings.api_v1_prefix)


@app.get(f"{settings.api_v1_prefix}/health", tags=["health"])
def health():
    return {"status": "ok"}
