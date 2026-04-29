import { useStore } from "../store";

export default function AdminConfig() {
  const { systemConfig, setSystemConfig, locations } = useStore();

  function toggleLocation(locId: string) {
    setSystemConfig({
      ...systemConfig,
      enabledLocationIds: systemConfig.enabledLocationIds.includes(locId)
        ? systemConfig.enabledLocationIds.filter((id) => id !== locId)
        : [...systemConfig.enabledLocationIds, locId],
    });
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>System config</h1>
          <div className="sub">Per-system toggles. Audited on change.</div>
        </div>
      </div>

      <div className="card">
        <h2>Gamification</h2>
        <div className="callout">
          Spec §6.5: "Gamification module can be toggled per location.
          Disabling it does not break the core app." Toggling these flags
          changes which surfaces appear in the navigation for users at each
          location.
        </div>

        <div className="field">
          <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={systemConfig.gamificationEnabled}
              onChange={(e) =>
                setSystemConfig({
                  ...systemConfig,
                  gamificationEnabled: e.target.checked,
                })
              }
            />
            Gamification enabled company-wide
          </label>
        </div>

        <h3 style={{ marginTop: 16 }}>Enabled locations</h3>
        <div style={{ display: "grid", gap: 4 }}>
          {locations.map((loc) => (
            <label
              key={loc.id}
              style={{ display: "flex", gap: 10, alignItems: "center", fontWeight: 400 }}
            >
              <input
                type="checkbox"
                checked={systemConfig.enabledLocationIds.includes(loc.id)}
                onChange={() => toggleLocation(loc.id)}
                disabled={!systemConfig.gamificationEnabled}
              />
              {loc.name} <span className="muted">({loc.code} · {loc.district})</span>
            </label>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>Privacy & retention</h2>
        <div className="row">
          <div className="field">
            <label>Audio retention (days)</label>
            <input
              type="number"
              value={systemConfig.audioRetentionDays}
              onChange={(e) =>
                setSystemConfig({
                  ...systemConfig,
                  audioRetentionDays: Number(e.target.value),
                })
              }
            />
            <div className="help">Default 365 per spec §11.</div>
          </div>
          <div className="field">
            <label>Appeal escalation window (days)</label>
            <input
              type="number"
              value={systemConfig.appealEscalationDays}
              onChange={(e) =>
                setSystemConfig({
                  ...systemConfig,
                  appealEscalationDays: Number(e.target.value),
                })
              }
            />
            <div className="help">Auto-escalate to district manager after this.</div>
          </div>
        </div>
      </div>
    </>
  );
}
