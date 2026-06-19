from fastapi import HTTPException

from app.config import settings


def normalize_email(email: str) -> str:
    return email.strip().lower()


def validate_allowed_email(email: str) -> str:
    normalized = normalize_email(email)
    domain = settings.allowed_email_domain.lower().lstrip("@")
    suffix = f"@{domain}"
    if not normalized.endswith(suffix):
        raise HTTPException(
            status_code=400,
            detail=f"Only company emails ending with {suffix} are allowed",
        )
    return normalized
