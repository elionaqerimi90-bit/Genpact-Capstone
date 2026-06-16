from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user, require_admin
from app.database import get_db
from app.models.reservation import Reservation, ReservationStatus
from app.models.user import User, UserRole
from app.schemas.reservation import ReservationCreate, ReservationOut, ReservationUpdate
from app.schemas.resource import ResourceOut
from app.services.booking import cancel_reservation, create_reservation, update_reservation

router = APIRouter(prefix="/reservations", tags=["reservations"])


def _to_out(reservation: Reservation) -> ReservationOut:
    out = ReservationOut.model_validate(reservation)
    if reservation.resource:
        out.resource = ResourceOut.model_validate(reservation.resource)
    if reservation.user:
        out.user_name = reservation.user.full_name
    return out


@router.get("/me", response_model=list[ReservationOut])
def my_reservations(
    status: ReservationStatus | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        db.query(Reservation)
        .options(joinedload(Reservation.resource), joinedload(Reservation.user))
        .filter(Reservation.user_id == current_user.id)
        .order_by(Reservation.date.desc())
    )
    if status:
        query = query.filter(Reservation.status == status)
    return [_to_out(r) for r in query.all()]


@router.get("", response_model=list[ReservationOut])
def all_reservations(
    booking_date: date | None = Query(None, alias="date"),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    query = (
        db.query(Reservation)
        .options(joinedload(Reservation.resource), joinedload(Reservation.user))
        .order_by(Reservation.date.desc())
    )
    if booking_date:
        query = query.filter(Reservation.date == booking_date)
    return [_to_out(r) for r in query.all()]


@router.post("", response_model=ReservationOut, status_code=201)
def book(
    data: ReservationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    reservation = create_reservation(
        db,
        current_user,
        data.resource_id,
        data.date,
        data.start_time,
        data.end_time,
    )
    reservation = (
        db.query(Reservation)
        .options(joinedload(Reservation.resource), joinedload(Reservation.user))
        .filter(Reservation.id == reservation.id)
        .first()
    )
    return _to_out(reservation)


@router.delete("/{reservation_id}", response_model=ReservationOut)
def cancel(
    reservation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    reservation = (
        db.query(Reservation)
        .options(joinedload(Reservation.resource), joinedload(Reservation.user))
        .filter(Reservation.id == reservation_id)
        .first()
    )
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    is_admin = current_user.role == UserRole.admin
    reservation = cancel_reservation(db, reservation, current_user, is_admin)
    return _to_out(reservation)


@router.put("/{reservation_id}", response_model=ReservationOut)
def admin_update_reservation(
    reservation_id: int,
    data: ReservationUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    reservation = (
        db.query(Reservation)
        .options(joinedload(Reservation.resource), joinedload(Reservation.user))
        .filter(Reservation.id == reservation_id)
        .first()
    )
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    reservation = update_reservation(
        db,
        reservation,
        data.resource_id,
        data.date,
        data.start_time,
        data.end_time,
    )
    reservation = (
        db.query(Reservation)
        .options(joinedload(Reservation.resource), joinedload(Reservation.user))
        .filter(Reservation.id == reservation.id)
        .first()
    )
    return _to_out(reservation)
