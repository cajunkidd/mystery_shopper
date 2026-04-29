import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";

interface MyData {
  totalPoints: number;
  recent: { id: string; sourceType: string; points: number; reason: string | null; awardedAt: string }[];
  badges: { id: string; earnedAt: string; badge: { code: string; name: string; description: string | null; category: string } }[];
}

interface Leaderboard {
  scope: string;
  top: { userId: string; fullName: string; points: number }[];
  mostImproved: { userId: string; fullName: string; delta: number } | null;
}

const SOURCE_LABEL: Record<string, string> = {
  shop_score: "Shop score",
  manager_bonus: "Manager bonus",
  improvement_bonus: "Improvement bonus",
  badge_earned: "Badge",
  hunt_reveal: "Hunt reveal",
  streak_bonus: "Streak bonus",
};

export default function Gamification() {
  const { user } = useAuth();
  const [me, setMe] = useState<MyData | null>(null);
  const [board, setBoard] = useState<Leaderboard | null>(null);
  const [scope, setScope] = useState<"store" | "district" | "company">(
    user?.role === "admin" ? "company" : user?.role === "district_manager" ? "district" : "store",
  );

  useEffect(() => {
    api<MyData>("/gamification/me").then(setMe);
  }, []);

  useEffect(() => {
    api<Leaderboard>(`/gamification/leaderboard?scope=${scope}`).then(setBoard);
  }, [scope]);

  if (!me) return <p className="text-slate-500">Loading…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Recognition</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card md:col-span-1">
          <div className="text-xs uppercase tracking-wide text-slate-500">My points</div>
          <div className="text-4xl font-semibold text-stine-700 mt-1">{me.totalPoints}</div>
          <p className="text-xs text-slate-400 mt-1">Append-only ledger; points are permanent.</p>
        </div>
        <div className="card md:col-span-2">
          <div className="font-medium mb-2">My badges ({me.badges.length})</div>
          {me.badges.length === 0 ? (
            <p className="text-sm text-slate-400">No badges yet — check the Badges section to see how to earn them.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {me.badges.map((b) => (
                <div key={b.id} className="border border-stine-100 bg-stine-50 rounded-md px-3 py-2 text-sm">
                  <div className="font-medium text-stine-700">{b.badge.name}</div>
                  <div className="text-xs text-slate-500">{b.badge.description}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium">Leaderboard</h2>
          <select className="input w-auto" value={scope} onChange={(e) => setScope(e.target.value as typeof scope)}>
            <option value="store">My store</option>
            <option value="district">My district</option>
            {user?.role === "admin" && <option value="company">Company-wide</option>}
          </select>
        </div>
        <p className="text-xs text-slate-400 mb-2">Per spec §10: only top 3 + most-improved are shown.</p>
        {board && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs uppercase text-slate-500 mb-1">Top 3</div>
              <ol className="space-y-1">
                {board.top.length === 0 && <li className="text-sm text-slate-400">No points yet.</li>}
                {board.top.map((r, i) => (
                  <li key={r.userId} className="flex justify-between text-sm">
                    <span>
                      <span className="text-slate-400 mr-2">#{i + 1}</span>
                      {r.fullName}
                    </span>
                    <span className="font-medium">{r.points}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <div className="text-xs uppercase text-slate-500 mb-1">Most improved (last 30 days)</div>
              {board.mostImproved ? (
                <p className="text-sm">
                  <span className="font-medium">{board.mostImproved.fullName}</span>
                  <span className="text-slate-500"> — +{board.mostImproved.delta.toFixed(1)} pts vs prior period</span>
                </p>
              ) : (
                <p className="text-sm text-slate-400">Not enough data to compute yet.</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="font-medium mb-2">My recent points</h2>
        {me.recent.length === 0 ? (
          <p className="text-sm text-slate-400">No points awarded yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2">When</th>
                <th>Source</th>
                <th>Reason</th>
                <th className="text-right">Points</th>
              </tr>
            </thead>
            <tbody>
              {me.recent.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="py-2">{r.awardedAt.slice(0, 10)}</td>
                  <td>{SOURCE_LABEL[r.sourceType] ?? r.sourceType}</td>
                  <td className="text-slate-600">{r.reason}</td>
                  <td className="text-right font-medium">{r.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
