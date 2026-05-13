import { useEffect, useState } from "react";
import { api, Section, Department } from "../api/client";

const blank = { name: "", semester: 3, department_id: 0 };

export default function SectionsPage() {
  const [items, setItems] = useState<Section[]>([]);
  const [depts, setDepts] = useState<Department[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...blank });
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    try {
      const [s, d] = await Promise.all([api.list<Section>("/sections"), api.list<Department>("/departments")]);
      setItems(s); setDepts(d);
    } catch (e) { setErr(e instanceof Error ? e.message : "Load failed"); }
  };
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setForm({ ...blank, department_id: depts[0]?.id ?? 0 });
    setShowForm(true); setErr(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(null);
    try {
      await api.create<Section>("/sections", form);
      setShowForm(false); load();
    } catch (e) { setErr(e instanceof Error ? e.message : "Save failed"); }
  };

  const del = async (id: number) => {
    if (!confirm("Delete this section?")) return;
    try { await api.remove(`/sections/${id}`); load(); }
    catch (e) { alert(e instanceof Error ? e.message : "Delete failed"); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Sections</h2>
          <p className="text-sm text-gray-500">Student groups per semester.</p>
        </div>
        <button onClick={openNew} className="btn-primary" disabled={depts.length === 0}>+ New Section</button>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="table">
          <thead><tr><th className="th">Name</th><th className="th">Semester</th><th className="th text-right">Actions</th></tr></thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {items.map(s => (
              <tr key={s.id}>
                <td className="td font-medium">{s.name}</td>
                <td className="td">{s.semester}</td>
                <td className="td text-right">
                  <button onClick={() => del(s.id)} className="btn-danger !py-1 !px-2 text-xs">Delete</button>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={3} className="td text-center text-gray-400 py-8">No sections yet</td></tr>}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setShowForm(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">New Section</h3>
            <form onSubmit={submit} className="space-y-3">
              <div><label className="label">Section Name</label>
                <input className="input" placeholder="e.g. BS-CS-3A" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div><label className="label">Semester</label>
                <input type="number" min={1} max={8} className="input" value={form.semester} onChange={e => setForm({ ...form, semester: Number(e.target.value) })} />
              </div>
              <div><label className="label">Department</label>
                <select className="input" value={form.department_id} onChange={e => setForm({ ...form, department_id: Number(e.target.value) })} required>
                  {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
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
