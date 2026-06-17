# Handle reservation creation with conflict detection

import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, RedirectResponse
from sqlalchemy.orm import Session

try:
    from vercel.blob import AsyncBlobClient
except ModuleNotFoundError:
    AsyncBlobClient = None

from app.auth import get_current_user, require_admin
from app.config import settings
from app.database import get_db
from app.models.floor_plan import FloorPlan
from app.models.resource import Resource
from app.models.user import User
from app.schemas.floor_plan import FloorPlanOut, FloorPlanUpdate
from app.utils.urls import api_url

router = APIRouter(prefix="/floor-plans", tags=["floor-plans"])

ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}


def _is_blob_url(value: str) -> bool:
    return value.startswith("http://") or value.startswith("https://")


def _resolve_floor_plan(db: Session, plan_key: str) -> FloorPlan | None:
    plan = None
    if plan_key.isdigit():
        plan = db.get(FloorPlan, int(plan_key))
    if not plan:
        plan = db.query(FloorPlan).filter(FloorPlan.floor == plan_key).first()
    return plan


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
            image_url=api_url(f"/api/floor-plans/{p.id}/image"),
        )
        for p in plans
    ]


@router.post("", response_model=FloorPlanOut)
async def upload_floor_plan(
    floor: str = Form(...),
    building: str = Form("HQ - Prishtina"),
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
    blob_url = None
    if os.getenv("BLOB_READ_WRITE_TOKEN") and AsyncBlobClient is not None:
        client = AsyncBlobClient()
        blob = await client.put(
            f"floor-plans/{filename}",
            content,
            access="public",
            add_random_suffix=True,
        )
        blob_url = blob.url
    else:
        with open(filepath, "wb") as f:
            f.write(content)

    existing = db.query(FloorPlan).filter(FloorPlan.floor == floor).first()
    if existing:
        if existing.image_path and not _is_blob_url(existing.image_path):
            if os.path.exists(existing.image_path):
                os.remove(existing.image_path)
        existing.image_path = blob_url or filepath
        existing.building = building
        db.commit()
        db.refresh(existing)
        plan = existing
    else:
        plan = FloorPlan(building=building, floor=floor, image_path=blob_url or filepath)
        db.add(plan)
        db.commit()
        db.refresh(plan)

    return FloorPlanOut(
        id=plan.id,
        building=plan.building,
        floor=plan.floor,
        image_url=api_url(f"/api/floor-plans/{plan.id}/image"),
    )


@router.get("/{plan_id}/image")
def get_floor_plan_image(plan_id: int, db: Session = Depends(get_db)):
    plan = db.get(FloorPlan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Image not found")
    if _is_blob_url(plan.image_path):
        return RedirectResponse(plan.image_path)
    image_path = Path(plan.image_path)
    if not image_path.is_absolute():
        image_path = Path(settings.upload_dir).resolve() / image_path.name
    if not image_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(str(image_path))


@router.put("/{plan_id}", response_model=FloorPlanOut)
def update_floor_plan(
    plan_id: str,
    data: FloorPlanUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    plan = _resolve_floor_plan(db, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Floor plan not found")

    duplicate = (
        db.query(FloorPlan)
        .filter(FloorPlan.floor == data.floor, FloorPlan.id != plan.id)
        .first()
    )
    if duplicate:
        raise HTTPException(status_code=409, detail="A floor plan already exists for that floor")

    previous_floor = plan.floor
    plan.building = data.building
    plan.floor = data.floor
    linked_resources = db.query(Resource).filter(Resource.floor == previous_floor).all()
    for resource in linked_resources:
        resource.floor = data.floor
        resource.building = data.building
    db.commit()
    db.refresh(plan)
    return FloorPlanOut(
        id=plan.id,
        building=plan.building,
        floor=plan.floor,
        image_url=api_url(f"/api/floor-plans/{plan.id}/image"),
    )


@router.delete("/{plan_id}")
def delete_floor_plan(
    plan_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    plan = _resolve_floor_plan(db, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Floor plan not found")

    image_path = Path(plan.image_path)
    if not _is_blob_url(plan.image_path) and not image_path.is_absolute():
        image_path = Path(settings.upload_dir).resolve() / image_path.name
    db.delete(plan)
    db.commit()

    if image_path.exists():
        image_path.unlink()

    return {"detail": "Floor plan deleted"}
