"""FastAPI application entry point."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, departments, teachers, subjects, classrooms, sections, allotments, timetable
from app.config import settings
from app.database import Base, engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on first run (SQLite). Use Alembic for production.
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title=settings.project_name,
    version="1.0.0",
    description="Intelligent University Timetable Management System with OR-Tools CP-SAT scheduler.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(departments.router)
app.include_router(teachers.router)
app.include_router(subjects.router)
app.include_router(classrooms.router)
app.include_router(sections.router)
app.include_router(allotments.router)
app.include_router(timetable.router)


@app.get("/")
def root():
    return {
        "name": settings.project_name,
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/api/health")
def health():
    return {"status": "ok"}
