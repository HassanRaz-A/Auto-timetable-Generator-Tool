from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.database import get_db
from app.models import Teacher, Department
from app.schemas import TeacherCreate, TeacherOut

router = APIRouter(prefix="/api/teachers", tags=["teachers"])


@router.get("", response_model=list[TeacherOut])
def list_teachers(department_id: int | None = None, db: Session = Depends(get_db), _=Depends(get_current_user)):
    q = db.query(Teacher)
    if department_id:
        q = q.filter(Teacher.department_id == department_id)
    return q.order_by(Teacher.full_name).all()


@router.post("", response_model=TeacherOut, status_code=status.HTTP_201_CREATED)
def create_teacher(data: TeacherCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    if not db.get(Department, data.department_id):
        raise HTTPException(400, "Department not found")
    if db.query(Teacher).filter(Teacher.faculty_number == data.faculty_number).first():
        raise HTTPException(400, "Faculty number already exists")
    if db.query(Teacher).filter(Teacher.email == data.email).first():
        raise HTTPException(400, "Email already exists")
    t = Teacher(**data.model_dump())
    db.add(t); db.commit(); db.refresh(t)
    return t


@router.get("/{teacher_id}", response_model=TeacherOut)
def get_teacher(teacher_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    t = db.get(Teacher, teacher_id)
    if not t:
        raise HTTPException(404, "Teacher not found")
    return t


@router.put("/{teacher_id}", response_model=TeacherOut)
def update_teacher(teacher_id: int, data: TeacherCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    t = db.get(Teacher, teacher_id)
    if not t:
        raise HTTPException(404, "Teacher not found")
    for k, v in data.model_dump().items():
        setattr(t, k, v)
    db.commit(); db.refresh(t)
    return t


@router.delete("/{teacher_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_teacher(teacher_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    t = db.get(Teacher, teacher_id)
    if not t:
        raise HTTPException(404, "Teacher not found")
    db.delete(t); db.commit()
