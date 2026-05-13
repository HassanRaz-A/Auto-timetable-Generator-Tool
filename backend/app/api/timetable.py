from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user, require_admin
from app.config import settings
from app.database import get_db
from app.models import (
    Allotment, Classroom, Subject, TimetableEntry, Teacher, Section,
)
from app.schemas import GenerateRequest, GenerateResponse, TimetableEntryOut
from app.scheduler import AllotmentSpec, RoomSpec, TimetableScheduler

router = APIRouter(prefix="/api/timetable", tags=["timetable"])


def _entry_to_out(e: TimetableEntry) -> TimetableEntryOut:
    return TimetableEntryOut(
        id=e.id,
        allotment_id=e.allotment_id,
        day=e.day,
        start_slot=e.start_slot,
        length=e.length,
        classroom_id=e.classroom_id,
        teacher_id=e.allotment.teacher_id,
        teacher_name=e.allotment.teacher.full_name,
        subject_code=e.allotment.subject.course_code,
        subject_name=e.allotment.subject.course_name,
        section_name=e.allotment.section.name,
        room_no=e.classroom.room_no,
        course_type=e.allotment.subject.course_type,
    )


@router.post("/generate", response_model=GenerateResponse)
def generate(req: GenerateRequest, db: Session = Depends(get_db), _=Depends(require_admin)):
    # Pull allotments (optionally filtered by department)
    q = db.query(Allotment).options(
        joinedload(Allotment.teacher),
        joinedload(Allotment.subject),
        joinedload(Allotment.section),
    )
    if req.department_id is not None:
        q = q.join(Subject).filter(Subject.department_id == req.department_id)
    allotments = q.all()
    if not allotments:
        raise HTTPException(400, "No allotments to schedule. Create allotments first.")

    # Pull classrooms (filtered by department if requested)
    rq = db.query(Classroom)
    if req.department_id is not None:
        rq = rq.filter(Classroom.department_id == req.department_id)
    rooms = rq.all()
    if not rooms:
        raise HTTPException(400, "No classrooms available.")

    # Build solver inputs
    alt_specs = [
        AllotmentSpec(
            id=a.id,
            teacher_id=a.teacher_id,
            subject_id=a.subject_id,
            section_id=a.section_id,
            course_type=a.subject.course_type,
            weekly_sessions=a.subject.weekly_sessions,
            teacher_name=a.teacher.full_name,
            subject_name=a.subject.course_name,
            subject_code=a.subject.course_code,
            section_name=a.section.name,
        )
        for a in allotments
    ]
    room_specs = [RoomSpec(id=r.id, room_no=r.room_no, class_type=r.class_type) for r in rooms]

    scheduler = TimetableScheduler(
        allotments=alt_specs,
        rooms=room_specs,
        num_days=settings.num_days,
        slots_per_day=settings.slots_per_day,
        time_limit_seconds=settings.solver_time_limit,
    )
    result = scheduler.solve()

    if result.status == "infeasible":
        return GenerateResponse(
            status="infeasible",
            message=result.message,
            generation_id=result.generation_id,
            solver_time_seconds=result.solver_time,
            diagnostics=result.diagnostics,
        )

    # Clear old entries for these allotments (regen replaces previous)
    alt_ids = [a.id for a in allotments]
    db.query(TimetableEntry).filter(TimetableEntry.allotment_id.in_(alt_ids)).delete(synchronize_session=False)

    # Persist new entries
    saved: list[TimetableEntry] = []
    for s in result.sessions:
        e = TimetableEntry(
            allotment_id=s.allotment_id,
            day=s.day,
            start_slot=s.start_slot,
            length=s.length,
            classroom_id=s.classroom_id,
            generation_id=result.generation_id,
        )
        db.add(e); saved.append(e)
    db.commit()
    for e in saved:
        db.refresh(e)

    # Enriched output
    enriched = (
        db.query(TimetableEntry)
        .options(
            joinedload(TimetableEntry.allotment).joinedload(Allotment.teacher),
            joinedload(TimetableEntry.allotment).joinedload(Allotment.subject),
            joinedload(TimetableEntry.allotment).joinedload(Allotment.section),
            joinedload(TimetableEntry.classroom),
        )
        .filter(TimetableEntry.generation_id == result.generation_id)
        .all()
    )

    return GenerateResponse(
        status=result.status,
        message=result.message,
        generation_id=result.generation_id,
        solver_time_seconds=result.solver_time,
        diagnostics=result.diagnostics,
        entries=[_entry_to_out(e) for e in enriched],
    )


@router.get("", response_model=list[TimetableEntryOut])
def list_entries(
    teacher_id: int | None = None,
    section_id: int | None = None,
    semester: int | None = None,
    department_id: int | None = None,
    db: Session = Depends(get_db), _=Depends(get_current_user),
):
    q = db.query(TimetableEntry).options(
        joinedload(TimetableEntry.allotment).joinedload(Allotment.teacher),
        joinedload(TimetableEntry.allotment).joinedload(Allotment.subject),
        joinedload(TimetableEntry.allotment).joinedload(Allotment.section),
        joinedload(TimetableEntry.classroom),
    )
    if teacher_id or section_id or semester or department_id:
        q = q.join(TimetableEntry.allotment)
        if teacher_id:
            q = q.filter(Allotment.teacher_id == teacher_id)
        if section_id:
            q = q.filter(Allotment.section_id == section_id)
        if semester or department_id:
            q = q.join(Allotment.subject)
            if semester:
                q = q.filter(Subject.semester == semester)
            if department_id:
                q = q.filter(Subject.department_id == department_id)
    entries = q.order_by(TimetableEntry.day, TimetableEntry.start_slot).all()
    return [_entry_to_out(e) for e in entries]


@router.delete("/clear", status_code=status.HTTP_204_NO_CONTENT)
def clear_all(db: Session = Depends(get_db), _=Depends(require_admin)):
    db.query(TimetableEntry).delete()
    db.commit()
