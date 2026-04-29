import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../api";

interface RubricRow {
  id: string;
  name: string;
  type: string;
  version: number;
  status: string;
  totalMaxScore: number;
  _count: { sections: number; shops: number };
}

export default function Rubrics() {
  const nav = useNavigate();
  const [rubrics, setRubrics] = useState<RubricRow[] | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    api<{ rubrics: RubricRow[] }>("/rubrics").then((r) => setRubrics(r.rubrics));
  }
  useEffect(load, []);

  async function createBlank(type: "visit" | "call") {
    setBusy(true);
    try {
      const r = await api<{ id: string }>("/rubrics", {
        method: "POST",
        body: JSON.stringify({
          name: `Untitled ${type === "visit" ? "Visit" : "Call"} Rubric`,
          type,
          sections: [
            {
              name: "Section 1",
              displayOrder: 1,
              weight: 1,
              questions: [
                { text: "First question", questionType: "yes_no", weight: 1, maxScore: 10, required: true, displayOrder: 1 },
              ],
            },
          ],
        }),
      });
      nav(`/admin/rubrics/${r.id}`);
    } finally {
      setBusy(false);
    }
  }

  async function activate(id: string) {
    setBusy(true);
    try {
      await api(`/rubrics/${id}/activate`, { method: "POST", body: JSON.stringify({}) });
      load();
    } finally {
      setBusy(false);
    }
  }

  async function retire(id: string) {
    setBusy(true);
    try {
      await api(`/rubrics/${id}/retire`, { method: "POST", body: JSON.stringify({}) });
      load();
    } finally {
      setBusy(false);
    }
  }

  async function duplicate(id: string) {
    setBusy(true);
    try {
      const r = await api<{ id: string }>(`/rubrics/${id}/duplicate`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      nav(`/admin/rubrics/${r.id}`);
    } finally {
      setBusy(false);
    }
  }

  if (!rubrics) return <p className="text-slate-500">Loading…</p>;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Rubrics</h1>
        <div className="space-x-2">
          <button className="btn-secondary" disabled={busy} onClick={() => createBlank("visit")}>New visit rubric</button>
          <button className="btn-secondary" disabled={busy} onClick={() => createBlank("call")}>New call rubric</button>
        </div>
      </div>
      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left text-slate-500 text-xs uppercase">
            <tr>
              <th className="py-2 pr-4">Name</th>
              <th className="pr-4">Type</th>
              <th className="pr-4">Version</th>
              <th className="pr-4">Status</th>
              <th className="pr-4">Sections</th>
              <th className="pr-4">Max</th>
              <th className="pr-4">Used by</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rubrics.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="py-2 pr-4">
                  <Link to={`/admin/rubrics/${r.id}`} className="text-stine-600 hover:underline">
                    {r.name}
                  </Link>
                </td>
                <td className="pr-4">{r.type}</td>
                <td className="pr-4">v{r.version}</td>
                <td className="pr-4">{r.status}</td>
                <td className="pr-4">{r._count.sections}</td>
                <td className="pr-4">{r.totalMaxScore}</td>
                <td className="pr-4">{r._count.shops} shops</td>
                <td className="space-x-1">
                  {r.status === "draft" && (
                    <button className="btn-primary text-xs" disabled={busy} onClick={() => activate(r.id)}>Activate</button>
                  )}
                  {r.status === "active" && (
                    <button className="btn-secondary text-xs" disabled={busy} onClick={() => retire(r.id)}>Retire</button>
                  )}
                  <button className="btn-secondary text-xs" disabled={busy} onClick={() => duplicate(r.id)}>
                    Duplicate
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
