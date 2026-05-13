"""Database models for the Timetable Management System."""
from __future__ import annotations

from datetime import datetime
from sqlalchemy import (
    Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    """Admin or Faculty user. Auth model."""
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20), default="admin")  # 'admin' or 'faculty'
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    teacher_id: Mapped[int | None] = mapped_column(ForeignKey("teachers.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    teacher: Mapped["Teacher | None"] = relationship("Teacher", back_populates="user", uselist=False)


class Department(Base):
    __tablename__ = "departments"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    teachers: Mapped[list["Teacher"]] = relationship(back_populates="department", cascade="all, delete-orphan")
    subjects: Mapped[list["Subject"]] = relationship(back_populates="department", cascade="all, delete-orphan")
    classrooms: Mapped[list["Classroom"]] = relationship(back_populates="department", cascade="all, delete-orphan")
    sections: Mapped[list["Section"]] = relationship(back_populates="department", cascade="all, delete-orphan")


class Teacher(Base):
    __tablename__ = "teachers"

    id: Mapped[int] = mapped_column(primary_key=True)
    faculty_number: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(255))
    designation: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    contact: Mapped[str | None] = mapped_column(String(50), nullable=True)
    alias: Mapped[str | None] = mapped_column(String(50), nullable=True)
    department_id: Mapped[int] = mapped_column(ForeignKey("departments.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    department: Mapped["Department"] = relationship(back_populates="teachers")
    user: Mapped["User | None"] = relationship(back_populates="teacher", uselist=False)
    allotments: Mapped[list["Allotment"]] = relationship(back_populates="teacher", cascade="all, delete-orphan")


class Subject(Base):
    __tablename__ = "subjects"

    id: Mapped[int] = mapped_column(primary_key=True)
    course_code: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    course_name: Mapped[str] = mapped_column(String(255))
    course_type: Mapped[str] = mapped_column(String(20))  # 'theory' or 'lab'
    credit_hours: Mapped[int] = mapped_column(Integer, default=3)
    weekly_sessions: Mapped[int] = mapped_column(Integer, default=3)
    semester: Mapped[int] = mapped_column(Integer)
    department_id: Mapped[int] = mapped_column(ForeignKey("departments.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    department: Mapped["Department"] = relationship(back_populates="subjects")
    allotments: Mapped[list["Allotment"]] = relationship(back_populates="subject", cascade="all, delete-orphan")


class Classroom(Base):
    __tablename__ = "classrooms"

    id: Mapped[int] = mapped_column(primary_key=True)
    room_no: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    class_type: Mapped[str] = mapped_column(String(20))  # 'theory' or 'lab'
    capacity: Mapped[int] = mapped_column(Integer, default=40)
    department_id: Mapped[int] = mapped_column(ForeignKey("departments.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    department: Mapped["Department"] = relationship(back_populates="classrooms")


class Section(Base):
    __tablename__ = "sections"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50))  # e.g. "BS-CS-3A"
    semester: Mapped[int] = mapped_column(Integer)
    department_id: Mapped[int] = mapped_column(ForeignKey("departments.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    department: Mapped["Department"] = relationship(back_populates="sections")
    allotments: Mapped[list["Allotment"]] = relationship(back_populates="section", cascade="all, delete-orphan")

    __table_args__ = (UniqueConstraint("name", "department_id"),)


class Allotment(Base):
    """A specific teacher–subject–section triple. The unit the scheduler places."""
    __tablename__ = "allotments"

    id: Mapped[int] = mapped_column(primary_key=True)
    teacher_id: Mapped[int] = mapped_column(ForeignKey("teachers.id"))
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id"))
    section_id: Mapped[int] = mapped_column(ForeignKey("sections.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    teacher: Mapped["Teacher"] = relationship(back_populates="allotments")
    subject: Mapped["Subject"] = relationship(back_populates="allotments")
    section: Mapped["Section"] = relationship(back_populates="allotments")

    __table_args__ = (UniqueConstraint("teacher_id", "subject_id", "section_id"),)


class TimetableEntry(Base):
    """A single scheduled slot produced by the solver."""
    __tablename__ = "timetable_entries"

    id: Mapped[int] = mapped_column(primary_key=True)
    allotment_id: Mapped[int] = mapped_column(ForeignKey("allotments.id", ondelete="CASCADE"))
    day: Mapped[int] = mapped_column(Integer)  # 0=Mon ... 4=Fri
    start_slot: Mapped[int] = mapped_column(Integer)  # 0..slots_per_day-1
    length: Mapped[int] = mapped_column(Integer, default=1)  # 1 theory, 2 lab
    classroom_id: Mapped[int] = mapped_column(ForeignKey("classrooms.id"))
    generation_id: Mapped[str] = mapped_column(String(64), index=True)  # batch identifier
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    allotment: Mapped["Allotment"] = relationship()
    classroom: Mapped["Classroom"] = relationship()
