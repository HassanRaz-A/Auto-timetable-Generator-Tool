import { useEffect, useState } from "react";
import { api, Department } from "../api/client";

export default function DepartmentsPage() {
  const [items, setItems] = useState<Department[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    try { setItems(await api.list<Department>("/departments")); }
    catch (e) { setErr(e instanceof Error ? e.message : "Load failed"); }
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm({ name: "", description: "" }); setShowForm(true); setErr(null); };
  const openEdit = (d: Department) => { setEditing(d); setForm({ name: d.name, description: d.description ?? "" }); setShowForm(true); setErr(null); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(null);
    try {
      if (editing) await api.update<Department>(`/departments/${editing.id}`, form);
      else await api.create<Department>("/departments", form);
      setShowForm(false); load();
    } catch (e) { setErr(e instanceof Error ? e.message : "Save failed"); }
  };

  const del = async (id: number) => {
    if (!confirm("Delete this department? All teachers, subjects, and classrooms inside it will be removed.")) return;
    try { await api.remove(`/departments/${id}`); load(); }
    catch (e) { alert(e instanceof Error ? e.message : "Delete failed"); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Departments</h2>
          <p className="text-sm text-gray-500">Manage academic departments.</p>
        </div>
        <button onClick={openNew} className="btn-primary">+ New Department</button>
      </div>

      {err && <div className="bg-red-50 text-red-700 px-4 py-2 rounded mb-4 text-sm">{err}</div>}

      <div className="card p-0 overflow-hidden">
        <table className="table">
          <thead><tr><th className="th">Name</th><th className="th">Description</th><th className="th text-right">Actions</th></tr></thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {items.map((d) => (
              <tr key={d.id}>
                <td className="td font-medium">{d.name}</td>
                <td className="td text-gray-600">{d.description || "—"}</td>
                <td className="td text-right space-x-2">
                  <button onClick={() => openEdit(d)} className="btn-secondary !py-1 !px-2 text-xs">Edit</button>
                  <button onClick={() => del(d.id)} className="btn-danger !py-1 !px-2 text-xs">Delete</button>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={3} className="td text-center text-gray-400 py-8">No departments yet</td></tr>}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setShowForm(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">{editing ? "Edit" : "New"} Department</h3>
            <form onSubmit={submit} className="space-y-3">
              <div><label className="label">Name</label><input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
              <div><label className="label">Description</label><textarea className="input" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
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
