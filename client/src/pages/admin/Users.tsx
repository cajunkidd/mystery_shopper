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
        <div className="space-x-2">
          <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Cancel" : "New user"}
          </button>
        </div>
      </div>
      <BulkUserImport onDone={load} />
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

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else cur += c;
    } else {
      if (c === ",") { out.push(cur); cur = ""; }
      else if (c === '"') inQuotes = true;
      else cur += c;
    }
  }
  out.push(cur);
  return out;
}

function BulkUserImport({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ created: { email: string; tempPassword: string }[]; errors: { row: number; reason: string }[] } | null>(null);

  async function handleFile(file: File) {
    setBusy(true);
    setResult(null);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        setResult({ created: [], errors: [{ row: 0, reason: "no rows" }] });
        return;
      }
      const headers = parseCsvLine(lines[0]).map((h) => h.trim());
      const rows: Record<string, string>[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]);
        const row: Record<string, string> = {};
        headers.forEach((h, j) => {
          row[h] = cols[j] ?? "";
        });
        rows.push(row);
      }
      // Heuristic mapping: assume header names match the API.
      const mapping = {
        email: headers.find((h) => /email/i.test(h)) ?? "email",
        fullName: headers.find((h) => /name/i.test(h)) ?? "fullName",
        role: headers.find((h) => /role/i.test(h)) ?? "role",
        locationCode: headers.find((h) => /location/i.test(h)),
      };
      const r = await api<{ created: { email: string; tempPassword: string }[]; errors: { row: number; reason: string }[] }>(
        "/imports/users",
        { method: "POST", body: JSON.stringify({ rows, mapping }) },
      );
      setResult(r);
      onDone();
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button className="text-sm text-stine-600 hover:underline" onClick={() => setOpen(true)}>
        + Bulk import users from CSV
      </button>
    );
  }
  return (
    <div className="card space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Bulk user import</h3>
        <button className="text-xs text-slate-500" onClick={() => setOpen(false)}>close</button>
      </div>
      <p className="text-xs text-slate-500">
        CSV columns: <span className="font-mono">email</span>, <span className="font-mono">fullName</span>,{" "}
        <span className="font-mono">role</span> (employee | store_manager | district_manager | admin), and optional{" "}
        <span className="font-mono">locationCode</span>. Each user gets a temporary password — record them now and rotate after first login.
      </p>
      <input
        type="file"
        accept=".csv,text/csv"
        disabled={busy}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
      {busy && <p className="text-sm text-slate-500">Importing…</p>}
      {result && (
        <div className="text-sm space-y-2">
          <p>Created {result.created.length} user(s).</p>
          {result.created.length > 0 && (
            <table className="w-full text-xs font-mono">
              <thead className="text-slate-500"><tr><th className="text-left">Email</th><th className="text-left">Temporary password</th></tr></thead>
              <tbody>
                {result.created.map((c) => (
                  <tr key={c.email}><td>{c.email}</td><td>{c.tempPassword}</td></tr>
                ))}
              </tbody>
            </table>
          )}
          {result.errors.length > 0 && (
            <ul className="text-xs text-rose-700 list-disc list-inside">
              {result.errors.map((e, i) => <li key={i}>Row {e.row}: {e.reason}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
