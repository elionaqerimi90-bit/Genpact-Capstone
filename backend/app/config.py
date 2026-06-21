import os
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings


def _default_upload_dir() -> str:
    if os.getenv("VERCEL"):
        return "/tmp/deskdibs-uploads"
    return str(Path(__file__).resolve().parent.parent / "uploads")


class Settings(BaseSettings):
    database_url: str = "postgresql://deskdibs:deskdibs@localhost:5432/deskdibs"
    secret_key: str = "deskdibs-dev-secret-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24
    upload_dir: str = _default_upload_dir()
    api_base_url: str | None = None
    cors_origins: str = "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173"
    initial_admin_email: str | None = None
    initial_admin_password: str | None = None
    initial_admin_name: str = "DeskDibs Admin"
    max_booking_days_ahead: int = 14
    max_active_reservations: int = 5
    frontend_base_url: str | None = None
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_from_email: str | None = None
    smtp_use_tls: bool = True
    resend_api_key: str | None = None
    resend_from_email: str | None = None
    admin_notification_email: str | None = None
    allowed_email_domain: str = "genpact.com"

    class Config:
        env_file = ".env"

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        if not isinstance(value, str):
            return value
        cleaned = value.replace("&channel_binding=require", "").replace("channel_binding=require&", "")
        return cleaned.rstrip("&?")

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def database_configured(self) -> bool:
        return not self.database_url.startswith("postgresql://deskdibs:deskdibs@localhost")


settings = Settings()

