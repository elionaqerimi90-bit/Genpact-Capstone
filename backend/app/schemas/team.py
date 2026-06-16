from pydantic import BaseModel


class TeamAssignment(BaseModel):
    teammate_ids: list[int]
