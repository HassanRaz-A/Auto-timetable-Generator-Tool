import { useAuth } from "../store/auth";

const BASE = "/api";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = useAuth.getState().token;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(BASE + path, { ...options, headers });
  if (res.status === 401) {
    useAuth.getState().logout();
    throw new Error("Session expired. Please log in again.");
  }
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const data = await res.json();
      msg = data.detail || msg;
    } catch {}
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  // auth
  login: async (email: string, password: string) => {
    const body = new URLSearchParams({ username: email, password });
    const res = await fetch(BASE + "/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || "Login failed");
    }
    return res.json();
  },

  // generic CRUD
  list:   <T,>(p: string) => request<T[]>(p),
  get:    <T,>(p: string) => request<T>(p),
  create: <T,>(p: string, data: unknown) => request<T>(p, { method: "POST", body: JSON.stringify(data) }),
  update: <T,>(p: string, data: unknown) => request<T>(p, { method: "PUT",  body: JSON.stringify(data) }),
  remove: (p: string) => request<void>(p, { method: "DELETE" }),

  // timetable
  generate: (departmentId?: number) =>
    request<GenerateResult>("/timetable/generate", {
      method: "POST",
      body: JSON.stringify(departmentId ? { department_id: departmentId } : {}),
    }),
};

// ---------- shared types ----------
export interface Department { id: number; name: string; description?: string | null; }
export interface Teacher {
  id: number; faculty_number: string; full_name: string; designation: string;
  email: string; contact?: string | null; alias?: string | null; department_id: number;
}
export interface Subject {
  id: number; course_code: string; course_name: string; course_type: "theory" | "lab";
  credit_hours: number; weekly_sessions: number; semester: number; department_id: number;
}
export interface Classroom {
  id: number; room_no: string; class_type: "theory" | "lab"; capacity: number; department_id: number;
}
export interface Section { id: number; name: string; semester: number; department_id: number; }
export interface Allotment {
  id: number; teacher_id: number; subject_id: number; section_id: number;
  teacher_name?: string; subject_name?: string; section_name?: string; course_type?: string;
}
export interface TimetableEntry {
  id: number; allotment_id: number; day: number; start_slot: number; length: number;
  classroom_id: number; teacher_id: number; teacher_name: string; subject_code: string;
  subject_name: string; section_name: string; room_no: string; course_type: string;
}
export interface GenerateResult {
  status: "optimal" | "feasible" | "infeasible";
  message: string; generation_id: string | null;
  entries: TimetableEntry[]; solver_time_seconds: number | null;
  diagnostics: Record<string, unknown> | null;
}
