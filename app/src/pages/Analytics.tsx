import { useStore } from "../store";
import { TrendChart } from "../components/TrendChart";

export default function Analytics() {
  const { locations, shops, bisTrack, rubrics } = useStore();

  const visitRubric = rubrics.find((r) => r.type === "visit")!;
  const pkSection = visitRubric.sections.find((s) => s.name === "Product Knowledge")!;
  const pkQIds = new Set(pkSection.questions.map((q) => q.id));
  const pkMax = pkSection.questions.reduce((sum, q) => sum + q.maxScore, 0);

  const correlation = locations.map((loc) => {
    const visitShops = shops.filter(
      (s) => s.locationId === loc.id && s.type === "visit",
    );
    if (visitShops.length === 0) {
      return { loc, pkAvg: null, aov: null };
    }
    const pk =
      visitShops.reduce((sum, s) => {
        const earned = s.answers
          .filter((a) => pkQIds.has(a.questionId))
          .reduce((acc, a) => acc + a.scoreAwarded, 0);
        return sum + (earned / pkMax) * 100;
      }, 0) / visitShops.length;
    const locDays = bisTrack.filter((b) => b.locationId === loc.id);
    const avgAov = locDays.reduce((sum, d) => sum + d.aov, 0) / (locDays.length || 1);
    return {
      loc,
      pkAvg: Math.round(pk),
      aov: Math.round(avgAov),
    };
  });

  const usable = correlation.filter((c) => c.pkAvg != null && c.aov != null);
  const overallAovHigh =
    usable.filter((c) => (c.pkAvg ?? 0) >= 70).reduce((s, c) => s + (c.aov ?? 0), 0) /
    Math.max(1, usable.filter((c) => (c.pkAvg ?? 0) >= 70).length);
  const overallAovLow =
    usable.filter((c) => (c.pkAvg ?? 0) < 70).reduce((s, c) => s + (c.aov ?? 0), 0) /
    Math.max(1, usable.filter((c) => (c.pkAvg ?? 0) < 70).length);
  const aovDelta =
    overallAovLow > 0 ? ((overallAovLow - overallAovHigh) / overallAovHigh) * 100 : 0;

  const totals = bisTrack.reduce(
    (acc, d) => {
      acc[d.locationId] = (acc[d.locationId] ?? 0) + d.sales;
      return acc;
    },
    {} as Record<string, number>,
  );

  const trend = (() => {
    const byDate: Record<string, number[]> = {};
    bisTrack.forEach((d) => {
      byDate[d.date] = byDate[d.date] ?? [];
      byDate[d.date].push(d.sales);
    });
    return Object.keys(byDate)
      .sort()
      .map((date) => ({
        x: date,
        y: Math.round(byDate[date].reduce((a, b) => a + b, 0) / 1000),
      }));
  })();

  const yMaxTrend = Math.ceil(Math.max(...trend.map((p) => p.y)) * 1.1);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Cross-system analytics</h1>
          <div className="sub">
            BisTrack × shop scores. Phase 4 — read-only daily pull.
          </div>
        </div>
      </div>

      {Math.abs(aovDelta) > 1 && (
        <div className="callout warn">
          <strong>Insight:</strong> stores with product-knowledge below 70% have an
          average AOV {aovDelta > 0 ? `${aovDelta.toFixed(1)}% lower` : `${(-aovDelta).toFixed(1)}% higher`} than
          stores at 70%+. Investigate whether targeted product training moves the
          basket size.
        </div>
      )}

      <div className="card">
        <h2>Daily company sales (last 31 days, $K)</h2>
        <TrendChart
          points={trend.slice(-21)}
          yMin={0}
          yMax={yMaxTrend}
          height={180}
        />
      </div>

      <div className="card">
        <h2>Store · product knowledge × AOV</h2>
        <table className="list">
          <thead>
            <tr>
              <th>Store</th>
              <th>Product knowledge avg</th>
              <th>AOV (30-day)</th>
              <th>Total sales (30-day)</th>
            </tr>
          </thead>
          <tbody>
            {correlation.map((row) => (
              <tr key={row.loc.id}>
                <td>
                  <strong>{row.loc.name}</strong>{" "}
                  <span className="muted">{row.loc.code}</span>
                </td>
                <td>
                  {row.pkAvg == null ? (
                    <span className="muted">—</span>
                  ) : (
                    <span className={"score " + (row.pkAvg >= 85 ? "green" : row.pkAvg >= 70 ? "amber" : "red")}>
                      {row.pkAvg}%
                    </span>
                  )}
                </td>
                <td>{row.aov ? `$${row.aov}` : "—"}</td>
                <td>{totals[row.loc.id] ? `$${(totals[row.loc.id] / 1000).toFixed(0)}K` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
