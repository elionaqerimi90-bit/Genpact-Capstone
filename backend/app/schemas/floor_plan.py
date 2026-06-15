from pydantic import BaseModel


class FloorPlanOut(BaseModel):
    id: int
    building: str
    floor: str
    image_url: str

    model_config = {"from_attributes": True}
