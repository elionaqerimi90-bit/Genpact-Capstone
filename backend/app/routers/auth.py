from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.auth import (
    create_access_token,
    get_current_user,
    hash_password,
    require_admin,
    verify_password,
)
from app.database import get_db
from app.models.user import User
from app.schemas.auth import PasswordResetRequest, Token, UserCreate, UserCreateResponse, UserOut
from app.utils.email_validation import normalize_email, validate_allowed_email
from app.services.audit import record_audit
from app.services.notifications import (
    build_account_created_email,
    build_reset_link,
    generate_reset_token,
    generate_temporary_password,
    hash_token,
    reset_token_expiry,
    send_email,
    token_matches,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    email = normalize_email(form_data.username)
    validate_allowed_email(email)
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    return Token(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/refresh", response_model=Token)
def refresh_token(current_user: User = Depends(get_current_user)):
    token = create_access_token({"sub": str(current_user.id), "role": current_user.role.value})
    return Token(access_token=token, user=UserOut.model_validate(current_user))


@router.post("/register", response_model=UserCreateResponse)
def register(
    data: UserCreate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    email = normalize_email(data.email)
    validate_allowed_email(email)
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    temporary_password = generate_temporary_password()
    reset_token = generate_reset_token()
    user = User(
        email=email,
        hashed_password=hash_password(temporary_password),
        full_name=data.full_name,
        role=data.role,
        job_title=data.job_title,
        team_name=data.team_name,
        team_leader_id=data.team_leader_id,
        password_reset_token_hash=hash_token(reset_token),
        password_reset_expires_at=reset_token_expiry(),
        must_change_password=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    try:
        send_email(
            user.email,
            "Your DeskDibs account is ready",
            build_account_created_email(
                user.full_name,
                user.email,
                temporary_password,
                build_reset_link(reset_token),
            ),
        )
    except Exception as exc:
        print(f"[mail:error] account_created user_id={user.id} email={user.email}: {exc}")

    record_audit(
        db,
        admin_user,
        "create_user",
        "user",
        user.id,
        f"Created {user.email} as {user.role.value}",
    )
    db.commit()

    return UserCreateResponse.model_validate(user).model_copy(
        update={"temporary_password": temporary_password}
    )


@router.post("/reset-password")
def reset_password(data: PasswordResetRequest, db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    candidates = (
        db.query(User)
        .filter(User.password_reset_token_hash.isnot(None))
        .filter(User.password_reset_expires_at.isnot(None))
        .all()
    )
    target_user = next(
        (item for item in candidates if token_matches(data.token, item.password_reset_token_hash)),
        None,
    )
    if not target_user or not target_user.password_reset_expires_at:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")
    if target_user.password_reset_expires_at < now:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    target_user.hashed_password = hash_password(data.password)
    target_user.password_reset_token_hash = None
    target_user.password_reset_expires_at = None
    target_user.must_change_password = False
    db.commit()
    return {"detail": "Password updated"}
