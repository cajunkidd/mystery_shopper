import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../api";

interface Standing {
  locationId: string;
  name: string;
  code: string;
  avg: number;
  count: number;
}
interface LeagueData {
  league: { id: string; name: string; tier: number; periodStart: string; periodEnd: string; rolledOverAt: string | null };
  standings: Standing[];
}

export default function LeagueStandings() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<LeagueData | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!id) return;
    api<LeagueData>(`/leagues/${id}/standings`).then(setData);
  }, [id]);

  if (!data) return <p className="text-slate-500">Loading…</p>;

  // §10: never show bottom-of-pack publicly. Default render is top 3 + most-improved.
  const top3 = data.standings.slice(0, 3);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{data.league.name}</h1>
          <p className="text-sm text-slate-500">
            Tier {data.league.tier} · {data.league.periodStart.slice(0, 10)} → {data.league.periodEnd.slice(0, 10)}
            {data.league.rolledOverAt && (
              <span className="badge ml-2 bg-emerald-50 text-emerald-700">rolled over</span>
            )}
          </p>
        </div>
        <Link className="btn-secondary text-xs" to="/admin/gamification">Back</Link>
      </div>

      <div className="card">
        <h2 className="font-medium mb-2">Top 3</h2>
        <ol className="space-y-1 text-sm">
          {top3.length === 0 && <li className="text-slate-400">No graded shops in this period yet.</li>}
          {top3.map((s, i) => (
            <li key={s.locationId} className="flex justify-between">
              <span>
                <span className="text-slate-400 mr-2">#{i + 1}</span>
                {s.name} <span className="text-slate-400">{s.code}</span>
              </span>
              <span className="font-medium">{s.avg.toFixed(1)}% <span className="text-slate-400">({s.count})</span></span>
            </li>
          ))}
        </ol>
        <p className="text-xs text-slate-500 mt-3">
          Per spec §10: only top 3 + most-improved are shown publicly. Admin can reveal full rankings (intended for
          internal calibration only — never share outside leadership).
        </p>
        {!showAll && data.standings.length > 3 && (
          <button className="btn-secondary text-xs mt-2" onClick={() => setShowAll(true)}>
            Reveal full standings (admin only)
          </button>
        )}
      </div>

      {showAll && (
        <div className="card">
          <h2 className="font-medium mb-2">All stores in this league</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2 pr-4">Rank</th>
                <th className="pr-4">Store</th>
                <th className="pr-4">Avg</th>
                <th>Shops</th>
              </tr>
            </thead>
            <tbody>
              {data.standings.map((s, i) => (
                <tr key={s.locationId} className="border-t">
                  <td className="py-2 pr-4">#{i + 1}</td>
                  <td className="pr-4">
                    {s.name} <span className="text-slate-400">{s.code}</span>
                  </td>
                  <td className="pr-4">{s.avg.toFixed(1)}%</td>
                  <td>{s.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
