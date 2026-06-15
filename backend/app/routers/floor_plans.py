# Handle reservation creation with conflict detection

import os
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.auth import get_current_user, require_admin
from app.config import settings
from app.database import get_db
from app.models.floor_plan import FloorPlan
from app.models.user import User
from app.schemas.floor_plan import FloorPlanOut

router = APIRouter(prefix="/floor-plans", tags=["floor-plans"])

ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}


@router.get("", response_model=list[FloorPlanOut])
def list_floor_plans(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    plans = db.query(FloorPlan).order_by(FloorPlan.floor).all()
    return [
        FloorPlanOut(
            id=p.id,
            building=p.building,
            floor=p.floor,
            image_url=f"/api/floor-plans/{p.id}/image",
        )
        for p in plans
    ]


@router.post("", response_model=FloorPlanOut)
async def upload_floor_plan(
    floor: str = Form(...),
    building: str = Form("HQ"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Only PNG/JPG images allowed")

    os.makedirs(settings.upload_dir, exist_ok=True)
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(settings.upload_dir, filename)

    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)

    existing = db.query(FloorPlan).filter(FloorPlan.floor == floor).first()
    if existing:
        if os.path.exists(existing.image_path):
            os.remove(existing.image_path)
        existing.image_path = filepath
        existing.building = building
        db.commit()
        db.refresh(existing)
        plan = existing
    else:
        plan = FloorPlan(building=building, floor=floor, image_path=filepath)
        db.add(plan)
        db.commit()
        db.refresh(plan)

    return FloorPlanOut(
        id=plan.id,
        building=plan.building,
        floor=plan.floor,
        image_url=f"/api/floor-plans/{plan.id}/image",
    )


@router.get("/{plan_id}/image")
def get_floor_plan_image(plan_id: int, db: Session = Depends(get_db)):
    plan = db.get(FloorPlan, plan_id)
    if not plan or not os.path.exists(plan.image_path):
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(plan.image_path)