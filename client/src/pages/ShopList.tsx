import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

interface ShopRow {
  id: string;
  shopDate: string;
  type: string;
  status: string;
  percentage: number;
  totalScore: number;
  totalMax: number;
  location: { code: string; name: string };
  evaluatedEmployee: { fullName: string } | null;
  review: { status: string } | null;
}
interface FilterState {
  status: string;
  type: string;
  from: string;
  to: string;
}

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  submitted: "bg-amber-100 text-amber-800",
  under_review: "bg-amber-100 text-amber-800",
  action_assigned: "bg-blue-100 text-blue-800",
  closed: "bg-emerald-100 text-emerald-800",
  appealed: "bg-rose-100 text-rose-800",
};

export default function ShopList() {
  const [shops, setShops] = useState<ShopRow[] | null>(null);
  const [filters, setFilters] = useState<FilterState>({ status: "", type: "", from: "", to: "" });

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.type) params.set("type", filters.type);
    if (filters.from) params.set("from", new Date(filters.from).toISOString());
    if (filters.to) params.set("to", new Date(filters.to).toISOString());
    const s = params.toString();
    return s ? `?${s}` : "";
  }, [filters]);

  useEffect(() => {
    api<{ shops: ShopRow[] }>(`/shops${queryString}`).then((r) => setShops(r.shops));
  }, [queryString]);

  if (!shops) return <p className="text-slate-500">Loading…</p>;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Shops</h1>
        <Link to="/shops/new" className="btn-primary">
          New shop
        </Link>
      </div>
      <div className="card flex flex-wrap gap-3 items-end">
        <div>
          <label className="label">Status</label>
          <select className="input" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under review</option>
            <option value="action_assigned">Action assigned</option>
            <option value="closed">Closed</option>
            <option value="appealed">Appealed</option>
          </select>
        </div>
        <div>
          <label className="label">Type</label>
          <select className="input" value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
            <option value="">All</option>
            <option value="visit">Visit</option>
            <option value="call">Call</option>
            <option value="web_inquiry">Web</option>
            <option value="social_inquiry">Social</option>
          </select>
        </div>
        <div>
          <label className="label">From</label>
          <input className="input" type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
        </div>
        <div>
          <label className="label">To</label>
          <input className="input" type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
        </div>
        {(filters.status || filters.type || filters.from || filters.to) && (
          <button
            className="btn-secondary text-xs"
            onClick={() => setFilters({ status: "", type: "", from: "", to: "" })}
          >
            Reset
          </button>
        )}
      </div>
      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left text-slate-500 text-xs uppercase">
            <tr>
              <th className="py-2 pr-4">Date</th>
              <th className="pr-4">Location</th>
              <th className="pr-4">Type</th>
              <th className="pr-4">Employee</th>
              <th className="pr-4">Score</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {shops.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-slate-400">
                  No shops yet.
                </td>
              </tr>
            )}
            {shops.map((s) => (
              <tr key={s.id} className="border-t hover:bg-slate-50">
                <td className="py-2 pr-4">
                  <Link className="text-stine-600 hover:underline" to={`/shops/${s.id}`}>
                    {s.shopDate.slice(0, 10)}
                  </Link>
                </td>
                <td className="pr-4">{s.location.name}</td>
                <td className="pr-4">{s.type}</td>
                <td className="pr-4">{s.evaluatedEmployee?.fullName ?? "—"}</td>
                <td className="pr-4">
                  {s.percentage.toFixed(0)}% <span className="text-slate-400">({s.totalScore.toFixed(0)}/{s.totalMax.toFixed(0)})</span>
                </td>
                <td>
                  <span className={`badge ${STATUS_COLOR[s.status] ?? "bg-slate-100 text-slate-700"}`}>
                    {s.status.replace(/_/g, " ")}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
