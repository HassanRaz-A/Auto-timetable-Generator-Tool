# Build Guide — Working With This Codebase

This guide is for you (the developer) — it explains *how* to work with the code, what to learn, and how to extend it from v1.0 to the full project described in the proposal.

---

## 0. First-day setup (15 minutes)

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m app.seed
uvicorn app.main:app --reload
```

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173, log in as `admin@ttms.edu` / `admin123`, go to Timetable → click **Generate**. You should see a colour-coded grid in under a second. If you do, the whole stack works.

If something fails, run the standalone scheduler test first:

```bash
cd backend
python tests/smoke_scheduler.py
```

---

## 1. Read the code in this order

You learn faster by following the request flow than by exploring random files. Spend an evening on this:

1. `backend/app/models.py` — the **data model**. Every other file refers to these classes.
2. `backend/app/scheduler.py` — the **CP-SAT solver**. This is the heart of the project. Read the constraints (`H1`–`H6`) and trace how each becomes a `model.Add(...)` call.
3. `backend/app/api/timetable.py` — how the API calls the scheduler and stores the output.
4. `backend/app/api/deps.py` + `security.py` — how auth works (JWT in, user out).
5. `frontend/src/api/client.ts` — typed API wrapper. Note how every page imports `api.list`, `api.create`, etc.
6. `frontend/src/components/TimetableGrid.tsx` — how a list of `TimetableEntry` becomes a visual grid.
7. `frontend/src/pages/Timetable.tsx` — how the Generate button connects to everything.

---

## 2. Learn OR-Tools properly (1 week)

The scheduler is the part that will earn the most respect in a viva or interview. Don't just use it — understand it.

Recommended path:

1. **OR-Tools CP-SAT cookbook:** https://developers.google.com/optimization/cp/cp_solver — work through the nurse-scheduling example. It's the same shape of problem.
2. Modify `tests/smoke_scheduler.py` to be **harder** — add more teachers, more subjects, fewer rooms. See when it goes infeasible. Then read the diagnostics.
3. Add a new **hard constraint** of your own:
   - Example: "Teacher X cannot teach on Mondays." Encode it as: forbid all variables where `(teacher_id == X) AND (day == 0)`.
4. Add a new **soft constraint**:
   - Example: "Avoid gaps in a teacher's day." Define a gap as an empty slot between two filled slots, and minimise the count.

By the end of this week you'll have a working mental model of CSPs — a skill that travels to scheduling, planning, resource allocation, even some ML problems.

---

## 3. Suggested 9-week build plan (from the proposal)

| Week | Goal | What to add |
|------|------|-------------|
| 1 | Already done — you have this codebase running | — |
| 2 | Solidify foundations | Alembic migrations, switch to PostgreSQL, add 20+ pytest tests |
| 3 | Stretch the solver | Add 3 new constraints (teacher off-days, gap minimisation, lab block clustering), evaluate quality |
| 4 | Excel I/O | Bulk import teachers/subjects/allotments from `.xlsx` using pandas; export schedule to `.xlsx` |
| 5 | Substitute flow | Click any cell → modal lists *all* teachers who are free in that slot; assign substitute → persist as a separate entry type |
| 6 | PDF export | Use WeasyPrint server-side; render a polished HTML template; one PDF per teacher, one per section |
| 7 | AI/ML — pick ONE | (a) preference learner using historical schedules, (b) workload-balance scorer, or (c) NL query interface |
| 8 | Polish | Mobile responsive layout, dark mode, dashboard charts (Recharts), better empty/error states |
| 9 | Deploy + write up | Deploy to Render/Railway, record a 5-min demo video, final report |

---

## 4. AI/ML extension — concrete options

This is what turns the project from "decent FYP" to "interview-worthy."

### Option A — Faculty preference learner
- Collect historical timetables + post-semester feedback ("rate each of your slots 1–5").
- Train a model (`sklearn` gradient-boosted trees) to predict the rating from features: day-of-week, slot-of-day, course-type, room, prior/next-slot info, teacher seniority.
- Add a `predicted_satisfaction` score to each candidate timetable; choose the best one.
- **Evaluation:** held-out accuracy on past feedback.

### Option B — Workload balance scorer
- Define a "balance score" per teacher: variance of daily load across the week + count of idle gaps.
- After the solver produces a feasible timetable, run a local-search step (swap two sessions) that improves balance without breaking constraints.
- **Evaluation:** before/after balance score on the seed dataset.

### Option C — Natural-language query
- Build an embedding index of the current schedule entries (each entry → string like "Dr. Khan teaches CS-301 to BS-CS-3A on Wednesday slot 2 in R-101").
- On query, embed the user's question, retrieve top-k entries, return them.
- Library: `sentence-transformers` (small model, runs locally on CPU).
- **Evaluation:** hand-curated set of 20 queries with expected answers; report precision@5.

---

## 5. Things to double-check before submission

- [ ] Replace `SECRET_KEY` in `config.py` with a long random value (use `python -c "import secrets; print(secrets.token_hex(32))"`).
- [ ] Change all default passwords in `app/seed.py`.
- [ ] Don't commit the SQLite `.db` file to git.
- [ ] Add a `LICENSE` file (MIT is fine).
- [ ] Take screenshots of every page for the report.
- [ ] Run `python tests/smoke_scheduler.py` and `bash tests/e2e_test.sh` as your "automated tests" — and add 5–10 real `pytest` tests on top.
- [ ] Generate the Swagger PDF from http://localhost:8000/openapi.json — attach to the report.

---

## 6. Things you'll be asked in the viva

Prepare two-sentence answers for each:

1. Why CP-SAT instead of a genetic algorithm? *(CP-SAT proves optimality / infeasibility; GAs return a "best so far" with no guarantee.)*
2. What's the difference between a hard and a soft constraint? *(Hard: feasibility-breaking. Soft: shows up in the objective function.)*
3. How does your solver scale? *(Variables = `O(allotments × days × slots × rooms)`. With 20 teachers, 30 courses, 5 days, 7 slots, ~10 rooms: ~10k vars — fast.)*
4. Why FastAPI over Django / Flask? *(Async, Pydantic validation, auto-OpenAPI docs.)*
5. How is the password stored? *(bcrypt with per-user salt; never in plain text; verified with constant-time comparison.)*
6. What happens on infeasible input? *(`SchedulerResult.status = "infeasible"`, with a human-readable diagnostic explaining which constraint set is too tight.)*
7. Why a JWT instead of a session cookie? *(Stateless — the server keeps no session table; tokens carry their own expiry.)*
8. If you had another month, what would you build? *(The AI/ML extension layer — preference learner is the highest-impact next step.)*

---

Build it well. Good luck.
