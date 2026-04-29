import { useEffect, useState } from "react";
import { api } from "../../api";

interface ConfigItem {
  key: string;
  value: unknown;
  updatedAt: string;
}

const KNOWN: { key: string; label: string; help: string; type: "number" | "boolean"; defaultValue: unknown }[] = [
  {
    key: "audio.retention_days",
    label: "Audio retention (days)",
    help: "How long mystery-caller audio is kept before the scheduler deletes it (§11). Default 365.",
    type: "number",
    defaultValue: 365,
  },
  {
    key: "appeal.escalation_days",
    label: "Appeal escalation window (days)",
    help: "Auto-escalate unresolved appeals to district manager after this many days. Default 7.",
    type: "number",
    defaultValue: 7,
  },
  {
    key: "gamification.enabled",
    label: "Gamification enabled",
    help: "Master switch for the points / badges / leaderboards layer (§6.5).",
    type: "boolean",
    defaultValue: true,
  },
];

export default function Config() {
  const [items, setItems] = useState<ConfigItem[] | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    api<{ items: ConfigItem[] }>("/admin/config").then((r) => setItems(r.items));
  }
  useEffect(load, []);

  async function update(key: string, value: unknown) {
    setBusy(true);
    try {
      await api(`/admin/config/${key}`, { method: "PATCH", body: JSON.stringify({ value }) });
      load();
    } finally {
      setBusy(false);
    }
  }

  if (!items) return <p className="text-slate-500">Loading…</p>;
  const map = new Map(items.map((i) => [i.key, i.value]));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">System config</h1>
      <p className="text-sm text-slate-500">
        These settings live in the SystemConfig table and are read by the API on each request (cached for 60s).
      </p>
      <div className="card space-y-4">
        {KNOWN.map((k) => (
          <ConfigRow
            key={k.key}
            spec={k}
            current={map.has(k.key) ? map.get(k.key) : k.defaultValue}
            isCustom={map.has(k.key)}
            disabled={busy}
            onSave={(v) => update(k.key, v)}
          />
        ))}
      </div>
    </div>
  );
}

function ConfigRow({
  spec,
  current,
  isCustom,
  disabled,
  onSave,
}: {
  spec: { key: string; label: string; help: string; type: "number" | "boolean"; defaultValue: unknown };
  current: unknown;
  isCustom: boolean;
  disabled: boolean;
  onSave: (v: unknown) => void;
}) {
  const [draft, setDraft] = useState<string>(String(current ?? ""));

  return (
    <div className="border-t pt-3 first:border-0 first:pt-0">
      <div className="flex items-start justify-between">
        <div className="flex-1 pr-4">
          <div className="font-medium">
            {spec.label} <span className="font-mono text-xs text-slate-400">{spec.key}</span>
            {!isCustom && <span className="badge ml-2 bg-slate-100 text-slate-600">default</span>}
          </div>
          <p className="text-xs text-slate-500 mt-1">{spec.help}</p>
        </div>
        <div className="flex items-center gap-2">
          {spec.type === "number" && (
            <input
              type="number"
              className="input w-32"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
          )}
          {spec.type === "boolean" && (
            <select className="input" value={draft} onChange={(e) => setDraft(e.target.value)}>
              <option value="true">enabled</option>
              <option value="false">disabled</option>
            </select>
          )}
          <button
            className="btn-primary text-xs"
            disabled={disabled}
            onClick={() => {
              const v: unknown =
                spec.type === "number"
                  ? Number(draft)
                  : draft === "true";
              onSave(v);
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
