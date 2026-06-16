from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.auth import get_current_user, require_admin
from app.database import get_db
from app.models.user import User
from app.schemas.search import SearchResults, SearchResourceResult, SearchUserResult
from app.schemas import TeamAssignment
from app.schemas.auth import UserOut
from app.models.resource import Resource

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
