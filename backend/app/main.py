import logging
import os
from pathlib import Path

from sqlalchemy import text
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.config import settings
from app.database import Base, engine
from app.models import AuditLog, Favorite, FloorPlan, Reservation, Resource, User
from app.routers import analytics, audit, auth, floor_plans, reservations, resources, users

logger = logging.getLogger(__name__)

try:
    os.makedirs(settings.upload_dir, exist_ok=True)
except OSError as exc:
    logger.warning("Upload directory unavailable: %s", exc)

app = FastAPI(title="DeskDibs API", version="1.0.0")
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(resources.router, prefix="/api")
app.include_router(reservations.router, prefix="/api")
app.include_router(floor_plans.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(audit.router, prefix="/api")
app.include_router(users.router, prefix="/api")

@app.on_event("startup")
def startup():
    if not settings.database_configured:
        logger.warning("DATABASE_URL is not configured for production")
        return

    try:
        Base.metadata.create_all(bind=engine)
    except Exception as exc:
        logger.exception("Database initialization failed: %s", exc)
        return

    if engine.dialect.name == "sqlite":
        with engine.begin() as conn:
            user_cols = conn.execute(text("PRAGMA table_info(users)")).fetchall()
            user_col_names = {c[1] for c in user_cols}
            if "team_name" not in user_col_names:
                conn.execute(text("ALTER TABLE users ADD COLUMN team_name VARCHAR(150)"))
            if "team_leader_id" not in user_col_names:
                conn.execute(text("ALTER TABLE users ADD COLUMN team_leader_id INTEGER"))

            reservation_cols = conn.execute(text("PRAGMA table_info(reservations)")).fetchall()
            reservation_col_names = {c[1] for c in reservation_cols}
            if "start_time" not in reservation_col_names:
                conn.execute(text("ALTER TABLE reservations ADD COLUMN start_time TIME"))
            if "end_time" not in reservation_col_names:
                conn.execute(text("ALTER TABLE reservations ADD COLUMN end_time TIME"))
            if "password_reset_token_hash" not in user_col_names:
                conn.execute(text("ALTER TABLE users ADD COLUMN password_reset_token_hash VARCHAR(255)"))
            if "password_reset_expires_at" not in user_col_names:
                conn.execute(text("ALTER TABLE users ADD COLUMN password_reset_expires_at DATETIME"))
            if "must_change_password" not in user_col_names:
                conn.execute(text("ALTER TABLE users ADD COLUMN must_change_password BOOLEAN DEFAULT 0"))
            if "profile_image_path" not in user_col_names:
                conn.execute(text("ALTER TABLE users ADD COLUMN profile_image_path VARCHAR(255)"))

            resource_cols = conn.execute(text("PRAGMA table_info(resources)")).fetchall()
            resource_col_names = {c[1] for c in resource_cols}
            if "building" not in resource_col_names:
                conn.execute(text("ALTER TABLE resources ADD COLUMN building VARCHAR(120) DEFAULT 'HQ - Prishtina'"))
                conn.execute(text("UPDATE resources SET building = 'HQ - Prishtina' WHERE building IS NULL"))

            floor_plan_cols = conn.execute(text("PRAGMA table_info(floor_plans)")).fetchall()
            floor_plan_col_names = {c[1] for c in floor_plan_cols}
            if "image_path" in floor_plan_col_names:
                plans = conn.execute(text("SELECT id, image_path FROM floor_plans")).fetchall()
                uploads_dir = Path(settings.upload_dir).resolve()
                for plan_id, image_path in plans:
                    if not image_path:
                        continue
                    path = Path(image_path)
                    if not path.is_absolute():
                        resolved = (uploads_dir / path.name).resolve()
                        conn.execute(
                            text("UPDATE floor_plans SET image_path = :path WHERE id = :id"),
                            {"path": str(resolved), "id": plan_id},
                        )


@app.get("/")
def root():
    return {
        "name": "DeskDibs API",
        "health": "/api/health",
        "docs": "/docs",
    }


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "database_configured": settings.database_configured,
    }