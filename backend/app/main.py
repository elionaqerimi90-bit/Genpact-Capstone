from pathlib import Path
import os

from sqlalchemy import inspect, text
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.auth import hash_password
from app.config import settings
from app.database import Base, engine
from app.models import Favorite, FloorPlan, Reservation, Resource, User
from app.models.user import UserRole
from app.routers import analytics, auth, floor_plans, reservations, resources, users

os.makedirs(settings.upload_dir, exist_ok=True)

app = FastAPI(title="DeskDibs API", version="1.0.0")
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(resources.router, prefix="/api")
app.include_router(reservations.router, prefix="/api")
app.include_router(floor_plans.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(users.router, prefix="/api")


def _column_names(conn, table_name: str) -> set[str]:
    inspector = inspect(conn)
    return {column["name"] for column in inspector.get_columns(table_name)}


def _add_column_if_missing(conn, table_name: str, column_name: str, column_definition: str):
    if column_name not in _column_names(conn, table_name):
        conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_definition}"))


def _ensure_database_schema():
    Base.metadata.create_all(bind=engine)

    dialect = engine.dialect.name
    is_sqlite = dialect == "sqlite"
    with engine.begin() as conn:
        _add_column_if_missing(conn, "users", "team_name", "VARCHAR(150)")
        _add_column_if_missing(conn, "users", "team_leader_id", "INTEGER")
        _add_column_if_missing(conn, "users", "password_reset_token_hash", "VARCHAR(255)")
        _add_column_if_missing(
            conn,
            "users",
            "password_reset_expires_at",
            "DATETIME" if is_sqlite else "TIMESTAMP WITH TIME ZONE",
        )
        _add_column_if_missing(
            conn,
            "users",
            "must_change_password",
            "BOOLEAN DEFAULT 0" if is_sqlite else "BOOLEAN DEFAULT false",
        )
        _add_column_if_missing(conn, "users", "profile_image_path", "VARCHAR(255)")

        _add_column_if_missing(conn, "reservations", "start_time", "TIME")
        _add_column_if_missing(conn, "reservations", "end_time", "TIME")

        _add_column_if_missing(
            conn,
            "resources",
            "building",
            "VARCHAR(120) DEFAULT 'HQ - Prishtina'",
        )
        conn.execute(text("UPDATE resources SET building = 'HQ - Prishtina' WHERE building IS NULL"))

        _add_column_if_missing(conn, "floor_plans", "name", "VARCHAR(150)")
        conn.execute(text("UPDATE floor_plans SET name = 'Floor ' || floor WHERE name IS NULL"))

        if is_sqlite and "image_path" in _column_names(conn, "floor_plans"):
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


def _ensure_initial_admin():
    if not settings.initial_admin_email or not settings.initial_admin_password:
        return

    from app.database import SessionLocal

    email = settings.initial_admin_email.strip().lower()
    with SessionLocal() as db:
        user = db.query(User).filter(User.email == email).first()
        if user:
            if user.role != UserRole.admin:
                user.role = UserRole.admin
                db.commit()
            return

        db.add(
            User(
                email=email,
                hashed_password=hash_password(settings.initial_admin_password),
                full_name=settings.initial_admin_name,
                role=UserRole.admin,
                job_title="Office Manager",
            )
        )
        db.commit()


@app.on_event("startup")
def startup():
    _ensure_database_schema()
    _ensure_initial_admin()


@app.get("/api/health")
def health():
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return {"status": "ok", "database": "ok", "dialect": engine.dialect.name}
