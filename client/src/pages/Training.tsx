import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";

interface Assignment {
  id: string;
  status: "assigned" | "completed" | "verified";
  triggerSection: string | null;
  triggerScorePct: number | null;
  shopId: string | null;
  assignedAt: string;
  completedAt: string | null;
  trainingModule: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    url: string | null;
    durationMinutes: number | null;
  };
}

const STATUS_COLOR: Record<string, string> = {
  assigned: "bg-amber-100 text-amber-800",
  completed: "bg-blue-100 text-blue-800",
  verified: "bg-emerald-100 text-emerald-800",
};

export default function Training() {
  const { user } = useAuth();
  const [items, setItems] = useState<Assignment[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  function load() {
    api<{ assignments: Assignment[] }>("/training/assignments").then((r) => setItems(r.assignments));
  }
  useEffect(load, []);

  async function act(id: string, action: "complete" | "verify") {
    setBusy(id);
    try {
      await api(`/training/assignments/${id}/${action}`, { method: "POST", body: JSON.stringify({}) });
      load();
    } finally {
      setBusy(null);
    }
  }

  if (!items || !user) return <p className="text-slate-500">Loading…</p>;
  const canVerify = ["store_manager", "district_manager", "admin"].includes(user.role);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Training</h1>
      <p className="text-sm text-slate-500">
        Per spec §6.9 microlearning loop: low scores in a rubric section auto-assign a matching training module.
      </p>
      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left text-slate-500 text-xs uppercase">
            <tr>
              <th className="py-2 pr-4">Module</th>
              <th className="pr-4">Triggered by</th>
              <th className="pr-4">Assigned</th>
              <th className="pr-4">Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={5} className="py-6 text-center text-slate-400">No training assignments.</td></tr>
            )}
            {items.map((a) => (
              <tr key={a.id} className="border-t align-top">
                <td className="py-2 pr-4">
                  <div className="font-medium">{a.trainingModule.name}</div>
                  {a.trainingModule.description && (
                    <div className="text-xs text-slate-500">{a.trainingModule.description}</div>
                  )}
                  {a.trainingModule.url && (
                    <a className="text-xs text-stine-600 hover:underline" href={a.trainingModule.url} target="_blank" rel="noreferrer">
                      Open module ↗
                    </a>
                  )}
                </td>
                <td className="pr-4 text-xs">
                  {a.triggerSection && (
                    <>
                      {a.triggerSection}
                      {a.triggerScorePct != null && <span className="text-slate-400"> ({a.triggerScorePct.toFixed(0)}%)</span>}
                    </>
                  )}
                  {a.shopId && (
                    <div>
                      <Link className="text-stine-600 hover:underline" to={`/shops/${a.shopId}`}>view shop</Link>
                    </div>
                  )}
                </td>
                <td className="pr-4 text-xs">{a.assignedAt.slice(0, 10)}</td>
                <td className="pr-4">
                  <span className={`badge ${STATUS_COLOR[a.status]}`}>{a.status}</span>
                </td>
                <td className="space-x-1">
                  {a.status === "assigned" && a.trainingModule && user.role === "employee" && (
                    <button className="btn-secondary text-xs" disabled={busy === a.id} onClick={() => act(a.id, "complete")}>
                      Mark complete
                    </button>
                  )}
                  {a.status === "completed" && canVerify && (
                    <button className="btn-primary text-xs" disabled={busy === a.id} onClick={() => act(a.id, "verify")}>
                      Verify
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
