import { useEffect, useState } from "react";
import { api, TimetableEntry, Teacher, Section, GenerateResult } from "../api/client";
import TimetableGrid from "../components/TimetableGrid";

type ViewMode = "section" | "teacher" | "all";

export default function TimetablePage() {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("section");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const loadMeta = async () => {
    try {
      const [t, s] = await Promise.all([api.list<Teacher>("/teachers"), api.list<Section>("/sections")]);
      setTeachers(t); setSections(s);
      if (s.length && selectedId === null) setSelectedId(s[0].id);
    } catch (e) { setErr(e instanceof Error ? e.message : "Load failed"); }
  };

  const loadEntries = async () => {
    try {
      const params = new URLSearchParams();
      if (viewMode === "teacher" && selectedId) params.set("teacher_id", String(selectedId));
      if (viewMode === "section" && selectedId) params.set("section_id", String(selectedId));
      const path = "/timetable" + (params.toString() ? `?${params}` : "");
      setEntries(await api.list<TimetableEntry>(path));
    } catch (e) { setErr(e instanceof Error ? e.message : "Load failed"); }
  };

  useEffect(() => { loadMeta(); }, []);
  useEffect(() => { loadEntries(); }, [viewMode, selectedId]);

  const generate = async () => {
    if (!confirm("Generate a new timetable? Existing entries will be replaced.")) return;
    setBusy(true); setErr(null); setResult(null);
    try {
      const r = await api.generate();
      setResult(r);
      if (r.status !== "infeasible") loadEntries();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Generate failed");
    } finally { setBusy(false); }
  };

  const selectorOptions = viewMode === "teacher" ? teachers.map(t => ({ id: t.id, label: t.full_name }))
    : viewMode === "section" ? sections.map(s => ({ id: s.id, label: `${s.name} (Sem ${s.semester})` }))
    : [];

  const title = viewMode === "teacher" ? `Schedule: ${teachers.find(t => t.id === selectedId)?.full_name ?? ""}`
    : viewMode === "section" ? `Schedule: ${sections.find(s => s.id === selectedId)?.name ?? ""}`
    : "All scheduled sessions";

  const cellAccessor = viewMode === "teacher"
    ? (e: TimetableEntry) => `Section ${e.section_name}`
    : viewMode === "section"
      ? (e: TimetableEntry) => e.teacher_name
      : undefined;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Timetable</h2>
          <p className="text-sm text-gray-500">Generate, view, and filter the weekly schedule.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="btn-secondary">🖨 Print</button>
          <button onClick={generate} disabled={busy} className="btn-primary">
            {busy ? "Solving..." : "⚡ Generate"}
          </button>
        </div>
      </div>

      {err && <div className="bg-red-50 text-red-700 px-4 py-2 rounded mb-4 text-sm">{err}</div>}

      {result && (
        <div className={`rounded-lg p-4 mb-4 ${result.status === "infeasible" ? "bg-red-50 border border-red-200" : "bg-green-50 border border-green-200"}`}>
          <div className="flex items-center gap-2 mb-1">
            <span className={`font-semibold ${result.status === "infeasible" ? "text-red-800" : "text-green-800"}`}>
              {result.status === "infeasible" ? "❌ Infeasible" : `✓ ${result.status.toUpperCase()}`}
            </span>
            {result.solver_time_seconds !== null && <span className="text-xs text-gray-600">in {result.solver_time_seconds.toFixed(3)}s</span>}
          </div>
          <p className="text-sm text-gray-700">{result.message}</p>
          {result.diagnostics && (
            <p className="text-xs text-gray-500 mt-1">
              {Object.entries(result.diagnostics).map(([k, v]) => `${k}: ${v}`).join(" · ")}
            </p>
          )}
        </div>
      )}

      <div className="card mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="label">View by</label>
            <select className="input min-w-[160px]" value={viewMode}
              onChange={e => { setViewMode(e.target.value as ViewMode); setSelectedId(null); }}>
              <option value="section">Section</option>
              <option value="teacher">Teacher</option>
              <option value="all">All Sessions</option>
            </select>
          </div>
          {viewMode !== "all" && (
            <div className="flex-1 min-w-[200px]">
              <label className="label">{viewMode === "teacher" ? "Teacher" : "Section"}</label>
              <select className="input" value={selectedId ?? ""} onChange={e => setSelectedId(Number(e.target.value) || null)}>
                <option value="">Select…</option>
                {selectorOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </div>
          )}
          <div className="text-sm text-gray-500 self-center">
            Showing {entries.length} session{entries.length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {entries.length > 0 ? (
        <TimetableGrid entries={entries} title={title} cellAccessor={cellAccessor} />
      ) : (
        <div className="card text-center text-gray-400 py-12">
          {viewMode === "all"
            ? "No sessions scheduled yet. Click Generate to create a timetable."
            : "No sessions for this selection."}
        </div>
      )}
    </div>
  );
}
