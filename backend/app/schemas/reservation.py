from datetime import date

from pydantic import BaseModel

from app.models.reservation import ReservationStatus
from app.schemas.resource import ResourceOut


class ReservationCreate(BaseModel):
    resource_id: int
    date: date


class ReservationOut(BaseModel):
    id: int
    user_id: int
    resource_id: int
    date: date
    status: ReservationStatus
    resource: ResourceOut | None = None
    user_name: str | None = None

    model_config = {"from_attributes": True}
