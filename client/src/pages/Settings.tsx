import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";

interface Prefs {
  notifyByEmail: boolean;
  notifyBySms: boolean;
}

export default function Settings() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api<{ preferences: Prefs }>("/me/preferences").then((r) => setPrefs(r.preferences));
  }, []);

  async function update(patch: Partial<Prefs>) {
    setBusy(true);
    setSaved(false);
    try {
      const r = await api<{ preferences: Prefs }>("/me/preferences", {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      setPrefs(r.preferences);
      setSaved(true);
    } finally {
      setBusy(false);
    }
  }

  if (!prefs || !user) return <p className="text-slate-500">Loading…</p>;
  async function downloadMyData() {
    const t = localStorage.getItem("token");
    const r = await fetch("/api/v1/me/export", {
      headers: t ? { Authorization: `Bearer ${t}` } : {},
    });
    if (!r.ok) return;
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "stine-mystery-shop-data.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4 max-w-xl">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <div className="card space-y-1 text-sm">
        <div><span className="text-slate-500">Name:</span> {user.fullName}</div>
        <div><span className="text-slate-500">Email:</span> {user.email}</div>
        <div><span className="text-slate-500">Role:</span> {user.role}</div>
      </div>
      <div className="card space-y-2">
        <h2 className="font-medium">Your data</h2>
        <p className="text-xs text-slate-500">
          Per spec §11: download a JSON copy of every shop, action plan, appeal, comment, point, badge, and notification
          tied to your account.
        </p>
        <button className="btn-secondary text-sm" onClick={downloadMyData}>Download my data</button>
      </div>
      <div className="card space-y-3">
        <h2 className="font-medium">Notifications</h2>
        <p className="text-xs text-slate-500">
          In-app notifications are always on (§8). These toggles control optional channels — they take effect when
          email / SMS infrastructure is wired up.
        </p>
        <label className="flex items-center justify-between text-sm">
          <span>Send important notifications by email</span>
          <input
            type="checkbox"
            checked={prefs.notifyByEmail}
            disabled={busy}
            onChange={(e) => update({ notifyByEmail: e.target.checked })}
          />
        </label>
        <label className="flex items-center justify-between text-sm">
          <span>
            Send urgent notifications by SMS
            <span className="ml-2 badge bg-slate-100 text-slate-600">opt-in, Phase 2+</span>
          </span>
          <input
            type="checkbox"
            checked={prefs.notifyBySms}
            disabled={busy}
            onChange={(e) => update({ notifyBySms: e.target.checked })}
          />
        </label>
        {saved && <p className="text-xs text-emerald-600">Saved.</p>}
      </div>
    </div>
  );
}
