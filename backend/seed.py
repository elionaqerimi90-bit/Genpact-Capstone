from app.auth import hash_password
from app.database import Base, SessionLocal, engine
from app.models.user import User, UserRole

Base.metadata.create_all(bind=engine)

db = SessionLocal()

DEMO_USERS = [
    ("sarah.chen@genpact.com", "password123", "Sarah Chen", UserRole.admin, "Office Manager", "Platform", None),
    ("alex.morgan@genpact.com", "password123", "Alex Morgan", UserRole.team_leader, "Team Lead", "Product", None),
    ("priya.sharma@genpact.com", "password123", "Priya Sharma", UserRole.manager, "Director of Workplace", "Operations", None),
    ("jane.smith@genpact.com", "password123", "Jane Smith", UserRole.employee, "Software Engineer", "Product", None),
]


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

db.commit()
db.close()

print("Seed complete (AUTH USERS ONLY)")
