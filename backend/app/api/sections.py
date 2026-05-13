from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.database import get_db
from app.models import Section, Department
from app.schemas import SectionCreate, SectionOut

router = APIRouter(prefix="/api/sections", tags=["sections"])


@router.get("", response_model=list[SectionOut])
def list_sections(
    department_id: int | None = None,
    semester: int | None = None,
    db: Session = Depends(get_db), _=Depends(get_current_user),
):
    q = db.query(Section)
    if department_id:
        q = q.filter(Section.department_id == department_id)
    if semester:
        q = q.filter(Section.semester == semester)
    return q.order_by(Section.semester, Section.name).all()


@router.post("", response_model=SectionOut, status_code=status.HTTP_201_CREATED)
def create_section(data: SectionCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    if not db.get(Department, data.department_id):
        raise HTTPException(400, "Department not found")
    s = Section(**data.model_dump())
    db.add(s); db.commit(); db.refresh(s)
    return s


@router.delete("/{section_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_section(section_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    s = db.get(Section, section_id)
    if not s:
        raise HTTPException(404, "Section not found")
    db.delete(s); db.commit()
