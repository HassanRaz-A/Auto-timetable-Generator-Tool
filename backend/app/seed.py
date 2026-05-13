"""Populate the database with realistic seed data so the app is usable immediately.

Run:
    python -m app.seed
"""
from sqlalchemy.orm import Session

from app.database import Base, SessionLocal, engine
from app.models import (
    User, Department, Teacher, Subject, Classroom, Section, Allotment,
)
from app.security import hash_password


def seed(db: Session) -> None:
    # Wipe and reset (dev convenience)
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    # --- Admin user ---
    admin = User(
        email="admin@ttms.edu",
        full_name="System Administrator",
        hashed_password=hash_password("admin123"),
        role="admin",
    )
    db.add(admin)

    # --- Department ---
    cs = Department(name="Computer Science", description="CS & IT Department")
    db.add(cs)
    db.flush()  # to get id

    # --- Teachers ---
    teachers_data = [
        ("CS-001", "Dr. Ayesha Khan",     "Professor",            "ayesha.khan@ttms.edu",  "AK"),
        ("CS-002", "Dr. Bilal Ahmed",     "Associate Professor",  "bilal.ahmed@ttms.edu",  "BA"),
        ("CS-003", "Ms. Saira Malik",     "Assistant Professor",  "saira.malik@ttms.edu",  "SM"),
        ("CS-004", "Mr. Hamza Tariq",     "Lecturer",             "hamza.tariq@ttms.edu",  "HT"),
        ("CS-005", "Dr. Fatima Yousaf",   "Professor",            "fatima.yousaf@ttms.edu","FY"),
        ("CS-006", "Mr. Imran Sheikh",    "Lab Engineer",         "imran.sheikh@ttms.edu", "IS"),
    ]
    teachers = []
    for fno, name, desig, email, alias in teachers_data:
        t = Teacher(
            faculty_number=fno, full_name=name, designation=desig,
            email=email, contact="03001234567", alias=alias,
            department_id=cs.id,
        )
        db.add(t); teachers.append(t)
    db.flush()

    # Optional faculty user for one teacher (demo)
    fac_user = User(
        email=teachers[0].email,
        full_name=teachers[0].full_name,
        hashed_password=hash_password("faculty123"),
        role="faculty",
        teacher_id=teachers[0].id,
    )
    db.add(fac_user)

    # --- Subjects (semester 3 + semester 5) ---
    subjects_data = [
        # (code, name, type, credits, weekly_sessions, semester)
        ("CS-301", "Data Structures",          "theory", 3, 3, 3),
        ("CS-302", "Digital Logic Design",     "theory", 3, 3, 3),
        ("CS-303", "Discrete Mathematics",     "theory", 3, 2, 3),
        ("CS-304", "Object Oriented Prog.",    "theory", 3, 3, 3),
        ("CS-301L","Data Structures Lab",      "lab",    1, 1, 3),
        ("CS-304L","OOP Lab",                  "lab",    1, 1, 3),

        ("CS-501", "Operating Systems",        "theory", 3, 3, 5),
        ("CS-502", "Computer Networks",        "theory", 3, 3, 5),
        ("CS-503", "Database Systems",         "theory", 3, 2, 5),
        ("CS-501L","OS Lab",                   "lab",    1, 1, 5),
        ("CS-503L","DB Lab",                   "lab",    1, 1, 5),
    ]
    subjects = []
    for code, name, ctype, cr, ws, sem in subjects_data:
        s = Subject(
            course_code=code, course_name=name, course_type=ctype,
            credit_hours=cr, weekly_sessions=ws, semester=sem,
            department_id=cs.id,
        )
        db.add(s); subjects.append(s)
    db.flush()

    # --- Classrooms ---
    rooms_data = [
        ("R-101", "theory", 40),
        ("R-102", "theory", 40),
        ("R-103", "theory", 60),
        ("L-201", "lab",    30),
        ("L-202", "lab",    30),
    ]
    for rno, ctype, cap in rooms_data:
        db.add(Classroom(
            room_no=rno, class_type=ctype, capacity=cap, department_id=cs.id,
        ))

    # --- Sections ---
    secs = [
        Section(name="BS-CS-3A", semester=3, department_id=cs.id),
        Section(name="BS-CS-5A", semester=5, department_id=cs.id),
    ]
    for s in secs: db.add(s)
    db.flush()

    # --- Allotments ---
    # Section 3A:
    s3 = secs[0]
    allot = [
        (teachers[0], "CS-301",  s3),
        (teachers[1], "CS-302",  s3),
        (teachers[2], "CS-303",  s3),
        (teachers[3], "CS-304",  s3),
        (teachers[5], "CS-301L", s3),
        (teachers[5], "CS-304L", s3),
    ]
    # Section 5A:
    s5 = secs[1]
    allot += [
        (teachers[4], "CS-501",  s5),
        (teachers[1], "CS-502",  s5),
        (teachers[2], "CS-503",  s5),
        (teachers[5], "CS-501L", s5),
        (teachers[5], "CS-503L", s5),
    ]
    code_to_subject = {s.course_code: s for s in subjects}
    for teacher, code, sec in allot:
        db.add(Allotment(
            teacher_id=teacher.id,
            subject_id=code_to_subject[code].id,
            section_id=sec.id,
        ))

    db.commit()
    print("Seed completed successfully.")
    print("Admin login : admin@ttms.edu / admin123")
    print("Faculty demo: ayesha.khan@ttms.edu / faculty123")


def main():
    db = SessionLocal()
    try:
        seed(db)
    finally:
        db.close()


if __name__ == "__main__":
    main()
