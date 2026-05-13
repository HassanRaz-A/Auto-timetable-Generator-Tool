from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.database import get_db
from app.models import Subject, Department
from app.schemas import SubjectCreate, SubjectOut

router = APIRouter(prefix="/api/subjects", tags=["subjects"])


@router.get("", response_model=list[SubjectOut])
def list_subjects(
    department_id: int | None = None,
    semester: int | None = None,
    db: Session = Depends(get_db), _=Depends(get_current_user),
):
    q = db.query(Subject)
    if department_id:
        q = q.filter(Subject.department_id == department_id)
    if semester:
        q = q.filter(Subject.semester == semester)
    return q.order_by(Subject.semester, Subject.course_code).all()


@router.post("", response_model=SubjectOut, status_code=status.HTTP_201_CREATED)
def create_subject(data: SubjectCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    if not db.get(Department, data.department_id):
        raise HTTPException(400, "Department not found")
    if db.query(Subject).filter(Subject.course_code == data.course_code).first():
        raise HTTPException(400, "Course code already exists")
    s = Subject(**data.model_dump())
    db.add(s); db.commit(); db.refresh(s)
    return s


@router.get("/{subject_id}", response_model=SubjectOut)
def get_subject(subject_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    s = db.get(Subject, subject_id)
    if not s:
        raise HTTPException(404, "Subject not found")
    return s


@router.put("/{subject_id}", response_model=SubjectOut)
def update_subject(subject_id: int, data: SubjectCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    s = db.get(Subject, subject_id)
    if not s:
        raise HTTPException(404, "Subject not found")
    for k, v in data.model_dump().items():
        setattr(s, k, v)
    db.commit(); db.refresh(s)
    return s


@router.delete("/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subject(subject_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    s = db.get(Subject, subject_id)
    if not s:
        raise HTTPException(404, "Subject not found")
    db.delete(s); db.commit()
