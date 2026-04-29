import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../api";

interface Session {
  id: string;
  name: string;
  notes: string | null;
  createdAt: string;
  _count?: { entries: number };
}
interface Entry {
  id: string;
  shopId: string;
  reviewerId: string;
  scorePercentage: number;
  notes: string | null;
}
interface Stats {
  perShop: { shopId: string; scores: number[]; delta: number }[];
  averageDelta: number;
  passes: boolean;
}
interface ShopOption {
  id: string;
  shopDate: string;
  type: string;
  evaluatedEmployee: { fullName: string } | null;
  location: { name: string };
}

export function CalibrationList() {
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");

  function load() {
    api<{ sessions: Session[] }>("/calibration").then((r) => setSessions(r.sessions));
  }
  useEffect(load, []);

  async function create() {
    if (!name.trim()) return;
    await api("/calibration", { method: "POST", body: JSON.stringify({ name, notes: notes || undefined }) });
    setName("");
    setNotes("");
    load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Calibration sessions</h1>
      <p className="text-sm text-slate-500">
        Per spec §13: before turning on gamification at any location, two reviewers grade the same 10
        shops. If the average delta exceeds 8 points, retrain rubric or reviewers.
      </p>
      <div className="card space-y-2">
        <h3 className="font-medium">New session</h3>
        <input className="input" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <textarea className="input" rows={2} placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <button className="btn-primary" disabled={!name.trim()} onClick={create}>Create session</button>
      </div>
      {!sessions && <p className="text-slate-500">Loading…</p>}
      {sessions && (
        <div className="card">
          {sessions.length === 0 && <p className="text-sm text-slate-400">No sessions yet.</p>}
          <ul className="divide-y">
            {sessions.map((s) => (
              <li key={s.id} className="py-2 flex items-center justify-between text-sm">
                <Link to={`/admin/calibration/${s.id}`} className="text-stine-600 hover:underline">
                  {s.name}
                </Link>
                <span className="text-xs text-slate-400">
                  {s._count?.entries ?? 0} entries · {s.createdAt.slice(0, 10)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function CalibrationDetail() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<{ session: Session & { entries: Entry[] }; stats: Stats } | null>(null);
  const [shopId, setShopId] = useState("");
  const [score, setScore] = useState("");
  const [busy, setBusy] = useState(false);
  const [shopOptions, setShopOptions] = useState<ShopOption[]>([]);

  function load() {
    if (!id) return;
    api<{ session: Session & { entries: Entry[] }; stats: Stats }>(`/calibration/${id}`).then(setData);
  }
  useEffect(load, [id]);

  useEffect(() => {
    api<{ shops: ShopOption[] }>("/shops?limit=50").then((r) => setShopOptions(r.shops));
  }, []);

  async function submit() {
    if (!id || !shopId || !score) return;
    setBusy(true);
    try {
      await api(`/calibration/${id}/entries`, {
        method: "POST",
        body: JSON.stringify({ shopId, scorePercentage: Number(score) }),
      });
      setShopId("");
      setScore("");
      load();
    } finally {
      setBusy(false);
    }
  }

  if (!data) return <p className="text-slate-500">Loading…</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{data.session.name}</h1>
      {data.session.notes && <p className="text-sm text-slate-500">{data.session.notes}</p>}

      <div className="card space-y-2">
        <h3 className="font-medium">Submit your score</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <select className="input" value={shopId} onChange={(e) => setShopId(e.target.value)}>
            <option value="">— pick a shop —</option>
            {shopOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.shopDate.slice(0, 10)} · {s.location.name} · {s.type}
                {s.evaluatedEmployee ? ` · ${s.evaluatedEmployee.fullName}` : ""}
              </option>
            ))}
          </select>
          <input
            className="input"
            type="number"
            min="0"
            max="110"
            placeholder="Your score (%)"
            value={score}
            onChange={(e) => setScore(e.target.value)}
          />
          <button className="btn-primary" disabled={busy || !shopId || !score} onClick={submit}>
            Submit / update
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Each reviewer submits independently. Re-submitting updates your prior score.
        </p>
      </div>

      <div className={`card ${data.stats.passes ? "bg-emerald-50" : "bg-rose-50"}`}>
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Reviewer agreement</h3>
          <span className={`badge ${data.stats.passes ? "bg-emerald-200 text-emerald-900" : "bg-rose-200 text-rose-900"}`}>
            avg delta {data.stats.averageDelta.toFixed(1)} pts
          </span>
        </div>
        <p className="text-sm mt-2">
          {data.stats.passes
            ? "Average delta ≤8 points. Reviewers are aligned (§13)."
            : "Average delta exceeds 8 points — retrain reviewers or the rubric before enabling gamification."}
        </p>
      </div>

      <div className="card">
        <h3 className="font-medium mb-2">Per-shop deltas</h3>
        {data.stats.perShop.length === 0 && (
          <p className="text-sm text-slate-400">Need at least 2 reviewers per shop.</p>
        )}
        <ul className="text-sm divide-y">
          {data.stats.perShop.map((p) => (
            <li key={p.shopId} className="py-1 flex justify-between">
              <span className="font-mono text-xs">{p.shopId.slice(0, 8)}</span>
              <span>
                scores: {p.scores.map((s) => s.toFixed(1)).join(", ")} ·{" "}
                <span className={p.delta > 8 ? "text-rose-700 font-medium" : "text-slate-600"}>
                  delta {p.delta.toFixed(1)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
