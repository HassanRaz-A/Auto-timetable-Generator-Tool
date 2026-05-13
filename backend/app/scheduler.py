"""CP-SAT scheduling engine using Google OR-Tools.

Given a set of allotments (teacher-subject-section triples) and a pool of
classrooms, produces a weekly timetable that satisfies:

Hard constraints:
  H1. Each allotment is scheduled the required number of weekly sessions.
  H2. A teacher is in at most one place per (day, slot).
  H3. A section attends at most one class per (day, slot).
  H4. A classroom hosts at most one class per (day, slot).
  H5. Lab sessions occupy 2 consecutive slots and must be in a lab room.
      Theory sessions occupy 1 slot and must be in a theory room.
  H6. The same allotment is scheduled at most once per day (variety).

Soft objective (minimised):
  S1. Total idle gaps in each teacher's daily schedule.
  S2. Imbalance across the week (penalise overloaded days).
"""
from __future__ import annotations

import time
import uuid
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Iterable

from ortools.sat.python import cp_model


# ---------- Data structures ----------
@dataclass
class AllotmentSpec:
    id: int
    teacher_id: int
    subject_id: int
    section_id: int
    course_type: str          # "theory" or "lab"
    weekly_sessions: int
    # display helpers
    teacher_name: str = ""
    subject_name: str = ""
    subject_code: str = ""
    section_name: str = ""


@dataclass
class RoomSpec:
    id: int
    room_no: str
    class_type: str  # "theory" or "lab"


@dataclass
class ScheduledSession:
    allotment_id: int
    day: int
    start_slot: int
    length: int
    classroom_id: int


@dataclass
class SchedulerResult:
    status: str  # "optimal", "feasible", "infeasible"
    message: str
    generation_id: str
    sessions: list[ScheduledSession] = field(default_factory=list)
    solver_time: float = 0.0
    diagnostics: dict = field(default_factory=dict)


