from collections import defaultdict
from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user, require_manager_or_admin
from app.database import get_db
from app.models.reservation import Reservation, ReservationStatus
from app.models.resource import Resource, ResourceType
from app.models.user import User, UserRole
from app.schemas.analytics import (
    AnalyticsDashboard,
    DailyOccupancy,
    DayCount,
    DeskUsage,
    FloorUtilization,
)

router = APIRouter(prefix="/analytics", tags=["analytics"])

DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


@router.get("/dashboard", response_model=AnalyticsDashboard)
def dashboard(
    db: Session = Depends(get_db),
    _: User = Depends(require_manager_or_admin),
):

    total_desks = (
        db.query(Resource)
        .filter(Resource.is_active.is_(True), Resource.type == ResourceType.desk)
        .count()
    )
    total_rooms = (
        db.query(Resource)
        .filter(Resource.is_active.is_(True), Resource.type == ResourceType.room)
        .count()
    )
    today = date.today()
    active_reservations = (
        db.query(Reservation)
        .filter(
            Reservation.status == ReservationStatus.active,
            Reservation.date >= today,
        )
        .count()
    )

    occupancy_trend = []
    for i in range(29, -1, -1):
        d = today - timedelta(days=i)
        booked = (
            db.query(Reservation)
            .join(Resource)
            .filter(
                Reservation.date == d,
                Reservation.status == ReservationStatus.active,
                Resource.type == ResourceType.desk,
                Resource.is_active.is_(True),
            )
            .count()
        )
        occ = (booked / total_desks * 100) if total_desks else 0
        occupancy_trend.append(
            DailyOccupancy(
                date=d.isoformat(),
                occupancy=round(occ, 1),
                booked=booked,
                total=total_desks,
            )
        )

    today_occ = occupancy_trend[-1].occupancy if occupancy_trend else 0

    day_counts: dict[int, int] = defaultdict(int)
    thirty_days_ago = today - timedelta(days=30)
    reservations_30d = (
        db.query(Reservation)
        .filter(
            Reservation.date >= thirty_days_ago,
            Reservation.status == ReservationStatus.active,
        )
        .all()
    )
    for r in reservations_30d:
        day_counts[r.date.weekday()] += 1
    busiest_days = [
        DayCount(day=DAY_NAMES[i], count=day_counts.get(i, 0)) for i in range(7)
    ]

    floor_stats: dict[str, list[int]] = defaultdict(lambda: [0, 0])
    desks = (
        db.query(Resource)
        .filter(Resource.is_active.is_(True), Resource.type == ResourceType.desk)
        .all()
    )
    for desk in desks:
        floor_stats[desk.floor][1] += 1

    desk_bookings = (
        db.query(Resource.name, func.count(Reservation.id))
        .join(Reservation, Reservation.resource_id == Resource.id)
        .filter(
            Reservation.date >= thirty_days_ago,
            Reservation.status == ReservationStatus.active,
            Resource.type == ResourceType.desk,
        )
        .group_by(Resource.id, Resource.name)
        .all()
    )

    booking_map = {name: count for name, count in desk_bookings}
    max_bookings = max(booking_map.values()) if booking_map else 1

    for desk in desks:
        floor_stats[desk.floor][0] += booking_map.get(desk.name, 0)

    floor_utilization = [
        FloorUtilization(
            floor=floor,
            utilization=round((stats[0] / (stats[1] * 30)) * 100, 1) if stats[1] else 0,
        )
        for floor, stats in sorted(floor_stats.items())
    ]

    sorted_desks = sorted(desk_bookings, key=lambda x: x[1], reverse=True)
    most_used = [
        DeskUsage(
            name=name,
            bookings=count,
            utilization=round(count / 30 * 100 / max(max_bookings, 1) * 100, 1),
        )
        for name, count in sorted_desks[:5]
    ]
    least_used = [
        DeskUsage(
            name=name,
            bookings=count,
            utilization=round(count / 30 * 100 / max(max_bookings, 1) * 100, 1),
        )
        for name, count in sorted(desk_bookings, key=lambda x: x[1])[:5]
    ]

    recent = (
        db.query(Reservation)
        .options(joinedload(Reservation.resource), joinedload(Reservation.user))
        .order_by(Reservation.id.desc())
        .limit(8)
        .all()
    )
    recent_activity = [
        f"{r.user.full_name} booked {r.resource.name} for {r.date} ({r.status.value})"
        for r in recent
    ]

    return AnalyticsDashboard(
        total_desks=total_desks,
        total_rooms=total_rooms,
        active_reservations=active_reservations,
        occupancy_rate=today_occ,
        occupancy_trend=occupancy_trend,
        busiest_days=busiest_days,
        floor_utilization=floor_utilization,
        most_used_desks=most_used,
        least_used_desks=least_used,
        recent_activity=recent_activity,
    )


@router.get("/employee-summary")
def employee_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = date.today()
    total_desks = (
        db.query(Resource)
        .filter(Resource.is_active.is_(True), Resource.type == ResourceType.desk)
        .count()
    )
    total_rooms = (
        db.query(Resource)
        .filter(Resource.is_active.is_(True), Resource.type == ResourceType.room)
        .count()
    )
    booked_today = (
        db.query(Reservation)
        .join(Resource)
        .filter(
            Reservation.date == today,
            Reservation.status == ReservationStatus.active,
        )
        .count()
    )
    my_count = (
        db.query(Reservation)
        .filter(
            Reservation.user_id == current_user.id,
            Reservation.status == ReservationStatus.active,
            Reservation.date >= today,
        )
        .count()
    )
    available_desks = total_desks - (
        db.query(Reservation)
        .join(Resource)
        .filter(
            Reservation.date == today,
            Reservation.status == ReservationStatus.active,
            Resource.type == ResourceType.desk,
        )
        .count()
    )
    available_rooms = total_rooms - (
        db.query(Reservation)
        .join(Resource)
        .filter(
            Reservation.date == today,
            Reservation.status == ReservationStatus.active,
            Resource.type == ResourceType.room,
        )
        .count()
    )
    occupancy = (booked_today / (total_desks + total_rooms) * 100) if (total_desks + total_rooms) else 0

    trend = []
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        booked = (
            db.query(Reservation)
            .filter(
                Reservation.date == d,
                Reservation.status == ReservationStatus.active,
            )
            .count()
        )
        trend.append({"date": d.isoformat(), "booked": booked})

    floor_overview = []
    floors = db.query(Resource.floor).distinct().all()
    for (floor,) in floors:
        floor_desks = (
            db.query(Resource)
            .filter(
                Resource.floor == floor,
                Resource.is_active.is_(True),
                Resource.type == ResourceType.desk,
            )
            .count()
        )
        floor_booked = (
            db.query(Reservation)
            .join(Resource)
            .filter(
                Resource.floor == floor,
                Reservation.date == today,
                Reservation.status == ReservationStatus.active,
                Resource.type == ResourceType.desk,
            )
            .count()
        )
        floor_overview.append({
            "floor": floor,
            "occupancy": round(floor_booked / floor_desks * 100, 1) if floor_desks else 0,
        })

    return {
        "occupancy": round(occupancy, 1),
        "available_desks": available_desks,
        "available_rooms": available_rooms,
        "my_reservations": my_count,
        "trend": trend,
        "floor_overview": floor_overview,
    }
