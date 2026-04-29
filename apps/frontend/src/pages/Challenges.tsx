import { useStore } from "../store";
import { formatRelative } from "../format";

export default function Challenges() {
  const { challenges, locations, shops, systemConfig } = useStore();

  if (!systemConfig.gamificationEnabled) {
    return <div className="empty">Gamification is disabled company-wide.</div>;
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Challenges</h1>
          <div className="sub">
            Time-bound, opt-in by store. Refreshed quarterly to avoid
            single-metric gaming.
          </div>
        </div>
      </div>

      {challenges.map((ch) => (
        <div className="card" key={ch.id}>
          <div className="flex-between">
            <div>
              <h2 style={{ margin: 0 }}>{ch.name}</h2>
              <div className="muted">
                {formatRelative(ch.startsAt)} → {formatRelative(ch.endsAt)}
              </div>
            </div>
            <span className="pill blue">
              {ch.metric.replace(/_/g, " ")}
              {ch.threshold != null ? ` · ${ch.threshold}` : ""}
            </span>
          </div>
          <p>{ch.description}</p>

          <h3 style={{ margin: "12px 0 4px" }}>Participating stores</h3>
          <ul style={{ paddingLeft: 18, margin: 0 }}>
            {ch.participatingLocationIds.map((locId) => {
              const loc = locations.find((l) => l.id === locId);
              const relevant = shops.filter(
                (s) =>
                  s.locationId === locId &&
                  s.shopDate >= ch.startsAt &&
                  s.shopDate <= ch.endsAt,
              );
              let progress = 0;
              if (ch.metric === "score_above_threshold_count" && ch.threshold != null) {
                progress = relevant.filter((s) => s.percentage >= ch.threshold!).length;
              } else if (ch.metric === "category_avg") {
                progress = relevant.length
                  ? Math.round(
                      relevant.reduce((sum, s) => sum + s.percentage, 0) /
                        relevant.length,
                    )
                  : 0;
              } else {
                progress = relevant.length
                  ? Math.round(
                      relevant.reduce((sum, s) => sum + s.percentage, 0) /
                        relevant.length,
                    )
                  : 0;
              }
              return (
                <li key={locId} style={{ padding: "4px 0" }}>
                  <strong>{loc?.name}</strong> · current{" "}
                  {ch.metric === "score_above_threshold_count"
                    ? `${progress} qualifying shops`
                    : `${progress}%`}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </>
  );
}
