import { useEffect, useState } from "react";
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
  useEffect(() => {
    api<{ shops: ShopRow[] }>("/shops").then((r) => setShops(r.shops));
  }, []);
  if (!shops) return <p className="text-slate-500">Loading…</p>;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Shops</h1>
        <Link to="/shops/new" className="btn-primary">
          New shop
        </Link>
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
