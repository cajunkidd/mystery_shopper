import { Link, useNavigate } from "react-router-dom";
import { gamificationActiveForLocation, useStore } from "../store";
import { formatRelative, scoreClass } from "../format";
import type { Shop } from "../types";
import { TrendChart } from "../components/TrendChart";
import { BadgeChip } from "../components/BadgeChip";

export default function Dashboard() {
  const { currentUser } = useStore();
  switch (currentUser.role) {
    case "employee":
      return <EmployeeDashboard />;
    case "store_manager":
      return <StoreManagerDashboard />;
    case "district_manager":
      return <DistrictManagerDashboard />;
    case "admin":
      return <AdminDashboard />;
  }
}

function average(nums: number[]): number {
  if (!nums.length) return 0;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function ShopRow({ shop }: { shop: Shop }) {
  const { getLocation, getUser } = useStore();
  const navigate = useNavigate();
  const loc = getLocation(shop.locationId);
  const emp = shop.evaluatedEmployeeId ? getUser(shop.evaluatedEmployeeId) : null;
  const cls = scoreClass(shop.percentage);
  return (
    <tr className="clickable" onClick={() => navigate(`/shops/${shop.id}`)}>
      <td>{formatRelative(shop.shopDate)}</td>
      <td>{loc?.name}</td>
      <td>{shop.type === "call" ? "Caller" : "Visit"}</td>
      <td>{emp?.fullName ?? <span className="muted">store-level</span>}</td>
      <td>
        <span className={`score ${cls}`}>{shop.percentage}%</span>
      </td>
      <td>
        <span className="pill">{shop.status.replace(/_/g, " ")}</span>
      </td>
    </tr>
  );
}

function EmployeeDashboard() {
  const { currentUser, shops, actionPlans, userBadges, badgeCatalog, systemConfig } = useStore();
  const gamificationOn = gamificationActiveForLocation(systemConfig, currentUser.primaryLocationId);
  const myShops = shops.filter((s) => s.evaluatedEmployeeId === currentUser.id);
  const sorted = [...myShops].sort((a, b) => b.shopDate.localeCompare(a.shopDate));
  const chronological = [...myShops].sort((a, b) => a.shopDate.localeCompare(b.shopDate));
  const latest = sorted[0];
  const trailing3 = sorted.slice(0, 3).map((s) => s.percentage);
  const personalBest = Math.max(0, ...myShops.map((s) => s.percentage));
  const myPlans = actionPlans.filter(
    (a) => a.assignedTo === currentUser.id && a.status !== "verified",
  );
  const myBadgeCodes = new Set(
    userBadges.filter((b) => b.userId === currentUser.id).map((b) => b.badgeCode),
  );
  const earnedBadges = badgeCatalog.filter((b) => myBadgeCodes.has(b.code));

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Welcome back, {currentUser.fullName.split(" ")[0]}</h1>
          <div className="sub">Your performance, at a glance</div>
        </div>
      </div>

      <div className="tiles">
        <div className="tile">
          <div className="label">Latest Shop</div>
          <div className={`value ${latest ? scoreClass(latest.percentage) : ""}`}>
            {latest ? `${latest.percentage}%` : "—"}
          </div>
          <div className="delta">{latest ? formatRelative(latest.shopDate) : ""}</div>
        </div>
        <div className="tile">
          <div className="label">3-Shop Average</div>
          <div className={`value ${scoreClass(average(trailing3))}`}>
            {trailing3.length ? `${average(trailing3)}%` : "—"}
          </div>
          <div className="delta">trailing</div>
        </div>
        <div className="tile">
          <div className="label">Personal Best</div>
          <div className="value" style={{ color: "var(--c-success)" }}>
            {personalBest ? `${personalBest}%` : "—"}
          </div>
          <div className="delta">all time</div>
        </div>
        <div className="tile">
          <div className="label">Open Action Plans</div>
          <div className="value">{myPlans.length}</div>
          <div className="delta">to acknowledge or complete</div>
        </div>
      </div>

      {chronological.length > 1 && (
        <div className="card">
          <h2>Score trend</h2>
          <TrendChart
            points={chronological.map((s) => ({
              x: s.shopDate,
              y: s.percentage,
              label: `${s.percentage}%`,
            }))}
          />
        </div>
      )}

      {gamificationOn && earnedBadges.length > 0 && (
        <div className="card">
          <h2>Your badges</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {earnedBadges.map((b) => (
              <BadgeChip key={b.code} badge={b} earned />
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <h2>Recent shops</h2>
        {sorted.length === 0 ? (
          <div className="empty">No shops yet.</div>
        ) : (
          <table className="list">
            <thead>
              <tr>
                <th>Date</th>
                <th>Location</th>
                <th>Type</th>
                <th>Employee</th>
                <th>Score</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s) => (
                <ShopRow key={s.id} shop={s} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h2>Open action plans</h2>
        {myPlans.length === 0 ? (
          <div className="empty">Nothing open. Nice.</div>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {myPlans.map((p) => (
              <li key={p.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--c-border)" }}>
                <div className="flex-between">
                  <div>
                    <div style={{ fontWeight: 600 }}>{p.category}</div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      Due {formatRelative(p.dueDate)} · <span className="pill">{p.status}</span>
                    </div>
                    <div style={{ marginTop: 4 }}>{p.description}</div>
                  </div>
                  <Link className="btn small" to={`/shops/${p.shopId}`}>
                    Open
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function StoreManagerDashboard() {
  const { currentUser, shops, users, actionPlans, appeals } = useStore();
  const locId = currentUser.primaryLocationId;
  const teamShops = shops.filter((s) => s.locationId === locId);
  const sortedTeamShops = [...teamShops].sort((a, b) =>
    b.shopDate.localeCompare(a.shopDate),
  );
  const queue = sortedTeamShops.filter((s) =>
    ["submitted", "under_review"].includes(s.status),
  );
  const teamMembers = users.filter((u) => u.primaryLocationId === locId && u.role === "employee");
  const openAppeals = appeals.filter((a) =>
    teamShops.some((s) => s.id === a.shopId) && a.status !== "approved" && a.status !== "denied",
  );
  const openPlans = actionPlans.filter(
    (p) =>
      teamMembers.some((u) => u.id === p.assignedTo) &&
      p.status !== "verified" &&
      p.status !== "completed",
  );
  const teamAvg = average(sortedTeamShops.slice(0, 10).map((s) => s.percentage));

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Store dashboard</h1>
          <div className="sub">{currentUser.fullName} · store manager</div>
        </div>
        <Link className="btn primary" to="/shops/new">+ Enter shop</Link>
      </div>

      <div className="tiles">
        <div className="tile">
          <div className="label">Needs your review</div>
          <div className="value" style={{ color: queue.length ? "var(--c-warn)" : "var(--c-text-muted)" }}>
            {queue.length}
          </div>
          <div className="delta">submitted shops</div>
        </div>
        <div className="tile">
          <div className="label">Store score (last 10)</div>
          <div className={`value ${scoreClass(teamAvg)}`}>{teamAvg}%</div>
          <div className="delta">trailing avg</div>
        </div>
        <div className="tile">
          <div className="label">Open action plans</div>
          <div className="value">{openPlans.length}</div>
          <div className="delta">across {teamMembers.length} team members</div>
        </div>
        <div className="tile">
          <div className="label">Open appeals</div>
          <div className="value" style={{ color: openAppeals.length ? "var(--c-warn)" : "var(--c-text-muted)" }}>
            {openAppeals.length}
          </div>
          <div className="delta">awaiting your resolution</div>
        </div>
      </div>

      <div className="card">
        <h2>Needs your attention</h2>
        {queue.length === 0 ? (
          <div className="empty">Queue is clear.</div>
        ) : (
          <table className="list">
            <thead>
              <tr>
                <th>Date</th>
                <th>Location</th>
                <th>Type</th>
                <th>Employee</th>
                <th>Score</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((s) => (
                <ShopRow key={s.id} shop={s} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h2>Recent shops at this location</h2>
        <table className="list">
          <thead>
            <tr>
              <th>Date</th>
              <th>Location</th>
              <th>Type</th>
              <th>Employee</th>
              <th>Score</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sortedTeamShops.map((s) => (
              <ShopRow key={s.id} shop={s} />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function DistrictManagerDashboard() {
  const { currentUser, shops, locations } = useStore();
  const myDistricts = currentUser.districtIds;
  const districtLocs = locations.filter((l) => myDistricts.includes(l.district));
  const districtShops = shops.filter((s) =>
    districtLocs.some((l) => l.id === s.locationId),
  );
  const overallAvg = average(districtShops.map((s) => s.percentage));

  return (
    <>
      <div className="page-header">
        <div>
          <h1>District dashboard</h1>
          <div className="sub">
            {myDistricts.join(" · ")} · {districtLocs.length} stores
          </div>
        </div>
      </div>

      <div className="tiles">
        <div className="tile">
          <div className="label">District average</div>
          <div className={`value ${scoreClass(overallAvg)}`}>{overallAvg}%</div>
          <div className="delta">across {districtShops.length} shops</div>
        </div>
        <div className="tile">
          <div className="label">Stores</div>
          <div className="value">{districtLocs.length}</div>
        </div>
        <div className="tile">
          <div className="label">Shops graded</div>
          <div className="value">{districtShops.length}</div>
        </div>
      </div>

      <div className="card">
        <h2>Store rollup</h2>
        <table className="list">
          <thead>
            <tr>
              <th>Store</th>
              <th>City</th>
              <th>Shops</th>
              <th>Avg score</th>
            </tr>
          </thead>
          <tbody>
            {districtLocs.map((loc) => {
              const sh = districtShops.filter((s) => s.locationId === loc.id);
              const avg = average(sh.map((s) => s.percentage));
              return (
                <tr key={loc.id}>
                  <td>
                    <strong>{loc.name}</strong>{" "}
                    <span className="muted">{loc.code}</span>
                  </td>
                  <td>
                    {loc.city}, {loc.state}
                  </td>
                  <td>{sh.length}</td>
                  <td>
                    {sh.length ? (
                      <span className={`score ${scoreClass(avg)}`}>{avg}%</span>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function AdminDashboard() {
  const { shops, locations, users, actionPlans, appeals } = useStore();
  const overallAvg = average(shops.map((s) => s.percentage));
  const employees = users.filter((u) => u.role === "employee" && u.active).length;
  const openAppeals = appeals.filter(
    (a) => a.status !== "approved" && a.status !== "denied",
  ).length;
  const openPlans = actionPlans.filter(
    (p) => p.status !== "verified" && p.status !== "completed",
  ).length;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Company dashboard</h1>
          <div className="sub">All locations</div>
        </div>
      </div>

      <div className="tiles">
        <div className="tile">
          <div className="label">Company average</div>
          <div className={`value ${scoreClass(overallAvg)}`}>{overallAvg}%</div>
          <div className="delta">across {shops.length} shops</div>
        </div>
        <div className="tile">
          <div className="label">Locations</div>
          <div className="value">{locations.length}</div>
        </div>
        <div className="tile">
          <div className="label">Active employees</div>
          <div className="value">{employees}</div>
        </div>
        <div className="tile">
          <div className="label">Open appeals</div>
          <div className="value" style={{ color: openAppeals ? "var(--c-warn)" : undefined }}>
            {openAppeals}
          </div>
        </div>
        <div className="tile">
          <div className="label">Open action plans</div>
          <div className="value">{openPlans}</div>
        </div>
      </div>

      <div className="card">
        <h2>Heatmap — store × rubric section</h2>
        <Heatmap />
      </div>
    </>
  );
}

function Heatmap() {
  const { shops, locations, rubrics } = useStore();
  const rubric = rubrics.find((r) => r.type === "visit")!;
  const sections = rubric.sections;
  const visitShops = shops.filter((s) => s.type === "visit");

  const cell = (locId: string, sectionId: string): number | null => {
    const section = sections.find((s) => s.id === sectionId)!;
    const qIds = section.questions.map((q) => q.id);
    const qMax = section.questions.reduce((sum, q) => sum + q.maxScore, 0);
    const relevant = visitShops.filter((s) => s.locationId === locId);
    if (!relevant.length) return null;
    const pct = relevant.map((s) => {
      const got = s.answers
        .filter((a) => qIds.includes(a.questionId))
        .reduce((sum, a) => sum + a.scoreAwarded, 0);
      return (got / qMax) * 100;
    });
    return Math.round(pct.reduce((a, b) => a + b, 0) / pct.length);
  };

  function bg(pct: number | null): string {
    if (pct == null) return "var(--c-surface-2)";
    if (pct >= 85) return "#cdebd8";
    if (pct >= 70) return "#fde9c4";
    return "#f6cdc9";
  }

  return (
    <table className="list">
      <thead>
        <tr>
          <th>Store</th>
          {sections.map((s) => (
            <th key={s.id}>{s.name}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {locations.map((loc) => (
          <tr key={loc.id}>
            <td>
              <strong>{loc.name}</strong>
            </td>
            {sections.map((s) => {
              const pct = cell(loc.id, s.id);
              return (
                <td
                  key={s.id}
                  style={{
                    background: bg(pct),
                    fontWeight: 600,
                    textAlign: "center",
                  }}
                >
                  {pct == null ? "—" : `${pct}%`}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
