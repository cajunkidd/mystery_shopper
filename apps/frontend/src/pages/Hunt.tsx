import { useState } from "react";
import { useStore } from "../store";
import { formatRelative } from "../format";

export default function Hunt() {
  const {
    huntCampaigns,
    huntReveals,
    shops,
    getUser,
    getLocation,
    systemConfig,
  } = useStore();

  if (!systemConfig.gamificationEnabled) {
    return <div className="empty">Gamification is disabled company-wide.</div>;
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>The Hunt</h1>
          <div className="sub">
            Optional gamification mechanic — predefined service scenarios that
            trigger surprise recognition for employees who deliver.
          </div>
        </div>
      </div>

      {huntCampaigns.map((c) => {
        const reveals = huntReveals.filter((r) => r.huntCampaignId === c.id);
        return (
          <div className="card" key={c.id}>
            <div className="flex-between">
              <div>
                <h2 style={{ margin: 0 }}>{c.name}</h2>
                <div className="muted">
                  {formatRelative(c.startsAt)} → {formatRelative(c.endsAt)}
                </div>
              </div>
              <span className={"pill " + (c.active ? "green" : "")}>
                {c.active ? "active" : "ended"}
              </span>
            </div>
            <p>{c.description}</p>

            <h3 style={{ margin: "12px 0 4px" }}>Scenarios</h3>
            <ScenarioList scenarios={c.scenarios} />

            <h3 style={{ margin: "16px 0 4px" }}>Reveals</h3>
            {reveals.length === 0 ? (
              <div className="empty">No reveals yet — keep an eye out.</div>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {reveals.map((r) => {
                  const emp = getUser(r.recognizedEmployeeId);
                  const shop = shops.find((s) => s.id === r.shopId);
                  const loc = shop ? getLocation(shop.locationId) : null;
                  return (
                    <li
                      key={r.id}
                      style={{
                        padding: 12,
                        background: "linear-gradient(90deg, #fff7ed 0%, #fff 100%)",
                        border: "1px solid var(--c-border)",
                        borderRadius: 8,
                        marginBottom: 8,
                      }}
                    >
                      <strong>🎯 {emp?.fullName}</strong>{" "}
                      <span className="muted">at {loc?.name}</span>
                      <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                        Recognized {formatRelative(r.revealedAt)}
                        {r.identifiedByEmployees.length > 0 &&
                          ` · ${r.identifiedByEmployees.length} teammates guessed correctly`}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </>
  );
}

function ScenarioList({ scenarios }: { scenarios: { codeword: string; trigger: string }[] }) {
  const [reveal, setReveal] = useState(false);
  return (
    <>
      <div className="callout warn">
        Scenario details are visible to admins only during the live campaign to
        avoid tipping off employees. Toggle below to view.
        <div className="btn-row" style={{ marginTop: 8 }}>
          <button className="btn small" onClick={() => setReveal((v) => !v)}>
            {reveal ? "Hide" : "Reveal"} scenarios
          </button>
        </div>
      </div>
      {reveal &&
        scenarios.map((s) => (
          <div
            key={s.codeword}
            style={{
              padding: 8,
              borderLeft: "3px solid var(--c-accent)",
              background: "var(--c-surface-2)",
              marginBottom: 6,
              borderRadius: "0 6px 6px 0",
              fontSize: 13,
            }}
          >
            <div>
              <strong>Codeword:</strong> {s.codeword}
            </div>
            <div className="muted">{s.trigger}</div>
          </div>
        ))}
    </>
  );
}
