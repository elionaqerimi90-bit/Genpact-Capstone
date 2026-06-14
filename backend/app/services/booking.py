from datetime import date, timedelta

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import settings
from app.models.reservation import Reservation, ReservationStatus
from app.models.resource import Resource
from app.models.user import User


def validate_booking_rules(db: Session, user: User, resource_id: int, booking_date: date):
    today = date.today()
    max_date = today + timedelta(days=settings.max_booking_days_ahead)

    if booking_date < today:
        raise HTTPException(status_code=400, detail="Cannot book dates in the past")
    if booking_date > max_date:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot book more than {settings.max_booking_days_ahead} days ahead",
        )

    resource = db.get(Resource, resource_id)
    if not resource or not resource.is_active:
        raise HTTPException(status_code=404, detail="Resource not found or inactive")

    active_count = (
        db.query(Reservation)
        .filter(
            Reservation.user_id == user.id,
            Reservation.status == ReservationStatus.active,
            Reservation.date >= today,
        )
        .count()
    )
    if active_count >= settings.max_active_reservations:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum {settings.max_active_reservations} active reservations allowed",
        )


def create_reservation(
    db: Session, user: User, resource_id: int, booking_date: date
) -> Reservation:
    validate_booking_rules(db, user, resource_id, booking_date)

    existing = (
        db.query(Reservation)
        .filter(
            Reservation.resource_id == resource_id,
            Reservation.date == booking_date,
        )
        .first()
    )
    if existing:
        if existing.status == ReservationStatus.active:
            raise HTTPException(
                status_code=409,
                detail="This resource is already booked for the selected date",
            )
        if existing.status == ReservationStatus.cancelled:
            existing.user_id = user.id
            existing.status = ReservationStatus.active
            db.commit()
            db.refresh(existing)
            return existing
        raise HTTPException(
            status_code=409,
            detail="This resource is already booked for the selected date",
        )

    reservation = Reservation(
        user_id=user.id,
        resource_id=resource_id,
        date=booking_date,
        status=ReservationStatus.active,
    )
    db.add(reservation)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="This resource is already booked for the selected date",
        )
    db.refresh(reservation)
    return reservation


def cancel_reservation(db: Session, reservation: Reservation, user: User, is_admin: bool):
    if reservation.user_id != user.id and not is_admin:
        raise HTTPException(status_code=403, detail="Not allowed to cancel this reservation")
    if reservation.status != ReservationStatus.active:
        raise HTTPException(status_code=400, detail="Reservation is not active")
    reservation.status = ReservationStatus.cancelled
    db.commit()
    db.refresh(reservation)
    return reservation