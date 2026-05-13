"""Pydantic schemas (API request/response models)."""
from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# ---------- Auth ----------
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    full_name: str


class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: Literal["admin", "faculty"] = "admin"


class UserCreate(UserBase):
    password: str = Field(min_length=6)
    teacher_id: int | None = None


class UserOut(UserBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    is_active: bool


# ---------- Department ----------
class DepartmentBase(BaseModel):
    name: str
    description: str | None = None


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentOut(DepartmentBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


# ---------- Teacher ----------
class TeacherBase(BaseModel):
    faculty_number: str
    full_name: str
    designation: str
    email: EmailStr
    contact: str | None = None
    alias: str | None = None
    department_id: int


class TeacherCreate(TeacherBase):
    pass


class TeacherOut(TeacherBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


# ---------- Subject ----------
class SubjectBase(BaseModel):
    course_code: str
    course_name: str
    course_type: Literal["theory", "lab"]
    credit_hours: int = 3
    weekly_sessions: int = 3
    semester: int
    department_id: int


class SubjectCreate(SubjectBase):
    pass


class SubjectOut(SubjectBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


# ---------- Classroom ----------
class ClassroomBase(BaseModel):
    room_no: str
    class_type: Literal["theory", "lab"]
    capacity: int = 40
    department_id: int


class ClassroomCreate(ClassroomBase):
    pass


class ClassroomOut(ClassroomBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


# ---------- Section ----------
class SectionBase(BaseModel):
    name: str
    semester: int
    department_id: int


class SectionCreate(SectionBase):
    pass


class SectionOut(SectionBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


# ---------- Allotment ----------
class AllotmentBase(BaseModel):
    teacher_id: int
    subject_id: int
    section_id: int


class AllotmentCreate(AllotmentBase):
    pass


class AllotmentOut(AllotmentBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    teacher_name: str | None = None
    subject_name: str | None = None
    section_name: str | None = None
    course_type: str | None = None


# ---------- Timetable ----------
class TimetableEntryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    allotment_id: int
    day: int
    start_slot: int
    length: int
    classroom_id: int
    teacher_id: int
    teacher_name: str
    subject_code: str
    subject_name: str
    section_name: str
    room_no: str
    course_type: str


class GenerateRequest(BaseModel):
    department_id: int | None = None  # if None, generate across all departments


class GenerateResponse(BaseModel):
    status: Literal["feasible", "optimal", "infeasible"]
    message: str
    generation_id: str | None = None
    entries: list[TimetableEntryOut] = []
    solver_time_seconds: float | None = None
    diagnostics: dict | None = None
