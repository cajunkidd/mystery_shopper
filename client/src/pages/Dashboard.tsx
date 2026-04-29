import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";

interface EmployeeDashboard {
  latest: { id: string; shopDate: string; percentage: number; type: string } | null;
  trailingAvg: number;
  personalBest: number;
  openActionPlans: number;
  history: { id: string; shopDate: string; percentage: number; type: string }[];
}

interface CompanyDashboard {
  totalShops: number;
  locations: { locationId: string; name: string; code: string; count: number; avg: number }[];
}

interface LocationDashboard {
  avgPercentage: number;
  queue: { id: string; shopDate: string; type: string; evaluatedEmployee: { fullName: string } | null }[];
  recent: { id: string; shopDate: string; percentage: number; type: string; evaluatedEmployee: { fullName: string } | null }[];
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-2xl font-semibold text-slate-800 mt-1">{value}</div>
      {hint && <div className="text-xs text-slate-400 mt-1">{hint}</div>}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [empData, setEmpData] = useState<EmployeeDashboard | null>(null);
  const [companyData, setCompanyData] = useState<CompanyDashboard | null>(null);
  const [locData, setLocData] = useState<LocationDashboard | null>(null);

  useEffect(() => {
    if (!user) return;
    if (user.role === "employee") {
      api<EmployeeDashboard>("/dashboards/me").then(setEmpData);
    } else if (user.role === "store_manager" && user.primaryLocationId) {
      api<LocationDashboard>(`/dashboards/location/${user.primaryLocationId}`).then(setLocData);
    } else if (user.role === "admin") {
      api<CompanyDashboard>("/dashboards/company").then(setCompanyData);
    }
  }, [user]);

  if (!user) return null;

  async function downloadMyData() {
    const t = localStorage.getItem("token");
    const r = await fetch("/api/v1/me/export", {
      headers: t ? { Authorization: `Bearer ${t}` } : {},
    });
    if (!r.ok) return;
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stine-mystery-shop-data.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (user.role === "employee") {
    if (!empData) return <p className="text-slate-500">Loading…</p>;
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Welcome, {user.fullName.split(" ")[0]}</h1>
          <button className="btn-secondary text-xs" onClick={downloadMyData}>
            Download my data
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Tile label="Latest" value={empData.latest ? `${empData.latest.percentage.toFixed(0)}%` : "—"} hint={empData.latest?.shopDate.slice(0, 10)} />
          <Tile label="Trailing avg (3)" value={`${empData.trailingAvg.toFixed(0)}%`} />
          <Tile label="Personal best" value={`${empData.personalBest.toFixed(0)}%`} />
          <Tile label="Open action plans" value={`${empData.openActionPlans}`} />
        </div>
        <div className="card">
          <div className="font-medium mb-2">Recent shops</div>
          <ul className="divide-y">
            {empData.history.length === 0 && <li className="py-4 text-slate-400 text-sm">No shops yet.</li>}
            {empData.history.map((s) => (
              <li key={s.id} className="py-2 flex items-center justify-between text-sm">
                <Link className="text-stine-600 hover:underline" to={`/shops/${s.id}`}>
                  {s.shopDate.slice(0, 10)} · {s.type}
                </Link>
                <span className="font-medium">{s.percentage.toFixed(0)}%</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  if (user.role === "store_manager") {
    if (!locData) return <p className="text-slate-500">Loading…</p>;
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Store dashboard</h1>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Tile label="Avg score" value={`${locData.avgPercentage.toFixed(1)}%`} />
          <Tile label="Needs review" value={`${locData.queue.length}`} />
        </div>
        <div className="card">
          <div className="font-medium mb-2">Needs your attention</div>
          {locData.queue.length === 0 && <p className="text-sm text-slate-400">All clear.</p>}
          <ul className="divide-y">
            {locData.queue.map((s) => (
              <li key={s.id} className="py-2 flex items-center justify-between text-sm">
                <Link to={`/shops/${s.id}`} className="text-stine-600 hover:underline">
                  {s.shopDate.slice(0, 10)} · {s.type} · {s.evaluatedEmployee?.fullName ?? "—"}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="card">
          <div className="font-medium mb-2">Recent shops</div>
          <ul className="divide-y">
            {locData.recent.slice(0, 10).map((s) => (
              <li key={s.id} className="py-2 flex items-center justify-between text-sm">
                <Link to={`/shops/${s.id}`} className="text-stine-600 hover:underline">
                  {s.shopDate.slice(0, 10)} · {s.evaluatedEmployee?.fullName ?? "—"}
                </Link>
                <span className="font-medium">{s.percentage.toFixed(0)}%</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  // admin / district
  if (!companyData) return <p className="text-slate-500">Loading…</p>;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Company dashboard</h1>
      <Tile label="Total graded shops" value={`${companyData.totalShops}`} />
      <div className="card">
        <div className="font-medium mb-2">Locations</div>
        <table className="w-full text-sm">
          <thead className="text-left text-slate-500 text-xs uppercase">
            <tr>
              <th className="py-2">Location</th>
              <th>Shops</th>
              <th>Avg</th>
            </tr>
          </thead>
          <tbody>
            {companyData.locations.map((l) => (
              <tr key={l.locationId} className="border-t">
                <td className="py-2">
                  <span className="font-medium">{l.name}</span> <span className="text-slate-400">{l.code}</span>
                </td>
                <td>{l.count}</td>
                <td>{l.avg.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
