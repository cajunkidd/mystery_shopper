import { useEffect, useState } from "react";
import { api } from "../api";

interface Heatmap {
  sections: { id: string; name: string }[];
  rows: {
    locationId: string;
    code: string;
    name: string;
    cells: { sectionId: string; percentage: number | null }[];
  }[];
}

function color(pct: number | null): string {
  if (pct == null) return "bg-slate-100 text-slate-400";
  if (pct >= 90) return "bg-emerald-500 text-white";
  if (pct >= 80) return "bg-emerald-300 text-emerald-900";
  if (pct >= 70) return "bg-amber-300 text-amber-900";
  if (pct >= 60) return "bg-orange-300 text-orange-900";
  return "bg-rose-400 text-white";
}

export default function HeatmapPage() {
  const [type, setType] = useState<"" | "visit" | "call">("");
  const [data, setData] = useState<Heatmap | null>(null);

  useEffect(() => {
    const q = type ? `?type=${type}` : "";
    api<Heatmap>(`/dashboards/heatmap${q}`).then(setData);
  }, [type]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Heatmap</h1>
        <select className="input w-auto" value={type} onChange={(e) => setType(e.target.value as "" | "visit" | "call")}>
          <option value="">All types</option>
          <option value="visit">Visits only</option>
          <option value="call">Calls only</option>
        </select>
      </div>
      <div className="card overflow-x-auto">
        {!data && <p className="text-slate-500">Loading…</p>}
        {data && data.sections.length === 0 && (
          <p className="text-slate-400 text-sm">No graded shops yet — once shops are graded, the heatmap fills in.</p>
        )}
        {data && data.sections.length > 0 && (
          <table className="text-sm">
            <thead>
              <tr>
                <th className="py-2 pr-4 text-left">Location</th>
                {data.sections.map((s) => (
                  <th key={s.id} className="py-2 px-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    {s.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.locationId} className="border-t">
                  <td className="py-2 pr-4 font-medium">
                    {r.name} <span className="text-slate-400 font-normal">{r.code}</span>
                  </td>
                  {r.cells.map((c) => (
                    <td key={c.sectionId} className="px-1 py-1">
                      <div className={`text-center text-xs font-semibold rounded px-2 py-1 ${color(c.percentage)}`}>
                        {c.percentage == null ? "—" : `${c.percentage.toFixed(0)}%`}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
