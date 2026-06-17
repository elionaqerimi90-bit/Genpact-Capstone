from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.auth import get_current_user, require_admin
from app.database import get_db
from app.models.user import User
from app.schemas.search import SearchResults, SearchResourceResult, SearchUserResult
from app.schemas import TeamAssignment
from app.schemas.auth import UserOut, UserUpdate
from app.models.resource import Resource
from app.models.reservation import Reservation
from app.models.favorite import Favorite
from app.models.user import UserRole

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/search", response_model=SearchResults)
def search_workspace(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    term = f"%{q.strip()}%"
    resources = (
        db.query(Resource)
        .filter(
            Resource.is_active.is_(True),
            (
                Resource.name.ilike(term)
                | Resource.floor.ilike(term)
                | Resource.zone.ilike(term)
                | Resource.type.ilike(term)
            ),
        )
        .order_by(Resource.name)
        .limit(8)
        .all()
    )
    users = (
        db.query(User)
        .filter(
            User.full_name.ilike(term)
            | User.email.ilike(term)
            | User.job_title.ilike(term)
            | User.team_name.ilike(term)
        )
        .order_by(User.full_name)
        .limit(8)
        .all()
    )
    return SearchResults(
        resources=[
            SearchResourceResult(
                id=resource.id,
                name=resource.name,
                type=resource.type.value,
                floor=resource.floor,
                zone=resource.zone,
            )
            for resource in resources
        ],
        users=[
            SearchUserResult(
                id=user.id,
                full_name=user.full_name,
                email=user.email,
                role=user.role.value,
                job_title=user.job_title,
                team_name=user.team_name,
            )
            for user in users
        ],
    )


@router.get("", response_model=list[UserOut])
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return db.query(User).order_by(User.full_name).all()


@router.get("/team-members", response_model=list[UserOut])
def list_team_members(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != UserRole.team_leader:
        raise HTTPException(status_code=403, detail="Team leader access required")
    teammates = (
        db.query(User)
        .filter(User.team_leader_id == current_user.id)
        .order_by(User.full_name)
        .all()
    )
    return teammates


@router.post("/{leader_id}/team", response_model=UserOut)
def assign_team_members(
    leader_id: int,
    data: TeamAssignment,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    leader = db.get(User, leader_id)
    if not leader:
        raise HTTPException(status_code=404, detail="User not found")
    for teammate in db.query(User).filter(User.id.in_(data.teammate_ids)).all():
        teammate.team_leader_id = leader.id
    db.commit()
    db.refresh(leader)
    return leader


@router.get("/me", response_model=UserOut)
def get_my_profile(
    current_user: User = Depends(get_current_user),
):
    return current_user


@router.put("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    data: UserUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if data.full_name is not None:
        user.full_name = data.full_name
    if data.role is not None:
        user.role = data.role
    if data.job_title is not None:
        user.job_title = data.job_title
    if data.team_name is not None:
        user.team_name = data.team_name
    if data.team_leader_id is not None:
        leader = db.get(User, data.team_leader_id)
        if not leader or leader.role != UserRole.team_leader:
            raise HTTPException(status_code=400, detail="Invalid team leader")
        user.team_leader_id = data.team_leader_id

    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")

    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.query(User).filter(User.team_leader_id == user.id).update(
        {User.team_leader_id: None}, synchronize_session=False
    )
    db.query(Reservation).filter(Reservation.user_id == user.id).delete(
        synchronize_session=False
    )
    db.query(Favorite).filter(Favorite.user_id == user.id).delete(
        synchronize_session=False
    )
    db.delete(user)
    db.commit()
    return {"detail": "User deleted"}
