"""Smoke test: build a small instance and verify the scheduler produces
a valid, conflict-free timetable."""
import sys
sys.path.insert(0, '/home/claude/ttms/backend')

from app.scheduler import TimetableScheduler, AllotmentSpec, RoomSpec

# 4 teachers, 6 subjects (4 theory + 2 lab), 2 sections
allotments = [
    # Section A (semester 3)
    AllotmentSpec(1, teacher_id=1, subject_id=1, section_id=1, course_type="theory", weekly_sessions=3, subject_code="CS301"),
    AllotmentSpec(2, teacher_id=2, subject_id=2, section_id=1, course_type="theory", weekly_sessions=3, subject_code="CS302"),
    AllotmentSpec(3, teacher_id=3, subject_id=3, section_id=1, course_type="theory", weekly_sessions=2, subject_code="CS303"),
    AllotmentSpec(4, teacher_id=4, subject_id=4, section_id=1, course_type="lab", weekly_sessions=1, subject_code="CS301L"),
    # Section B (semester 5)
    AllotmentSpec(5, teacher_id=1, subject_id=5, section_id=2, course_type="theory", weekly_sessions=3, subject_code="CS501"),
    AllotmentSpec(6, teacher_id=2, subject_id=6, section_id=2, course_type="theory", weekly_sessions=2, subject_code="CS502"),
    AllotmentSpec(7, teacher_id=3, subject_id=4, section_id=2, course_type="lab", weekly_sessions=1, subject_code="CS501L"),
]

rooms = [
    RoomSpec(1, "R101", "theory"),
    RoomSpec(2, "R102", "theory"),
    RoomSpec(3, "L201", "lab"),
]

scheduler = TimetableScheduler(allotments, rooms, num_days=5, slots_per_day=7)
result = scheduler.solve()

print(f"Status: {result.status}")
print(f"Message: {result.message}")
print(f"Solver time: {result.solver_time:.3f}s")
print(f"Diagnostics: {result.diagnostics}")
print(f"\nScheduled {len(result.sessions)} sessions:")

DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"]
SLOTS = ["8:00", "9:00", "10:00", "11:00", "12:00", "1:00", "2:00"]
for s in sorted(result.sessions, key=lambda x: (x.day, x.start_slot)):
    alt = next(a for a in allotments if a.id == s.allotment_id)
    room = next(r for r in rooms if r.id == s.classroom_id)
    print(f"  {DAYS[s.day]} {SLOTS[s.start_slot]}+{s.length}slot | {alt.subject_code} (sec {alt.section_id}, teacher {alt.teacher_id}) in {room.room_no}")

# Verify no conflicts manually
print("\nVerifying constraints...")
teacher_slots = {}
section_slots = {}
room_slots = {}
errors = []
for s in result.sessions:
    alt = next(a for a in allotments if a.id == s.allotment_id)
    for offset in range(s.length):
        key = (s.day, s.start_slot + offset)
        # Teacher
        tkey = (alt.teacher_id, *key)
        if tkey in teacher_slots:
            errors.append(f"Teacher {alt.teacher_id} double-booked at {key}")
        teacher_slots[tkey] = s.allotment_id
        # Section
        skey = (alt.section_id, *key)
        if skey in section_slots:
            errors.append(f"Section {alt.section_id} double-booked at {key}")
        section_slots[skey] = s.allotment_id
        # Room
        rkey = (s.classroom_id, *key)
        if rkey in room_slots:
            errors.append(f"Room {s.classroom_id} double-booked at {key}")
        room_slots[rkey] = s.allotment_id

if errors:
    print(f"  FAILED: {len(errors)} conflicts:")
    for e in errors: print("    -", e)
    sys.exit(1)
else:
    print("  PASSED: no teacher / section / room conflicts.")
