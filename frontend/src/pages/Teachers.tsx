import { useEffect, useState } from "react";
import { api, Teacher, Department } from "../api/client";

const blank = { faculty_number: "", full_name: "", designation: "", email: "", contact: "", alias: "", department_id: 0 };

export default function TeachersPage() {
  const [items, setItems] = useState<Teacher[]>([]);
  const [depts, setDepts] = useState<Department[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [form, setForm] = useState({ ...blank });
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    try {
      const [t, d] = await Promise.all([api.list<Teacher>("/teachers"), api.list<Department>("/departments")]);
      setItems(t); setDepts(d);
    } catch (e) { setErr(e instanceof Error ? e.message : "Load failed"); }
  };
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ ...blank, department_id: depts[0]?.id ?? 0 });
    setShowForm(true); setErr(null);
  };
  const openEdit = (t: Teacher) => {
    setEditing(t);
    setForm({
      faculty_number: t.faculty_number, full_name: t.full_name, designation: t.designation,
      email: t.email, contact: t.contact ?? "", alias: t.alias ?? "", department_id: t.department_id,
    });
    setShowForm(true); setErr(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(null);
    const payload = { ...form, contact: form.contact || null, alias: form.alias || null };
    try {
      if (editing) await api.update<Teacher>(`/teachers/${editing.id}`, payload);
      else await api.create<Teacher>("/teachers", payload);
      setShowForm(false); load();
    } catch (e) { setErr(e instanceof Error ? e.message : "Save failed"); }
  };

  const del = async (id: number) => {
    if (!confirm("Delete this teacher? Their allotments will also be removed.")) return;
    try { await api.remove(`/teachers/${id}`); load(); }
    catch (e) { alert(e instanceof Error ? e.message : "Delete failed"); }
  };

  const deptName = (id: number) => depts.find(d => d.id === id)?.name ?? "—";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Teachers</h2>
          <p className="text-sm text-gray-500">Faculty members available to teach courses.</p>
        </div>
        <button onClick={openNew} className="btn-primary" disabled={depts.length === 0}>+ New Teacher</button>
      </div>

      {depts.length === 0 && <div className="bg-amber-50 text-amber-800 px-4 py-2 rounded mb-4 text-sm">Create a department first.</div>}

      <div className="card p-0 overflow-x-auto">
        <table className="table">
          <thead><tr>
            <th className="th">Faculty #</th><th className="th">Name</th><th className="th">Designation</th>
            <th className="th">Email</th><th className="th">Dept</th><th className="th text-right">Actions</th>
          </tr></thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {items.map((t) => (
              <tr key={t.id}>
                <td className="td font-mono text-xs">{t.faculty_number}</td>
                <td className="td font-medium">{t.full_name}</td>
                <td className="td text-gray-600">{t.designation}</td>
                <td className="td text-gray-600 text-xs">{t.email}</td>
                <td className="td text-gray-600">{deptName(t.department_id)}</td>
                <td className="td text-right space-x-2">
                  <button onClick={() => openEdit(t)} className="btn-secondary !py-1 !px-2 text-xs">Edit</button>
                  <button onClick={() => del(t.id)} className="btn-danger !py-1 !px-2 text-xs">Delete</button>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={6} className="td text-center text-gray-400 py-8">No teachers yet</td></tr>}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setShowForm(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-lg w-full max-w-lg p-6">
            <h3 className="text-lg font-semibold mb-4">{editing ? "Edit" : "New"} Teacher</h3>
            <form onSubmit={submit} className="grid grid-cols-2 gap-3">
              <div><label className="label">Faculty Number</label><input className="input" value={form.faculty_number} onChange={e => setForm({ ...form, faculty_number: e.target.value })} required /></div>
              <div><label className="label">Full Name</label><input className="input" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required /></div>
              <div><label className="label">Designation</label><input className="input" value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })} required /></div>
              <div><label className="label">Alias</label><input className="input" value={form.alias} onChange={e => setForm({ ...form, alias: e.target.value })} /></div>
              <div className="col-span-2"><label className="label">Email</label><input type="email" className="input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required /></div>
              <div><label className="label">Contact</label><input className="input" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} /></div>
              <div><label className="label">Department</label>
                <select className="input" value={form.department_id} onChange={e => setForm({ ...form, department_id: Number(e.target.value) })} required>
                  {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
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
