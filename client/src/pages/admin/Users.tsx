import { useEffect, useState } from "react";
import { api } from "../../api";

interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  primaryLocationId: string | null;
  active: boolean;
}
interface Location { id: string; name: string; code: string }

export default function Users() {
  const [users, setUsers] = useState<User[] | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    email: "",
    fullName: "",
    password: "",
    role: "employee",
    primaryLocationId: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    api<{ users: User[] }>("/users").then((r) => setUsers(r.users));
    api<{ locations: Location[] }>("/locations").then((r) => setLocations(r.locations));
  }
  useEffect(load, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/users", {
        method: "POST",
        body: JSON.stringify({
          email: form.email,
          fullName: form.fullName,
          password: form.password,
          role: form.role,
          primaryLocationId: form.primaryLocationId || null,
        }),
      });
      setForm({ email: "", fullName: "", password: "", role: "employee", primaryLocationId: "" });
      setShowForm(false);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!users) return <p className="text-slate-500">Loading…</p>;
  const locMap = new Map(locations.map((l) => [l.id, l]));
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Users</h1>
        <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "New user"}
        </button>
      </div>
      {showForm && (
        <form onSubmit={create} className="card grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="label">Full name</label>
            <input className="input" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </div>
          <div>
            <label className="label">Temporary password</label>
            <input className="input" type="password" minLength={8} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="employee">Employee</option>
              <option value="store_manager">Store manager</option>
              <option value="district_manager">District manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="label">Primary location</label>
            <select className="input" value={form.primaryLocationId} onChange={(e) => setForm({ ...form, primaryLocationId: e.target.value })}>
              <option value="">— none —</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name} ({l.code})</option>
              ))}
            </select>
          </div>
          {error && <p className="md:col-span-2 text-rose-600 text-sm">{error}</p>}
          <div className="md:col-span-2 flex justify-end">
            <button className="btn-primary" disabled={busy}>{busy ? "Creating…" : "Create user"}</button>
          </div>
        </form>
      )}
      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left text-slate-500 text-xs uppercase">
            <tr>
              <th className="py-2 pr-4">Name</th>
              <th className="pr-4">Email</th>
              <th className="pr-4">Role</th>
              <th className="pr-4">Location</th>
              <th>Active</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="py-2 pr-4">{u.fullName}</td>
                <td className="pr-4">{u.email}</td>
                <td className="pr-4">{u.role}</td>
                <td className="pr-4">{u.primaryLocationId ? locMap.get(u.primaryLocationId)?.name : "—"}</td>
                <td>{u.active ? "yes" : "no"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
