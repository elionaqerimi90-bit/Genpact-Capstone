from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://deskdibs:deskdibs@localhost:5432/deskdibs"
    secret_key: str = "deskdibs-dev-secret-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24
    upload_dir: str = "uploads"
    max_booking_days_ahead: int = 14
    max_active_reservations: int = 5

    class Config:
        env_file = ".env"


settings = Settings()

