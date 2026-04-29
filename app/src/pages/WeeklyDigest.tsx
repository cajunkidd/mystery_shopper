import { useStore } from "../store";
import { formatRelative } from "../format";

export default function WeeklyDigest() {
  const { currentUser, shops, actionPlans, appeals, locations, users } = useStore();

  const locId = currentUser.primaryLocationId;
  const myDistricts = currentUser.districtIds;
  const inScopeLocations = (() => {
    if (currentUser.role === "store_manager" && locId) {
      return locations.filter((l) => l.id === locId);
    }
    if (currentUser.role === "district_manager") {
      return locations.filter((l) => myDistricts.includes(l.district));
    }
    return locations;
  })();

  const today = new Date("2026-04-29");
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().slice(0, 10);

  const inScopeIds = new Set(inScopeLocations.map((l) => l.id));
  const weekShops = shops.filter(
    (s) => inScopeIds.has(s.locationId) && s.shopDate >= weekAgoStr,
  );
  const weekAvg = weekShops.length
    ? Math.round(weekShops.reduce((sum, s) => sum + s.percentage, 0) / weekShops.length)
    : 0;
  const teamUserIds = users.filter((u) => inScopeIds.has(u.primaryLocationId ?? "")).map((u) => u.id);
  const teamPlans = actionPlans.filter((p) => teamUserIds.includes(p.assignedTo));
  const overdue = teamPlans.filter((p) => p.dueDate < new Date().toISOString().slice(0, 10) && p.status !== "verified" && p.status !== "completed");
  const openAppeals = appeals.filter(
    (a) =>
      shops.find((s) => s.id === a.shopId && inScopeIds.has(s.locationId)) &&
      (a.status === "open" || a.status === "under_review"),
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Weekly digest</h1>
          <div className="sub">
            Phase 4 — scheduled email preview. Generated every Monday at 7 AM
            for managers in scope.
          </div>
        </div>
        <button className="btn" onClick={() => window.print()}>Email/Print</button>
      </div>

      <div
        className="card"
        style={{
          maxWidth: 720,
          background: "#fff",
          border: "1px solid var(--c-border)",
        }}
      >
        <div
          style={{
            background: "#0a2540",
            color: "#fff",
            padding: "14px 18px",
            margin: "-20px -20px 16px",
            borderRadius: "8px 8px 0 0",
          }}
        >
          <div style={{ fontWeight: 700, letterSpacing: 0.4 }}>
            STINE · WEEKLY MYSTERY SHOP DIGEST
          </div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            Week ending {today.toISOString().slice(0, 10)} ·{" "}
            {inScopeLocations.length} location
            {inScopeLocations.length !== 1 ? "s" : ""}
          </div>
        </div>

        <p>Hi {currentUser.fullName.split(" ")[0]},</p>
        <p>Here's the rundown for your team this week:</p>

        <ul>
          <li>
            <strong>{weekShops.length}</strong> shop{weekShops.length === 1 ? "" : "s"} graded · average <strong>{weekAvg}%</strong>
          </li>
          <li>
            <strong>{teamPlans.filter((p) => p.status !== "verified" && p.status !== "completed").length}</strong> open action plans
            {overdue.length > 0 && (
              <span style={{ color: "var(--c-danger)" }}>
                {" "}
                · {overdue.length} overdue
              </span>
            )}
          </li>
          <li>
            <strong>{openAppeals.length}</strong> open appeal{openAppeals.length === 1 ? "" : "s"}
          </li>
        </ul>

        <h3>This week's top moment</h3>
        {(() => {
          const top = [...weekShops].sort((a, b) => b.percentage - a.percentage)[0];
          if (!top) return <p className="muted">No shops graded this week.</p>;
          const emp = users.find((u) => u.id === top.evaluatedEmployeeId);
          const loc = locations.find((l) => l.id === top.locationId);
          return (
            <p>
              <strong>{emp?.fullName ?? "—"}</strong> at {loc?.name} — {top.percentage}%
              {" "}<span className="muted">({formatRelative(top.shopDate)})</span>
            </p>
          );
        })()}

        <h3>Needs attention</h3>
        {overdue.length === 0 ? (
          <p>No overdue action plans. Nice.</p>
        ) : (
          <ul>
            {overdue.slice(0, 5).map((p) => {
              const emp = users.find((u) => u.id === p.assignedTo);
              return (
                <li key={p.id}>
                  {emp?.fullName} — {p.category} (due {formatRelative(p.dueDate)})
                </li>
              );
            })}
          </ul>
        )}

        <p className="muted" style={{ fontSize: 12, marginTop: 24, paddingTop: 12, borderTop: "1px solid var(--c-border)" }}>
          You're receiving this because you're a manager at Stine.
          Notification preferences can be changed in Settings.
        </p>
      </div>
    </>
  );
}
