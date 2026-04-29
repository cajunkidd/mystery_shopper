import { useEffect, useState } from "react";
import { api } from "../../api";

interface AuditEntry {
  id: string;
  actorId: string | null;
  actorLabel: string | null;
  entityType: string;
  entityId: string;
  entityLabel: string | null;
  action: string;
  before: unknown;
  after: unknown;
  occurredAt: string;
  ipAddress: string | null;
}

export default function AuditLog() {
  const [items, setItems] = useState<AuditEntry[] | null>(null);
  const [filter, setFilter] = useState("");
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const q = filter ? `?entityType=${encodeURIComponent(filter)}` : "";
    api<{ items: AuditEntry[]; nextBefore: string | null }>(`/admin/audit-log${q}`).then((r) => {
      setItems(r.items);
      setNextBefore(r.nextBefore);
    });
  }, [filter]);

  async function loadMore() {
    if (!nextBefore) return;
    setLoadingMore(true);
    try {
      const params = new URLSearchParams();
      if (filter) params.set("entityType", filter);
      params.set("before", nextBefore);
      const r = await api<{ items: AuditEntry[]; nextBefore: string | null }>(
        `/admin/audit-log?${params.toString()}`,
      );
      setItems((cur) => [...(cur ?? []), ...r.items]);
      setNextBefore(r.nextBefore);
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Audit log</h1>
        <select className="input w-auto" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All entities</option>
          <option value="review">Reviews</option>
          <option value="shop">Shops</option>
          <option value="appeal">Appeals</option>
        </select>
      </div>
      {!items && <p className="text-slate-500">Loading…</p>}
      {items && (
        <div className="card overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-slate-500 text-xs uppercase">
              <tr>
                <th className="py-2 pr-4">When</th>
                <th className="pr-4">Actor</th>
                <th className="pr-4">Entity</th>
                <th className="pr-4">Action</th>
                <th className="pr-4">Before</th>
                <th>After</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr><td colSpan={6} className="py-4 text-center text-slate-400">No audit entries.</td></tr>
              )}
              {items.map((i) => (
                <tr key={i.id} className="border-t align-top">
                  <td className="py-2 pr-4 text-xs text-slate-500">{new Date(i.occurredAt).toLocaleString()}</td>
                  <td className="pr-4 text-xs">
                    {i.actorLabel ?? <span className="text-slate-400 font-mono">{i.actorId?.slice(0, 8) ?? "—"}</span>}
                  </td>
                  <td className="pr-4">
                    <span className="text-xs uppercase text-slate-500">{i.entityType}</span>
                    <div className="text-sm">
                      {i.entityLabel ?? <span className="text-slate-400 italic text-xs">deleted ({i.entityId.slice(0, 8)})</span>}
                    </div>
                  </td>
                  <td className="pr-4 text-sm">{i.action}</td>
                  <td className="pr-4 text-xs font-mono text-slate-500">{JSON.stringify(i.before)}</td>
                  <td className="text-xs font-mono text-slate-500">{JSON.stringify(i.after)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {nextBefore && (
            <div className="mt-3 flex justify-center">
              <button className="btn-secondary text-xs" disabled={loadingMore} onClick={loadMore}>
                {loadingMore ? "Loading…" : "Load older entries"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
