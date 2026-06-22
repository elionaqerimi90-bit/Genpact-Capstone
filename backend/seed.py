from pathlib import Path

from app.auth import hash_password
from app.config import settings
from app.database import Base, SessionLocal, engine
from app.models.floor_plan import FloorPlan
from app.models.resource import Resource, ResourceType
from app.models.user import User, UserRole

Base.metadata.create_all(bind=engine)

db = SessionLocal()

DEMO_USERS = [
    ("sarah.chen@genpact.com", "password123", "Sarah Chen", UserRole.admin, "Office Manager", "Platform", None),
    ("alex.morgan@genpact.com", "password123", "Alex Morgan", UserRole.team_leader, "Team Lead", "Product", None),
    ("priya.sharma@genpact.com", "password123", "Priya Sharma", UserRole.manager, "Director of Workplace", "Operations", None),
    ("jane.smith@genpact.com", "password123", "Jane Smith", UserRole.employee, "Software Engineer", "Product", None),
]

DEMO_FLOOR = "1"
DEMO_FLOOR_IMAGE = "02c4e64e12e044f8add5543cfc83607d.jpg"

DEMO_RESOURCES = [
    ("1", ResourceType.desk, "Open Area", 40.49751243781095, 28.751242133156673, 1, "Hot Desk"),
    ("2", ResourceType.desk, "Open Area", 64.87562189054727, 25.571381252070225, 1, "Hot Desk"),
    ("3", ResourceType.desk, "Open Area", 18.109452736318406, 47.30043060616098, 1, "Hot Desk"),
    ("Meeting Room 1", ResourceType.room, "Meeting", 84.74945533769062, 47.88461538461539, 6, "Meeting Room"),
]


def _floor_plan_image_path() -> str:
    uploads_dir = Path(settings.upload_dir).resolve()
    image_path = uploads_dir / DEMO_FLOOR_IMAGE
    if not image_path.exists():
        raise FileNotFoundError(
            f"Missing demo floor plan image at {image_path}. "
            "Make sure backend/uploads is checked out from the repo."
        )
    return str(image_path)


for email, password, full_name, role, job_title, team_name, team_leader_id in DEMO_USERS:
    user = db.query(User).filter(User.email == email).first()

    if user:
        user.hashed_password = hash_password(password)
        user.full_name = full_name
        user.role = role
        user.job_title = job_title
        user.team_name = team_name
        user.team_leader_id = team_leader_id
    else:
        db.add(
            User(
                email=email,
                hashed_password=hash_password(password),
                full_name=full_name,
                role=role,
                job_title=job_title,
                team_name=team_name,
                team_leader_id=team_leader_id,
            )
        )

team_leader = db.query(User).filter(User.email == "alex.morgan@genpact.com").first()
for teammate_email in ("jane.smith@genpact.com",):
    teammate = db.query(User).filter(User.email == teammate_email).first()
    if teammate and team_leader:
        teammate.team_leader_id = team_leader.id
        teammate.team_name = team_leader.team_name

image_path = _floor_plan_image_path()
floor_plan = db.query(FloorPlan).filter(FloorPlan.floor == DEMO_FLOOR).first()
if floor_plan:
    floor_plan.name = f"Floor {DEMO_FLOOR}"
    floor_plan.building = "HQ - Prishtina"
    floor_plan.image_path = image_path
else:
    db.add(
        FloorPlan(
            name=f"Floor {DEMO_FLOOR}",
            building="HQ - Prishtina",
            floor=DEMO_FLOOR,
            image_path=image_path,
        )
    )

for name, resource_type, zone, x, y, capacity, desk_type in DEMO_RESOURCES:
    resource = db.query(Resource).filter(Resource.name == name, Resource.floor == DEMO_FLOOR).first()
    if resource:
        resource.type = resource_type
        resource.zone = zone
        resource.floor_plan_x = x
        resource.floor_plan_y = y
        resource.capacity = capacity
        resource.desk_type = desk_type
        resource.building = "HQ - Prishtina"
        resource.is_active = True
    else:
        db.add(
            Resource(
                name=name,
                type=resource_type,
                building="HQ - Prishtina",
                floor=DEMO_FLOOR,
                zone=zone,
                floor_plan_x=x,
                floor_plan_y=y,
                capacity=capacity,
                desk_type=desk_type,
                is_active=True,
            )
        )

db.commit()
db.close()

print("Seed complete (users, floor plan, and demo resources)")
