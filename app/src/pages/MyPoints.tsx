import { Link } from "react-router-dom";
import { gamificationActiveForLocation, useStore } from "../store";
import { formatRelative, scoreClass } from "../format";
import { TrendChart } from "../components/TrendChart";
import { BadgeChip } from "../components/BadgeChip";

export default function MyPoints() {
  const {
    currentUser,
    shops,
    pointsLedger,
    userBadges,
    badgeCatalog,
    systemConfig,
  } = useStore();

  if (!gamificationActiveForLocation(systemConfig, currentUser.primaryLocationId)) {
    return (
      <div className="empty">
        Gamification is not enabled for your location yet.{" "}
        <Link to="/">Back to dashboard</Link>
      </div>
    );
  }

  const myShops = shops
    .filter((s) => s.evaluatedEmployeeId === currentUser.id)
    .sort((a, b) => a.shopDate.localeCompare(b.shopDate));

  const myEntries = pointsLedger
    .filter((e) => e.userId === currentUser.id)
    .sort((a, b) => b.awardedAt.localeCompare(a.awardedAt));

  const total = myEntries.reduce((sum, e) => sum + e.points, 0);
  const myEarnedBadgeCodes = new Set(
    userBadges.filter((b) => b.userId === currentUser.id).map((b) => b.badgeCode),
  );

  let streak = 0;
  for (let i = myShops.length - 1; i >= 0; i--) {
    if (myShops[i].percentage >= 85) streak++;
    else break;
  }

  const personalBest = Math.max(0, ...myShops.map((s) => s.percentage));
  const last3 = myShops.slice(-3);
  const last3Avg = last3.length
    ? Math.round(last3.reduce((sum, s) => sum + s.percentage, 0) / last3.length)
    : 0;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>My points</h1>
          <div className="sub">
            Recognition for the things you do well — additive only.
          </div>
        </div>
      </div>

      <div className="tiles">
        <div className="tile">
          <div className="label">Total points</div>
          <div className="value" style={{ color: "var(--c-primary)" }}>{total}</div>
          <div className="delta">all time</div>
        </div>
        <div className="tile">
          <div className="label">Personal best</div>
          <div className={`value ${scoreClass(personalBest)}`}>{personalBest}%</div>
        </div>
        <div className="tile">
          <div className="label">3-Shop average</div>
          <div className={`value ${scoreClass(last3Avg)}`}>{last3Avg}%</div>
        </div>
        <div className="tile">
          <div className="label">Streak</div>
          <div className="value" style={{ color: streak ? "var(--c-warn)" : undefined }}>
            {streak}
          </div>
          <div className="delta">consecutive ≥ 85</div>
        </div>
      </div>

      <div className="card">
        <h2>Score trend</h2>
        <TrendChart
          points={myShops.map((s) => ({
            x: s.shopDate,
            y: s.percentage,
            label: `${s.percentage}%`,
          }))}
        />
      </div>

      <div className="card">
        <h2>Badges</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {badgeCatalog.map((b) => (
            <BadgeChip
              key={b.code}
              badge={b}
              earned={myEarnedBadgeCodes.has(b.code)}
            />
          ))}
        </div>
      </div>

      <div className="card">
        <h2>Points ledger</h2>
        <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
          Append-only — entries never removed once awarded.
        </div>
        {myEntries.length === 0 ? (
          <div className="empty">No points yet.</div>
        ) : (
          <table className="list">
            <thead>
              <tr>
                <th>When</th>
                <th>Source</th>
                <th>Points</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {myEntries.map((e) => (
                <tr key={e.id}>
                  <td>{formatRelative(e.awardedAt)}</td>
                  <td>
                    <span className="pill">{e.source.replace(/_/g, " ")}</span>
                  </td>
                  <td style={{ fontWeight: 700, color: e.points >= 0 ? "var(--c-success)" : "var(--c-danger)" }}>
                    {e.points > 0 ? "+" : ""}
                    {e.points}
                  </td>
                  <td>{e.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
