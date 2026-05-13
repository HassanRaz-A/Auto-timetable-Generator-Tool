import { useEffect, useState } from "react";
import { api, Subject, Department } from "../api/client";

const blank = { course_code: "", course_name: "", course_type: "theory" as "theory" | "lab", credit_hours: 3, weekly_sessions: 3, semester: 3, department_id: 0 };

export default function SubjectsPage() {
  const [items, setItems] = useState<Subject[]>([]);
  const [depts, setDepts] = useState<Department[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [form, setForm] = useState({ ...blank });
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    try {
      const [s, d] = await Promise.all([api.list<Subject>("/subjects"), api.list<Department>("/departments")]);
      setItems(s); setDepts(d);
    } catch (e) { setErr(e instanceof Error ? e.message : "Load failed"); }
  };
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ ...blank, department_id: depts[0]?.id ?? 0 });
    setShowForm(true); setErr(null);
  };
  const openEdit = (s: Subject) => {
    setEditing(s);
    setForm({
      course_code: s.course_code, course_name: s.course_name, course_type: s.course_type,
      credit_hours: s.credit_hours, weekly_sessions: s.weekly_sessions, semester: s.semester,
      department_id: s.department_id,
    });
    setShowForm(true); setErr(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(null);
    try {
      if (editing) await api.update<Subject>(`/subjects/${editing.id}`, form);
      else await api.create<Subject>("/subjects", form);
      setShowForm(false); load();
    } catch (e) { setErr(e instanceof Error ? e.message : "Save failed"); }
  };

  const del = async (id: number) => {
    if (!confirm("Delete this subject?")) return;
    try { await api.remove(`/subjects/${id}`); load(); }
    catch (e) { alert(e instanceof Error ? e.message : "Delete failed"); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Subjects</h2>
          <p className="text-sm text-gray-500">Courses offered by each department.</p>
        </div>
        <button onClick={openNew} className="btn-primary" disabled={depts.length === 0}>+ New Subject</button>
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="table">
          <thead><tr>
            <th className="th">Code</th><th className="th">Name</th><th className="th">Type</th>
            <th className="th">Cr.</th><th className="th">Sessions/wk</th><th className="th">Sem</th>
            <th className="th text-right">Actions</th>
          </tr></thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {items.map(s => (
              <tr key={s.id}>
                <td className="td font-mono text-xs">{s.course_code}</td>
                <td className="td font-medium">{s.course_name}</td>
                <td className="td">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.course_type === "lab" ? "bg-amber-100 text-amber-800" : "bg-brand-100 text-brand-800"}`}>
                    {s.course_type}
                  </span>
                </td>
                <td className="td">{s.credit_hours}</td>
                <td className="td">{s.weekly_sessions}</td>
                <td className="td">{s.semester}</td>
                <td className="td text-right space-x-2">
                  <button onClick={() => openEdit(s)} className="btn-secondary !py-1 !px-2 text-xs">Edit</button>
                  <button onClick={() => del(s.id)} className="btn-danger !py-1 !px-2 text-xs">Delete</button>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={7} className="td text-center text-gray-400 py-8">No subjects yet</td></tr>}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setShowForm(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-lg w-full max-w-lg p-6">
            <h3 className="text-lg font-semibold mb-4">{editing ? "Edit" : "New"} Subject</h3>
            <form onSubmit={submit} className="grid grid-cols-2 gap-3">
              <div><label className="label">Course Code</label><input className="input" value={form.course_code} onChange={e => setForm({ ...form, course_code: e.target.value })} required /></div>
              <div><label className="label">Course Name</label><input className="input" value={form.course_name} onChange={e => setForm({ ...form, course_name: e.target.value })} required /></div>
              <div><label className="label">Type</label>
                <select className="input" value={form.course_type} onChange={e => setForm({ ...form, course_type: e.target.value as "theory" | "lab" })}>
                  <option value="theory">Theory</option><option value="lab">Lab</option>
                </select>
              </div>
              <div><label className="label">Department</label>
                <select className="input" value={form.department_id} onChange={e => setForm({ ...form, department_id: Number(e.target.value) })} required>
                  {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div><label className="label">Credit Hours</label><input type="number" min={1} className="input" value={form.credit_hours} onChange={e => setForm({ ...form, credit_hours: Number(e.target.value) })} /></div>
              <div><label className="label">Weekly Sessions</label><input type="number" min={1} max={5} className="input" value={form.weekly_sessions} onChange={e => setForm({ ...form, weekly_sessions: Number(e.target.value) })} /></div>
              <div><label className="label">Semester</label><input type="number" min={1} max={8} className="input" value={form.semester} onChange={e => setForm({ ...form, semester: Number(e.target.value) })} /></div>
              {err && <p className="col-span-2 text-sm text-red-600">{err}</p>}
              <div className="col-span-2 flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">{editing ? "Update" : "Create"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
