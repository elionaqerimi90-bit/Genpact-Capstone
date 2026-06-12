from pydantic import BaseModel, EmailStr
from app.models.user import UserRole


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: UserRole = UserRole.employee
    job_title: str | None = None


class UserOut(BaseModel):

    id: int
    email: str
    full_name: str
    role: UserRole
    job_title: str | None = None

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
