import { gamificationActiveForLocation, useStore } from "../store";
import { locationTotalPoints } from "../points";

export default function Leaderboard() {
  const {
    locations,
    users,
    leagues,
    pointsLedger,
    shops,
    systemConfig,
  } = useStore();

  if (!systemConfig.gamificationEnabled) {
    return <div className="empty">Gamification is disabled company-wide.</div>;
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Leagues & leaderboard</h1>
          <div className="sub">
            Top three plus most-improved. We never publicly rank
            bottom-of-pack — see §10 of the spec.
          </div>
        </div>
      </div>

      {leagues.map((lg) => {
        const standings = lg.storeIds
          .map((locId) => {
            const teamUserIds = users
              .filter((u) => u.primaryLocationId === locId && u.role === "employee")
              .map((u) => u.id);
            const points = locationTotalPoints(pointsLedger, teamUserIds);
            const recent = shops.filter((s) => s.locationId === locId);
            const recentAvg = recent.length
              ? Math.round(
                  recent.reduce((sum, s) => sum + s.percentage, 0) / recent.length,
                )
              : 0;
            const earlier = recent.filter((s) => s.shopDate < "2026-04-01");
            const earlierAvg = earlier.length
              ? Math.round(
                  earlier.reduce((sum, s) => sum + s.percentage, 0) / earlier.length,
                )
              : recentAvg;
            const improvement = recentAvg - earlierAvg;
            const loc = locations.find((l) => l.id === locId)!;
            const enabled = gamificationActiveForLocation(systemConfig, locId);
            return { loc, points, recentAvg, improvement, enabled };
          })
          .filter((row) => row.enabled);

        if (standings.length === 0) return null;

        const ranked = [...standings].sort((a, b) => b.points - a.points);
        const top3 = ranked.slice(0, 3);
        const mostImproved = [...standings].sort(
          (a, b) => b.improvement - a.improvement,
        )[0];

        return (
          <div className="card" key={lg.id}>
            <h2>{lg.name}</h2>
            <div className="muted" style={{ fontSize: 12, marginBottom: 12 }}>
              Period {lg.periodStart} → {lg.periodEnd} · {lg.storeIds.length} stores
            </div>

            <table className="list">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Store</th>
                  <th>Points</th>
                  <th>Avg score</th>
                </tr>
              </thead>
              <tbody>
                {top3.map((row, idx) => (
                  <tr key={row.loc.id}>
                    <td style={{ fontWeight: 700 }}>
                      {["🥇", "🥈", "🥉"][idx] ?? "—"}
                    </td>
                    <td>
                      <strong>{row.loc.name}</strong>{" "}
                      <span className="muted">{row.loc.code}</span>
                    </td>
                    <td>{row.points}</td>
                    <td>{row.recentAvg}%</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {mostImproved && mostImproved.improvement > 0 && (
              <div className="callout success" style={{ marginTop: 12 }}>
                <strong>Most improved:</strong> {mostImproved.loc.name} —{" "}
                +{mostImproved.improvement} points vs. prior period
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
