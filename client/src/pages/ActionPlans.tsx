import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";

interface ActionPlan {
  id: string;
  category: string;
  description: string;
  dueDate: string;
  status: string;
  shop: { id: string; shopDate: string; type: string };
  assignedTo: { id: string; fullName: string };
  assignedBy: { id: string; fullName: string };
}

const STATUS_COLOR: Record<string, string> = {
  open: "bg-amber-100 text-amber-800",
  acknowledged: "bg-blue-100 text-blue-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-emerald-100 text-emerald-800",
  verified: "bg-emerald-100 text-emerald-800",
  overdue: "bg-rose-100 text-rose-800",
};

export default function ActionPlans() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<ActionPlan[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [scope, setScope] = useState<"all" | "mine" | "assigned-by-me">(
    user?.role === "employee" ? "mine" : "all",
  );
  const [statusFilter, setStatusFilter] = useState("");

  function load() {
    const q = scope === "all" ? "" : `?scope=${scope}`;
    api<{ actionPlans: ActionPlan[] }>(`/action-plans${q}`).then((r) => setPlans(r.actionPlans));
  }
  useEffect(load, [scope]);

  const filtered = plans?.filter((p) => !statusFilter || p.status === statusFilter) ?? null;

  const [verifyId, setVerifyId] = useState<string | null>(null);
  const [verifyNotes, setVerifyNotes] = useState("");

  async function act(id: string, action: "acknowledge" | "complete" | "verify") {
    setBusy(id);
    try {
      const body =
        action === "verify"
          ? JSON.stringify({ verificationNotes: verifyNotes || undefined })
          : JSON.stringify({});
      await api(`/action-plans/${id}/${action}`, { method: "POST", body });
      setVerifyId(null);
      setVerifyNotes("");
      load();
    } finally {
      setBusy(null);
    }
  }

  if (!filtered || !user) return <p className="text-slate-500">Loading…</p>;

  const canVerify = ["store_manager", "district_manager", "admin"].includes(user.role);
  const completedIds = filtered.filter((p) => p.status === "completed").map((p) => p.id);
  async function bulkVerify() {
    if (completedIds.length === 0) return;
    setBusy("bulk");
    try {
      await api("/action-plans/bulk-verify", {
        method: "POST",
        body: JSON.stringify({ ids: completedIds }),
      });
      load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Action plans</h1>
        {canVerify && completedIds.length > 0 && (
          <button className="btn-primary text-sm" disabled={busy === "bulk"} onClick={bulkVerify}>
            Verify {completedIds.length} completed
          </button>
        )}
      </div>
      <div className="card flex flex-wrap items-end gap-3">
        {user.role !== "employee" && (
          <div>
            <label className="label">Scope</label>
            <select className="input" value={scope} onChange={(e) => setScope(e.target.value as typeof scope)}>
              <option value="all">All in scope</option>
              <option value="mine">Assigned to me</option>
              <option value="assigned-by-me">Assigned by me</option>
            </select>
          </div>
        )}
        <div>
          <label className="label">Status</label>
          <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All</option>
            <option value="open">Open</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
            <option value="verified">Verified</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      </div>
      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left text-slate-500 text-xs uppercase">
            <tr>
              <th className="py-2 pr-4">Category</th>
              <th className="pr-4">Description</th>
              <th className="pr-4">Assigned to</th>
              <th className="pr-4">Due</th>
              <th className="pr-4">Shop</th>
              <th className="pr-4">Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-slate-400">No matching action plans.</td>
              </tr>
            )}
            {filtered.map((p) => {
              const isMine = p.assignedTo.id === user.id;
              const canVerify = ["store_manager", "district_manager", "admin"].includes(user.role);
              return (
                <tr key={p.id} className="border-t align-top">
                  <td className="py-2 pr-4 font-medium">{p.category}</td>
                  <td className="pr-4">{p.description}</td>
                  <td className="pr-4">{p.assignedTo.fullName}</td>
                  <td className="pr-4">{p.dueDate.slice(0, 10)}</td>
                  <td className="pr-4">
                    <Link className="text-stine-600 hover:underline" to={`/shops/${p.shop.id}`}>
                      {p.shop.shopDate.slice(0, 10)}
                    </Link>
                  </td>
                  <td className="pr-4">
                    <span className={`badge ${STATUS_COLOR[p.status] ?? "bg-slate-100 text-slate-700"}`}>
                      {p.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="space-x-1">
                    {isMine && p.status === "open" && (
                      <button className="btn-secondary text-xs" disabled={busy === p.id} onClick={() => act(p.id, "acknowledge")}>
                        Acknowledge
                      </button>
                    )}
                    {isMine && (p.status === "acknowledged" || p.status === "in_progress") && (
                      <button className="btn-secondary text-xs" disabled={busy === p.id} onClick={() => act(p.id, "complete")}>
                        Mark complete
                      </button>
                    )}
                    {canVerify && p.status === "completed" && verifyId !== p.id && (
                      <button className="btn-primary text-xs" disabled={busy === p.id} onClick={() => setVerifyId(p.id)}>
                        Verify
                      </button>
                    )}
                    {canVerify && p.status === "completed" && verifyId === p.id && (
                      <div className="flex flex-col gap-1 mt-1">
                        <input
                          className="input text-xs py-1"
                          placeholder="Verification notes (optional)"
                          value={verifyNotes}
                          onChange={(e) => setVerifyNotes(e.target.value)}
                        />
                        <div className="flex gap-1">
                          <button className="btn-primary text-xs" disabled={busy === p.id} onClick={() => act(p.id, "verify")}>
                            Confirm
                          </button>
                          <button className="text-xs text-slate-500" onClick={() => { setVerifyId(null); setVerifyNotes(""); }}>
                            cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
