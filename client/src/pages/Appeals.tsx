import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";

interface Appeal {
  id: string;
  shopId: string;
  reason: string;
  requestedChange: string | null;
  status: string;
  filedAt: string;
  resolutionNotes: string | null;
  shop: { id: string; shopDate: string; percentage: number };
  filedBy: { fullName: string };
}

export default function Appeals() {
  const { user } = useAuth();
  const [appeals, setAppeals] = useState<Appeal[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  function load() {
    api<{ appeals: Appeal[] }>("/appeals").then((r) => setAppeals(r.appeals));
  }
  useEffect(load, []);

  async function resolve(id: string, status: "approved" | "partially_approved" | "denied") {
    const notes = window.prompt("Resolution notes (required):");
    if (!notes) return;
    setBusy(id);
    try {
      await api(`/appeals/${id}/resolve`, {
        method: "POST",
        body: JSON.stringify({ status, resolutionNotes: notes }),
      });
      load();
    } finally {
      setBusy(null);
    }
  }

  if (!appeals || !user) return <p className="text-slate-500">Loading…</p>;
  const canResolve = ["store_manager", "district_manager", "admin"].includes(user.role);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Appeals</h1>
      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left text-slate-500 text-xs uppercase">
            <tr>
              <th className="py-2 pr-4">Filed</th>
              <th className="pr-4">By</th>
              <th className="pr-4">Shop</th>
              <th className="pr-4">Reason</th>
              <th className="pr-4">Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {appeals.length === 0 && (
              <tr><td colSpan={6} className="py-6 text-center text-slate-400">No appeals.</td></tr>
            )}
            {appeals.map((a) => (
              <tr key={a.id} className="border-t align-top">
                <td className="py-2 pr-4">{a.filedAt.slice(0, 10)}</td>
                <td className="pr-4">{a.filedBy.fullName}</td>
                <td className="pr-4">
                  <Link className="text-stine-600 hover:underline" to={`/shops/${a.shop.id}`}>
                    {a.shop.shopDate.slice(0, 10)} ({a.shop.percentage.toFixed(0)}%)
                  </Link>
                </td>
                <td className="pr-4">{a.reason}</td>
                <td className="pr-4">{a.status}</td>
                <td className="space-x-1">
                  {canResolve && (a.status === "open" || a.status === "under_review") && (
                    <>
                      <button className="btn-secondary text-xs" disabled={busy === a.id} onClick={() => resolve(a.id, "approved")}>
                        Approve
                      </button>
                      <button className="btn-secondary text-xs" disabled={busy === a.id} onClick={() => resolve(a.id, "partially_approved")}>
                        Partial
                      </button>
                      <button className="btn-secondary text-xs" disabled={busy === a.id} onClick={() => resolve(a.id, "denied")}>
                        Deny
                      </button>
                    </>
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
