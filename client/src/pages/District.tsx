import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";

interface DistrictData {
  district: string;
  totalShops: number;
  openAppeals: number;
  locations: { locationId: string; name: string; code: string; count: number; avg: number }[];
}

export default function District() {
  const { name } = useParams<{ name: string }>();
  const [data, setData] = useState<DistrictData | null>(null);

  useEffect(() => {
    if (!name) return;
    api<DistrictData>(`/dashboards/district/${encodeURIComponent(name)}`).then(setData);
  }, [name]);

  if (!data) return <p className="text-slate-500">Loading…</p>;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{data.district}</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="card">
          <div className="text-xs uppercase text-slate-500">Total shops</div>
          <div className="text-2xl font-semibold">{data.totalShops}</div>
        </div>
        <div className="card">
          <div className="text-xs uppercase text-slate-500">Open appeals</div>
          <div className="text-2xl font-semibold">{data.openAppeals}</div>
        </div>
      </div>
      <div className="card">
        <h2 className="font-medium mb-2">Stores</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="py-2">Location</th>
              <th>Shops</th>
              <th>Avg</th>
            </tr>
          </thead>
          <tbody>
            {data.locations.map((l) => (
              <tr key={l.locationId} className="border-t">
                <td className="py-2">{l.name} <span className="text-slate-400">{l.code}</span></td>
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
