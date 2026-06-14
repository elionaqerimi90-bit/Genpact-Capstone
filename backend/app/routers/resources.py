from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.auth import get_current_user, require_admin
from app.database import get_db
from app.models.reservation import Reservation, ReservationStatus
from app.models.resource import Resource, ResourceType
from app.models.user import User
from app.schemas.resource import (
    ResourceCreate,
    ResourceOut,
    ResourcePositionUpdate,
    ResourceUpdate,
)

router = APIRouter(prefix="/resources", tags=["resources"])


def _enrich_resource(
    resource: Resource,
    booking_date: date | None,
    current_user: User,
    db: Session,
) -> ResourceOut:
    out = ResourceOut.model_validate(resource)
    out.is_available = True
    out.is_mine = False
    out.reserved_by = None

    if booking_date:
        reservation = (
            db.query(Reservation)
            .filter(
                Reservation.resource_id == resource.id,
                Reservation.date == booking_date,
                Reservation.status == ReservationStatus.active,
            )
            .first()
        )
        if reservation:
            out.is_available = False
            if reservation.user_id == current_user.id:
                out.is_mine = True
            else:
                reserver = db.get(User, reservation.user_id)
                out.reserved_by = reserver.full_name if reserver else "Reserved"
    return out


@router.get("", response_model=list[ResourceOut])
def list_resources(
    booking_date: date | None = Query(None, alias="date"),
    floor: str | None = None,
    zone: str | None = None,
    type: ResourceType | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Resource).filter(Resource.is_active.is_(True))
    if floor:
        query = query.filter(Resource.floor == floor)
    if zone:
        query = query.filter(Resource.zone == zone)
    if type:
        query = query.filter(Resource.type == type)
    resources = query.order_by(Resource.floor, Resource.name).all()
    return [_enrich_resource(r, booking_date, current_user, db) for r in resources]


@router.get("/floors")
def list_floors(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    floors = db.query(Resource.floor).distinct().order_by(Resource.floor).all()
    return [f[0] for f in floors]


@router.get("/zones")
def list_zones(
    floor: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = db.query(Resource.zone).filter(Resource.is_active.is_(True))
    if floor:
        query = query.filter(Resource.floor == floor)
    zones = query.distinct().order_by(Resource.zone).all()
    return [z[0] for z in zones]


@router.post("", response_model=ResourceOut)
def create_resource(
    data: ResourceCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    resource = Resource(**data.model_dump())
    db.add(resource)
    db.commit()
    db.refresh(resource)
    return ResourceOut.model_validate(resource)


@router.put("/{resource_id}", response_model=ResourceOut)
def update_resource(
    resource_id: int,
    data: ResourceUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    resource = db.get(Resource, resource_id)
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(resource, key, value)
    db.commit()
    db.refresh(resource)
    return ResourceOut.model_validate(resource)


@router.patch("/{resource_id}/position", response_model=ResourceOut)
def update_position(
    resource_id: int,
    data: ResourcePositionUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    resource = db.get(Resource, resource_id)
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    resource.floor_plan_x = data.floor_plan_x
    resource.floor_plan_y = data.floor_plan_y
    db.commit()
    db.refresh(resource)
    return ResourceOut.model_validate(resource)


@router.delete("/{resource_id}")
def delete_resource(
    resource_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    resource = db.get(Resource, resource_id)
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")

    active_reservations = (
        db.query(Reservation)
        .filter(
            Reservation.resource_id == resource_id,
            Reservation.status == ReservationStatus.active,
        )
        .all()
    )
    for reservation in active_reservations:
        reservation.status = ReservationStatus.resource_removed

    resource.is_active = False
    db.commit()
    return {"detail": "Resource removed", "affected_reservations": len(active_reservations)}
