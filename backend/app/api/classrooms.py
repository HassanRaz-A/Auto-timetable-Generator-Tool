from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.database import get_db
from app.models import Classroom, Department
from app.schemas import ClassroomCreate, ClassroomOut

router = APIRouter(prefix="/api/classrooms", tags=["classrooms"])


@router.get("", response_model=list[ClassroomOut])
def list_classrooms(department_id: int | None = None, db: Session = Depends(get_db), _=Depends(get_current_user)):
    q = db.query(Classroom)
    if department_id:
        q = q.filter(Classroom.department_id == department_id)
    return q.order_by(Classroom.room_no).all()


@router.post("", response_model=ClassroomOut, status_code=status.HTTP_201_CREATED)
def create_classroom(data: ClassroomCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    if not db.get(Department, data.department_id):
        raise HTTPException(400, "Department not found")
    if db.query(Classroom).filter(Classroom.room_no == data.room_no).first():
        raise HTTPException(400, "Room number already exists")
    c = Classroom(**data.model_dump())
    db.add(c); db.commit(); db.refresh(c)
    return c


@router.get("/{room_id}", response_model=ClassroomOut)
def get_classroom(room_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    c = db.get(Classroom, room_id)
    if not c:
        raise HTTPException(404, "Classroom not found")
    return c


@router.put("/{room_id}", response_model=ClassroomOut)
def update_classroom(room_id: int, data: ClassroomCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    c = db.get(Classroom, room_id)
    if not c:
        raise HTTPException(404, "Classroom not found")
    for k, v in data.model_dump().items():
        setattr(c, k, v)
    db.commit(); db.refresh(c)
    return c


@router.delete("/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_classroom(room_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    c = db.get(Classroom, room_id)
    if not c:
        raise HTTPException(404, "Classroom not found")
    db.delete(c); db.commit()
