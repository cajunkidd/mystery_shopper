import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";

interface Overview {
  users: { total: number; active: number };
  locations: number;
  shops: { graded: number; queue: number };
  actionPlans: { total: number; overdue: number };
  openAppeals: number;
  badgesEarned: number;
  trainingOpen: number;
  rubricsActive: number;
  leaguesActive: number;
  auditLast24h: number;
}

interface Health {
  ok: boolean;
  uptimeSeconds: number;
  db: "ok" | "error";
  dbLatencyMs: number;
  ai: { configured: boolean; model: string };
  scheduler: { enabled: boolean };
}

export default function AdminOverview() {
  const [data, setData] = useState<Overview | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [running, setRunning] = useState(false);
  const [lastJobResult, setLastJobResult] = useState<unknown>(null);

  useEffect(() => {
    api<Overview>("/admin/overview").then(setData);
    api<Health>("/health").then(setHealth);
  }, []);

  async function runJobsNow() {
    setRunning(true);
    try {
      const r = await api<{ result: unknown }>("/admin/jobs/run", { method: "POST", body: JSON.stringify({}) });
      setLastJobResult(r.result);
    } finally {
      setRunning(false);
    }
  }

  if (!data) return <p className="text-slate-500">Loading…</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Admin overview</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile label="Users" value={`${data.users.active} / ${data.users.total}`} hint="active / total" link="/admin/users" />
        <Tile label="Locations" value={String(data.locations)} />
        <Tile label="Graded shops" value={String(data.shops.graded)} hint={`${data.shops.queue} in queue`} link="/shops" />
        <Tile
          label="Action plans"
          value={String(data.actionPlans.total)}
          hint={data.actionPlans.overdue > 0 ? `${data.actionPlans.overdue} overdue` : "none overdue"}
          tone={data.actionPlans.overdue > 0 ? "amber" : undefined}
          link="/action-plans"
        />
        <Tile label="Open appeals" value={String(data.openAppeals)} link="/appeals" />
        <Tile label="Badges earned" value={String(data.badgesEarned)} link="/recognition" />
        <Tile label="Training open" value={String(data.trainingOpen)} link="/admin/training" />
        <Tile label="Rubrics active" value={String(data.rubricsActive)} link="/admin/rubrics" />
        <Tile label="Leagues active" value={String(data.leaguesActive)} link="/admin/gamification" />
        <Tile label="Audit (24h)" value={String(data.auditLast24h)} link="/admin/audit-log" />
      </div>

      {health && (
        <div className="card">
          <h2 className="font-medium mb-2">System status</h2>
          <ul className="text-sm space-y-1">
            <li>
              Database:{" "}
              <span className={`badge ${health.db === "ok" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                {health.db}
              </span>{" "}
              <span className="text-xs text-slate-400">{health.dbLatencyMs}ms</span>
            </li>
            <li>
              AI:{" "}
              <span className={`badge ${health.ai.configured ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                {health.ai.configured ? "configured" : "not configured"}
              </span>{" "}
              <span className="text-xs text-slate-400">{health.ai.model}</span>
            </li>
            <li>
              Scheduler:{" "}
              <span className={`badge ${health.scheduler.enabled ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>
                {health.scheduler.enabled ? "running" : "disabled"}
              </span>
            </li>
            <li className="text-xs text-slate-500">
              Uptime: {Math.floor(health.uptimeSeconds / 3600)}h {Math.floor((health.uptimeSeconds % 3600) / 60)}m
            </li>
          </ul>
          <button className="btn-secondary text-xs mt-3" disabled={running} onClick={runJobsNow}>
            {running ? "Running…" : "Run scheduler now"}
          </button>
          {lastJobResult != null && (
            <pre className="text-xs mt-2 bg-slate-50 p-2 rounded overflow-auto">{JSON.stringify(lastJobResult, null, 2)}</pre>
          )}
        </div>
      )}
    </div>
  );
}

function Tile({
  label,
  value,
  hint,
  link,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  link?: string;
  tone?: "amber";
}) {
  const inner = (
    <div className={`card ${tone === "amber" ? "border-amber-200 bg-amber-50" : ""}`}>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-2xl font-semibold text-slate-800 mt-1">{value}</div>
      {hint && <div className="text-xs text-slate-400 mt-1">{hint}</div>}
    </div>
  );
  return link ? (
    <Link to={link} className="block hover:opacity-90">
      {inner}
    </Link>
  ) : (
    inner
  );
}
