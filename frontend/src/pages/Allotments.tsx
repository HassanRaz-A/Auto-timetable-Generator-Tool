import { useEffect, useState } from "react";
import { api, Allotment, Teacher, Subject, Section } from "../api/client";

export default function AllotmentsPage() {
  const [items, setItems] = useState<Allotment[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ teacher_id: 0, subject_id: 0, section_id: 0 });
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    try {
      const [a, t, s, sec] = await Promise.all([
        api.list<Allotment>("/allotments"),
        api.list<Teacher>("/teachers"),
        api.list<Subject>("/subjects"),
        api.list<Section>("/sections"),
      ]);
      setItems(a); setTeachers(t); setSubjects(s); setSections(sec);
    } catch (e) { setErr(e instanceof Error ? e.message : "Load failed"); }
  };
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setForm({
      teacher_id: teachers[0]?.id ?? 0,
      subject_id: subjects[0]?.id ?? 0,
      section_id: sections[0]?.id ?? 0,
    });
    setShowForm(true); setErr(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(null);
    try {
      await api.create<Allotment>("/allotments", form);
      setShowForm(false); load();
    } catch (e) { setErr(e instanceof Error ? e.message : "Save failed"); }
  };

  const del = async (id: number) => {
    if (!confirm("Remove this allotment?")) return;
    try { await api.remove(`/allotments/${id}`); load(); }
    catch (e) { alert(e instanceof Error ? e.message : "Delete failed"); }
  };

  const canAllot = teachers.length && subjects.length && sections.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Allotments</h2>
          <p className="text-sm text-gray-500">Assign which teacher teaches which subject to which section.</p>
        </div>
        <button onClick={openNew} className="btn-primary" disabled={!canAllot}>+ New Allotment</button>
      </div>

      {!canAllot && <div className="bg-amber-50 text-amber-800 px-4 py-2 rounded mb-4 text-sm">Create teachers, subjects, and sections first.</div>}

      <div className="card p-0 overflow-x-auto">
        <table className="table">
          <thead><tr>
            <th className="th">Teacher</th><th className="th">Subject</th>
            <th className="th">Section</th><th className="th">Type</th>
            <th className="th text-right">Actions</th>
          </tr></thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {items.map(a => (
              <tr key={a.id}>
                <td className="td font-medium">{a.teacher_name}</td>
                <td className="td text-gray-700">{a.subject_name}</td>
                <td className="td">{a.section_name}</td>
                <td className="td">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${a.course_type === "lab" ? "bg-amber-100 text-amber-800" : "bg-brand-100 text-brand-800"}`}>
                    {a.course_type}
                  </span>
                </td>
                <td className="td text-right">
                  <button onClick={() => del(a.id)} className="btn-danger !py-1 !px-2 text-xs">Delete</button>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={5} className="td text-center text-gray-400 py-8">No allotments yet</td></tr>}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setShowForm(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">New Allotment</h3>
            <form onSubmit={submit} className="space-y-3">
              <div><label className="label">Teacher</label>
                <select className="input" value={form.teacher_id} onChange={e => setForm({ ...form, teacher_id: Number(e.target.value) })} required>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name} ({t.faculty_number})</option>)}
                </select>
              </div>
              <div><label className="label">Subject</label>
                <select className="input" value={form.subject_id} onChange={e => setForm({ ...form, subject_id: Number(e.target.value) })} required>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.course_code} — {s.course_name} ({s.course_type})</option>)}
                </select>
              </div>
              <div><label className="label">Section</label>
                <select className="input" value={form.section_id} onChange={e => setForm({ ...form, section_id: Number(e.target.value) })} required>
                  {sections.map(s => <option key={s.id} value={s.id}>{s.name} (Sem {s.semester})</option>)}
                </select>
              </div>
              {err && <p className="text-sm text-red-600">{err}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
