import { useEffect, useState } from "react";
import { api } from "../../api";

interface AuditEntry {
  id: string;
  actorId: string | null;
  entityType: string;
  entityId: string;
  action: string;
  before: unknown;
  after: unknown;
  occurredAt: string;
  ipAddress: string | null;
}

export default function AuditLog() {
  const [items, setItems] = useState<AuditEntry[] | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    const q = filter ? `?entityType=${encodeURIComponent(filter)}` : "";
    api<{ items: AuditEntry[] }>(`/admin/audit-log${q}`).then((r) => setItems(r.items));
  }, [filter]);

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
                  <td className="pr-4 text-xs font-mono">{i.actorId?.slice(0, 8) ?? "—"}</td>
                  <td className="pr-4">{i.entityType} <span className="text-xs text-slate-400">{i.entityId.slice(0, 8)}</span></td>
                  <td className="pr-4">{i.action}</td>
                  <td className="pr-4 text-xs font-mono text-slate-500">{JSON.stringify(i.before)}</td>
                  <td className="text-xs font-mono text-slate-500">{JSON.stringify(i.after)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
