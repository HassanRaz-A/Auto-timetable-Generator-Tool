import { useEffect, useState } from "react";
import { api, Classroom, Department } from "../api/client";

const blank = { room_no: "", class_type: "theory" as "theory" | "lab", capacity: 40, department_id: 0 };

export default function ClassroomsPage() {
  const [items, setItems] = useState<Classroom[]>([]);
  const [depts, setDepts] = useState<Department[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Classroom | null>(null);
  const [form, setForm] = useState({ ...blank });
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    try {
      const [c, d] = await Promise.all([api.list<Classroom>("/classrooms"), api.list<Department>("/departments")]);
      setItems(c); setDepts(d);
    } catch (e) { setErr(e instanceof Error ? e.message : "Load failed"); }
  };
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ ...blank, department_id: depts[0]?.id ?? 0 });
    setShowForm(true); setErr(null);
  };
  const openEdit = (c: Classroom) => {
    setEditing(c);
    setForm({ room_no: c.room_no, class_type: c.class_type, capacity: c.capacity, department_id: c.department_id });
    setShowForm(true); setErr(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(null);
    try {
      if (editing) await api.update<Classroom>(`/classrooms/${editing.id}`, form);
      else await api.create<Classroom>("/classrooms", form);
      setShowForm(false); load();
    } catch (e) { setErr(e instanceof Error ? e.message : "Save failed"); }
  };

  const del = async (id: number) => {
    if (!confirm("Delete this classroom?")) return;
    try { await api.remove(`/classrooms/${id}`); load(); }
    catch (e) { alert(e instanceof Error ? e.message : "Delete failed"); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Classrooms</h2>
          <p className="text-sm text-gray-500">Theory rooms and labs available for scheduling.</p>
        </div>
        <button onClick={openNew} className="btn-primary" disabled={depts.length === 0}>+ New Classroom</button>
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="table">
          <thead><tr>
            <th className="th">Room #</th><th className="th">Type</th>
            <th className="th">Capacity</th><th className="th text-right">Actions</th>
          </tr></thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {items.map(c => (
              <tr key={c.id}>
                <td className="td font-medium">{c.room_no}</td>
                <td className="td">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${c.class_type === "lab" ? "bg-amber-100 text-amber-800" : "bg-brand-100 text-brand-800"}`}>
                    {c.class_type}
                  </span>
                </td>
                <td className="td">{c.capacity}</td>
                <td className="td text-right space-x-2">
                  <button onClick={() => openEdit(c)} className="btn-secondary !py-1 !px-2 text-xs">Edit</button>
                  <button onClick={() => del(c.id)} className="btn-danger !py-1 !px-2 text-xs">Delete</button>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={4} className="td text-center text-gray-400 py-8">No classrooms yet</td></tr>}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setShowForm(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">{editing ? "Edit" : "New"} Classroom</h3>
            <form onSubmit={submit} className="space-y-3">
              <div><label className="label">Room Number</label><input className="input" value={form.room_no} onChange={e => setForm({ ...form, room_no: e.target.value })} required /></div>
              <div><label className="label">Type</label>
                <select className="input" value={form.class_type} onChange={e => setForm({ ...form, class_type: e.target.value as "theory" | "lab" })}>
                  <option value="theory">Theory</option><option value="lab">Lab</option>
                </select>
              </div>
              <div><label className="label">Capacity</label><input type="number" min={1} className="input" value={form.capacity} onChange={e => setForm({ ...form, capacity: Number(e.target.value) })} /></div>
              <div><label className="label">Department</label>
                <select className="input" value={form.department_id} onChange={e => setForm({ ...form, department_id: Number(e.target.value) })} required>
                  {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              {err && <p className="text-sm text-red-600">{err}</p>}
              <div className="flex justify-end gap-2 pt-2">
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
