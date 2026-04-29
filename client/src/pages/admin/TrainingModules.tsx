import { useEffect, useState } from "react";
import { api } from "../../api";

interface Module {
  id: string;
  code: string;
  name: string;
  description: string | null;
  url: string | null;
  durationMinutes: number | null;
  rubricSectionMatch: string | null;
  active: boolean;
}

const EMPTY: Omit<Module, "id"> = {
  code: "",
  name: "",
  description: null,
  url: null,
  durationMinutes: null,
  rubricSectionMatch: null,
  active: true,
};

export default function TrainingModules() {
  const [items, setItems] = useState<Module[] | null>(null);
  const [draft, setDraft] = useState<Omit<Module, "id">>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    api<{ modules: Module[] }>("/training/modules").then((r) => setItems(r.modules));
  }
  useEffect(load, []);

  function startEdit(m: Module) {
    setEditingId(m.id);
    setDraft({
      code: m.code,
      name: m.name,
      description: m.description,
      url: m.url,
      durationMinutes: m.durationMinutes,
      rubricSectionMatch: m.rubricSectionMatch,
      active: m.active,
    });
  }

  function reset() {
    setEditingId(null);
    setDraft(EMPTY);
    setError(null);
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const payload = {
        code: draft.code,
        name: draft.name,
        description: draft.description ?? undefined,
        url: draft.url ?? undefined,
        durationMinutes: draft.durationMinutes ?? undefined,
        rubricSectionMatch: draft.rubricSectionMatch ?? undefined,
        active: draft.active,
      };
      if (editingId) {
        await api(`/training/modules/${editingId}`, { method: "PATCH", body: JSON.stringify(payload) });
      } else {
        await api("/training/modules", { method: "POST", body: JSON.stringify(payload) });
      }
      reset();
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Training modules</h1>
      <p className="text-sm text-slate-500">
        Modules with a <span className="font-mono text-xs">rubricSectionMatch</span> are auto-assigned when an
        evaluated employee scores below 70% on a section with that name (§6.9 microlearning).
      </p>

      <div className="card space-y-3">
        <h3 className="font-medium">{editingId ? "Edit module" : "New module"}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div>
            <label className="label">Code (unique)</label>
            <input className="input" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} />
          </div>
          <div>
            <label className="label">Name</label>
            <input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Rubric section match</label>
            <input
              className="input"
              placeholder="e.g. Greeting"
              value={draft.rubricSectionMatch ?? ""}
              onChange={(e) => setDraft({ ...draft, rubricSectionMatch: e.target.value || null })}
            />
          </div>
          <div>
            <label className="label">Duration (minutes)</label>
            <input
              className="input"
              type="number"
              value={draft.durationMinutes ?? ""}
              onChange={(e) => setDraft({ ...draft, durationMinutes: e.target.value ? Number(e.target.value) : null })}
            />
          </div>
          <div className="md:col-span-2">
            <label className="label">URL (LMS or doc link)</label>
            <input
              className="input"
              value={draft.url ?? ""}
              onChange={(e) => setDraft({ ...draft, url: e.target.value || null })}
            />
          </div>
          <div className="md:col-span-2">
            <label className="label">Description</label>
            <textarea
              className="input"
              rows={2}
              value={draft.description ?? ""}
              onChange={(e) => setDraft({ ...draft, description: e.target.value || null })}
            />
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={draft.active}
              onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
            />
            <span>Active</span>
          </label>
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex gap-2">
          <button className="btn-primary" disabled={busy || !draft.code || !draft.name} onClick={save}>
            {editingId ? "Save changes" : "Create module"}
          </button>
          {editingId && (
            <button className="btn-secondary" onClick={reset} disabled={busy}>
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <h3 className="font-medium mb-2">Modules</h3>
        {!items && <p className="text-slate-500">Loading…</p>}
        {items && items.length === 0 && <p className="text-sm text-slate-400">No modules yet.</p>}
        {items && items.length > 0 && (
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500 text-xs uppercase">
              <tr>
                <th className="py-2 pr-4">Name</th>
                <th className="pr-4">Code</th>
                <th className="pr-4">Section match</th>
                <th className="pr-4">Active</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="py-2 pr-4">
                    <div className="font-medium">{m.name}</div>
                    {m.description && <div className="text-xs text-slate-500">{m.description}</div>}
                  </td>
                  <td className="pr-4 font-mono text-xs">{m.code}</td>
                  <td className="pr-4">{m.rubricSectionMatch ?? "—"}</td>
                  <td className="pr-4">{m.active ? "yes" : "no"}</td>
                  <td>
                    <button className="btn-secondary text-xs" onClick={() => startEdit(m)}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
