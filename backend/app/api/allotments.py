from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user, require_admin
from app.database import get_db
from app.models import Allotment, Teacher, Subject, Section
from app.schemas import AllotmentCreate, AllotmentOut

router = APIRouter(prefix="/api/allotments", tags=["allotments"])


def _to_out(a: Allotment) -> AllotmentOut:
    return AllotmentOut(
        id=a.id,
        teacher_id=a.teacher_id,
        subject_id=a.subject_id,
        section_id=a.section_id,
        teacher_name=a.teacher.full_name if a.teacher else None,
        subject_name=f"{a.subject.course_code} - {a.subject.course_name}" if a.subject else None,
        section_name=a.section.name if a.section else None,
        course_type=a.subject.course_type if a.subject else None,
    )


@router.get("", response_model=list[AllotmentOut])
def list_allotments(
    department_id: int | None = None,
    db: Session = Depends(get_db), _=Depends(get_current_user),
):
    q = db.query(Allotment).options(
        joinedload(Allotment.teacher),
        joinedload(Allotment.subject),
        joinedload(Allotment.section),
    )
    if department_id:
        q = q.join(Subject).filter(Subject.department_id == department_id)
    return [_to_out(a) for a in q.all()]


@router.post("", response_model=AllotmentOut, status_code=status.HTTP_201_CREATED)
def create_allotment(data: AllotmentCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    teacher = db.get(Teacher, data.teacher_id)
    subject = db.get(Subject, data.subject_id)
    section = db.get(Section, data.section_id)
    if not all([teacher, subject, section]):
        raise HTTPException(400, "teacher / subject / section not found")
    existing = db.query(Allotment).filter_by(
        teacher_id=data.teacher_id, subject_id=data.subject_id, section_id=data.section_id
    ).first()
    if existing:
        raise HTTPException(400, "This allotment already exists")
    a = Allotment(**data.model_dump())
    db.add(a); db.commit(); db.refresh(a)
    return _to_out(a)


@router.delete("/{allotment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_allotment(allotment_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    a = db.get(Allotment, allotment_id)
    if not a:
        raise HTTPException(404, "Allotment not found")
    db.delete(a); db.commit()
