import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";

interface Location { id: string; name: string; code: string }
interface League {
  id: string; name: string; tier: number; periodStart: string; periodEnd: string;
  storeIds: string[]; rolledOverAt: string | null;
}
interface Challenge {
  id: string; name: string; description: string | null;
  startsAt: string; endsAt: string; metric: string;
  category: string | null; threshold: number | null; active: boolean;
}
interface Hunt {
  id: string; name: string; description: string | null;
  startsAt: string; endsAt: string; active: boolean;
}

export default function GamificationAdmin() {
  const [tab, setTab] = useState<"leagues" | "challenges" | "hunts">("leagues");
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Gamification admin</h1>
      <div className="flex gap-1 border-b">
        {(["leagues", "challenges", "hunts"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-3 py-2 text-sm capitalize ${tab === k ? "border-b-2 border-stine-500 text-stine-700 font-medium" : "text-slate-500"}`}
          >
            {k}
          </button>
        ))}
      </div>
      {tab === "leagues" && <Leagues />}
      {tab === "challenges" && <Challenges />}
      {tab === "hunts" && <Hunts />}
    </div>
  );
}

function Leagues() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [name, setName] = useState("");
  const [tier, setTier] = useState(1);
  const [periodStart, setPeriodStart] = useState(new Date().toISOString().slice(0, 10));
  const [periodEnd, setPeriodEnd] = useState(new Date(Date.now() + 90 * 86400 * 1000).toISOString().slice(0, 10));
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  function load() {
    api<{ locations: Location[] }>("/locations").then((r) => setLocations(r.locations));
    api<{ leagues: League[] }>("/leagues").then((r) => setLeagues(r.leagues));
  }
  useEffect(load, []);

  async function create() {
    if (!name || selected.length < 2) return;
    setBusy(true);
    try {
      await api("/leagues", {
        method: "POST",
        body: JSON.stringify({
          name,
          tier,
          periodStart: new Date(periodStart).toISOString(),
          periodEnd: new Date(periodEnd).toISOString(),
          storeIds: selected,
        }),
      });
      setName("");
      setSelected([]);
      load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card space-y-3">
        <h3 className="font-medium">Create league</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <label className="label">Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">Tier (1 = top)</label>
            <input className="input" type="number" min={1} value={tier} onChange={(e) => setTier(Math.max(1, Number(e.target.value) || 1))} />
          </div>
          <div>
            <label className="label">Period start</label>
            <input className="input" type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
          </div>
          <div>
            <label className="label">Period end</label>
            <input className="input" type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Stores (3–5 recommended; min 2, max 8)</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-1 text-sm">
            {locations.map((l) => (
              <label key={l.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selected.includes(l.id)}
                  onChange={(e) => {
                    if (e.target.checked) setSelected([...selected, l.id]);
                    else setSelected(selected.filter((x) => x !== l.id));
                  }}
                />
                <span>{l.name} <span className="text-slate-400">{l.code}</span></span>
              </label>
            ))}
          </div>
        </div>
        <button className="btn-primary" disabled={busy || !name || selected.length < 2} onClick={create}>
          Create league
        </button>
      </div>
      <div className="card">
        <h3 className="font-medium mb-2">Leagues ({leagues.length})</h3>
        <ul className="text-sm space-y-1">
          {[...leagues].sort((a, b) => a.tier - b.tier).map((l) => (
            <li key={l.id} className="border-b last:border-0 py-1 flex items-center justify-between">
              <div>
                <span className="font-medium">{l.name}</span>
                <span className="badge ml-2 bg-stine-50 text-stine-700">tier {l.tier}</span>
                <span className="text-slate-400 ml-2">
                  {l.periodStart.slice(0, 10)} → {l.periodEnd.slice(0, 10)} · {l.storeIds.length} stores
                </span>
                {l.rolledOverAt && (
                  <span className="badge ml-2 bg-emerald-50 text-emerald-700">rolled over</span>
                )}
              </div>
              <Link to={`/admin/leagues/${l.id}`} className="text-xs text-stine-600 hover:underline">
                Standings →
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Challenges() {
  const [items, setItems] = useState<Challenge[]>([]);
  const [form, setForm] = useState({
    name: "",
    description: "",
    startsAt: new Date().toISOString().slice(0, 10),
    endsAt: new Date(Date.now() + 30 * 86400 * 1000).toISOString().slice(0, 10),
    metric: "avg_score" as const,
    category: "",
    threshold: "",
  });
  const [busy, setBusy] = useState(false);

  function load() {
    api<{ challenges: Challenge[] }>("/challenges").then((r) => setItems(r.challenges));
  }
  useEffect(load, []);

  async function create() {
    setBusy(true);
    try {
      await api("/challenges", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          description: form.description || undefined,
          startsAt: new Date(form.startsAt).toISOString(),
          endsAt: new Date(form.endsAt).toISOString(),
          metric: form.metric,
          category: form.category || null,
          threshold: form.threshold ? Number(form.threshold) : null,
        }),
      });
      setForm({ ...form, name: "", description: "", category: "", threshold: "" });
      load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card space-y-3">
        <h3 className="font-medium">Create challenge</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="label">Name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Metric</label>
            <select
              className="input"
              value={form.metric}
              onChange={(e) => setForm({ ...form, metric: e.target.value as typeof form.metric })}
            >
              <option value="avg_score">Average score</option>
              <option value="score_above_threshold_count">Shops above threshold</option>
              <option value="category_avg">Category average</option>
            </select>
          </div>
          <div>
            <label className="label">Category (for category_avg)</label>
            <input className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </div>
          <div>
            <label className="label">Threshold (e.g. 70 for "shops ≥ 70%")</label>
            <input className="input" value={form.threshold} onChange={(e) => setForm({ ...form, threshold: e.target.value })} />
          </div>
          <div>
            <label className="label">Starts</label>
            <input className="input" type="date" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
          </div>
          <div>
            <label className="label">Ends</label>
            <input className="input" type="date" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className="label">Description</label>
            <textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
        <button className="btn-primary" disabled={busy || !form.name} onClick={create}>Create</button>
      </div>
      <div className="card">
        <h3 className="font-medium mb-2">Active challenges</h3>
        <ul className="text-sm space-y-1">
          {items.map((c) => (
            <li key={c.id} className="border-b last:border-0 py-1">
              <span className="font-medium">{c.name}</span>
              <span className="text-slate-400 ml-2">
                {c.metric} · {c.startsAt.slice(0, 10)} → {c.endsAt.slice(0, 10)}
              </span>
              {c.description && <div className="text-xs text-slate-500">{c.description}</div>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Hunts() {
  const [items, setItems] = useState<Hunt[]>([]);
  const [form, setForm] = useState({
    name: "",
    description: "",
    startsAt: new Date().toISOString().slice(0, 10),
    endsAt: new Date(Date.now() + 30 * 86400 * 1000).toISOString().slice(0, 10),
  });
  const [busy, setBusy] = useState(false);

  function load() {
    api<{ campaigns: Hunt[] }>("/hunt/campaigns").then((r) => setItems(r.campaigns));
  }
  useEffect(load, []);

  async function create() {
    setBusy(true);
    try {
      await api("/hunt/campaigns", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          description: form.description || undefined,
          startsAt: new Date(form.startsAt).toISOString(),
          endsAt: new Date(form.endsAt).toISOString(),
        }),
      });
      setForm({ ...form, name: "", description: "" });
      load();
    } finally {
      setBusy(false);
    }
  }

  async function deactivate(id: string) {
    setBusy(true);
    try {
      await api(`/hunt/campaigns/${id}/deactivate`, { method: "POST", body: JSON.stringify({}) });
      load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card space-y-3">
        <h3 className="font-medium">Create Hunt campaign</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="label">Name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Window</label>
            <div className="flex gap-2">
              <input className="input" type="date" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
              <input className="input" type="date" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="label">Description (scenario notes for shoppers)</label>
            <textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
        <button className="btn-primary" disabled={busy || !form.name} onClick={create}>Create campaign</button>
      </div>
      <div className="card">
        <h3 className="font-medium mb-2">Hunt campaigns</h3>
        <ul className="text-sm space-y-1">
          {items.map((c) => (
            <li key={c.id} className="border-b last:border-0 py-2 flex items-start justify-between">
              <div>
                <div>
                  <span className="font-medium">{c.name}</span>
                  <span className={`badge ml-2 ${c.active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                    {c.active ? "active" : "inactive"}
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  {c.startsAt.slice(0, 10)} → {c.endsAt.slice(0, 10)}
                </div>
                {c.description && <div className="text-xs text-slate-600 mt-1">{c.description}</div>}
              </div>
              {c.active && (
                <button className="btn-secondary text-xs" disabled={busy} onClick={() => deactivate(c.id)}>
                  Deactivate
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