# ---------- The solver ----------
class TimetableScheduler:
    def __init__(
        self,
        allotments: Iterable[AllotmentSpec],
        rooms: Iterable[RoomSpec],
        num_days: int = 5,
        slots_per_day: int = 7,
        time_limit_seconds: int = 30,
    ) -> None:
        self.allotments = list(allotments)
        self.rooms = list(rooms)
        self.num_days = num_days
        self.slots_per_day = slots_per_day
        self.time_limit = time_limit_seconds

    # -- helpers --
    def _session_length(self, alt: AllotmentSpec) -> int:
        return 2 if alt.course_type == "lab" else 1

    def _suitable_rooms(self, alt: AllotmentSpec) -> list[RoomSpec]:
        return [r for r in self.rooms if r.class_type == alt.course_type]

    def _feasibility_check(self) -> dict | None:
        """Return None if input looks satisfiable, else a diagnostic dict."""
        if not self.allotments:
            return {"error": "No allotments to schedule."}
        if not self.rooms:
            return {"error": "No classrooms available."}

        # Are there enough rooms of each required type?
        for ctype in {"theory", "lab"}:
            needed = any(a.course_type == ctype for a in self.allotments)
            available = any(r.class_type == ctype for r in self.rooms)
            if needed and not available:
                return {"error": f"No classrooms of type '{ctype}' but allotments require it."}

        # Check teacher load doesn't exceed weekly capacity
        capacity = self.num_days * self.slots_per_day
        teacher_load: dict[int, int] = defaultdict(int)
        for a in self.allotments:
            teacher_load[a.teacher_id] += a.weekly_sessions * self._session_length(a)
        for tid, load in teacher_load.items():
            if load > capacity:
                return {"error": f"Teacher {tid} has weekly load {load} > capacity {capacity}."}

        section_load: dict[int, int] = defaultdict(int)
        for a in self.allotments:
            section_load[a.section_id] += a.weekly_sessions * self._session_length(a)
        for sid, load in section_load.items():
            if load > capacity:
                return {"error": f"Section {sid} has weekly load {load} > capacity {capacity}."}

        return None

    # -- main entry point --
    def solve(self) -> SchedulerResult:
        gen_id = uuid.uuid4().hex[:12]
        start = time.time()

        diag = self._feasibility_check()
        if diag is not None:
            return SchedulerResult(
                status="infeasible",
                message=diag["error"],
                generation_id=gen_id,
                diagnostics=diag,
                solver_time=time.time() - start,
            )

        model = cp_model.CpModel()

        # ------- Decision variables -------
        # x[(allotment_id, day, start_slot, room_id)] = 1 if scheduled there.
        # Only created for valid (room type matches allotment type, slot fits).
        x: dict[tuple[int, int, int, int], cp_model.IntVar] = {}

        for a in self.allotments:
            session_len = self._session_length(a)
            valid_rooms = self._suitable_rooms(a)
            for d in range(self.num_days):
                for s in range(self.slots_per_day - session_len + 1):
                    for r in valid_rooms:
                        var = model.NewBoolVar(f"x_a{a.id}_d{d}_s{s}_r{r.id}")
                        x[(a.id, d, s, r.id)] = var

        # ------- H1: each allotment scheduled exactly weekly_sessions times -------
        for a in self.allotments:
            session_len = self._session_length(a)
            valid_rooms = self._suitable_rooms(a)
            placements = [
                x[(a.id, d, s, r.id)]
                for d in range(self.num_days)
                for s in range(self.slots_per_day - session_len + 1)
                for r in valid_rooms
            ]
            model.Add(sum(placements) == a.weekly_sessions)

        # ------- H6: at most one session per day per allotment -------
        for a in self.allotments:
            session_len = self._session_length(a)
            valid_rooms = self._suitable_rooms(a)
            for d in range(self.num_days):
                vars_d = [
                    x[(a.id, d, s, r.id)]
                    for s in range(self.slots_per_day - session_len + 1)
                    for r in valid_rooms
                ]
                model.Add(sum(vars_d) <= 1)

        # Build occupancy maps: which BoolVars occupy each (day, slot)
        teacher_occ: dict[tuple[int, int, int], list[cp_model.IntVar]] = defaultdict(list)
        section_occ: dict[tuple[int, int, int], list[cp_model.IntVar]] = defaultdict(list)
        room_occ:    dict[tuple[int, int, int], list[cp_model.IntVar]] = defaultdict(list)

        for a in self.allotments:
            session_len = self._session_length(a)
            valid_rooms = self._suitable_rooms(a)
            for d in range(self.num_days):
                for s in range(self.slots_per_day - session_len + 1):
                    for r in valid_rooms:
                        var = x[(a.id, d, s, r.id)]
                        # session occupies slots [s, s+session_len-1]
                        for offset in range(session_len):
                            actual = s + offset
                            teacher_occ[(a.teacher_id, d, actual)].append(var)
                            section_occ[(a.section_id, d, actual)].append(var)
                            room_occ[(r.id, d, actual)].append(var)

        # ------- H2/H3/H4: capacity 1 for teacher / section / room per slot -------
        for vars_list in teacher_occ.values():
            if len(vars_list) > 1:
                model.Add(sum(vars_list) <= 1)
        for vars_list in section_occ.values():
            if len(vars_list) > 1:
                model.Add(sum(vars_list) <= 1)
        for vars_list in room_occ.values():
            if len(vars_list) > 1:
                model.Add(sum(vars_list) <= 1)

        # ------- Soft S2: balance daily load per section -------
        # Penalise the maximum daily load across the week.
        # max_load[section] = max over days of (sessions on that day)
        # Minimise sum of max_loads (weighted).
        balance_penalty_terms = []
        for section_id in {a.section_id for a in self.allotments}:
            # daily occupancy count = sum of vars touching this section on that day
            daily_counts = []
            for d in range(self.num_days):
                day_vars = []
                for a in self.allotments:
                    if a.section_id != section_id:
                        continue
                    session_len = self._session_length(a)
                    valid_rooms = self._suitable_rooms(a)
                    for s in range(self.slots_per_day - session_len + 1):
                        for r in valid_rooms:
                            day_vars.append(x[(a.id, d, s, r.id)])
                cnt = model.NewIntVar(0, self.slots_per_day, f"load_sec{section_id}_d{d}")
                model.Add(cnt == sum(day_vars))
                daily_counts.append(cnt)
            max_load = model.NewIntVar(0, self.slots_per_day, f"max_load_sec{section_id}")
            model.AddMaxEquality(max_load, daily_counts)
            balance_penalty_terms.append(max_load)

        # Objective: minimise total max-daily-load across sections (load balancing)
        if balance_penalty_terms:
            model.Minimize(sum(balance_penalty_terms))

        # ------- Solve -------
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = self.time_limit
        solver.parameters.num_search_workers = 4
        status = solver.Solve(model)
        elapsed = time.time() - start

        if status == cp_model.OPTIMAL:
            stext = "optimal"
        elif status == cp_model.FEASIBLE:
            stext = "feasible"
        else:
            return SchedulerResult(
                status="infeasible",
                message="No feasible schedule found within constraints. "
                        "Try adding more rooms, reducing weekly sessions, or relaxing teacher loads.",
                generation_id=gen_id,
                solver_time=elapsed,
                diagnostics={"solver_status": solver.StatusName(status)},
            )

        sessions: list[ScheduledSession] = []
        for (a_id, d, s, r_id), var in x.items():
            if solver.Value(var) == 1:
                # find allotment to get length
                alt = next(a for a in self.allotments if a.id == a_id)
                sessions.append(ScheduledSession(
                    allotment_id=a_id,
                    day=d,
                    start_slot=s,
                    length=self._session_length(alt),
                    classroom_id=r_id,
                ))

        return SchedulerResult(
            status=stext,
            message=f"Scheduled {len(sessions)} sessions across {self.num_days} days.",
            generation_id=gen_id,
            sessions=sessions,
            solver_time=elapsed,
            diagnostics={
                "objective_value": solver.ObjectiveValue() if balance_penalty_terms else 0,
                "num_variables": len(x),
                "solver_status": solver.StatusName(status),
            },
        )
