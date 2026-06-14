import os

from fastapi import FastAPI
from app.config import settings
from app.database import Base, engine
from app.routers import  auth,users,resources


app = FastAPI(title="DeskDibs API", version="1.0.0")


app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(resources.router, prefix="/api")

@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)


@app.get("/api/health")
def health():
    return {"status": "ok"}
