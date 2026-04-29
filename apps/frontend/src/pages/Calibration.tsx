import { useMemo, useState } from "react";
import { useStore } from "../store";

export default function Calibration() {
  const { shops, rubrics, getLocation } = useStore();
  const [shopId, setShopId] = useState<string>(shops[0]?.id ?? "");

  const shop = shops.find((s) => s.id === shopId);
  const rubric = shop ? rubrics.find((r) => r.id === shop.rubricId) : null;
  const questions = useMemo(
    () => (rubric ? rubric.sections.flatMap((s) => s.questions) : []),
    [rubric],
  );

  const initialA: Record<string, number> = useMemo(() => {
    if (!shop) return {};
    return Object.fromEntries(
      shop.answers.map((a) => [a.questionId, a.scoreAwarded]),
    );
  }, [shop]);

  const [a, setA] = useState<Record<string, number>>(initialA);
  const [b, setB] = useState<Record<string, number>>(initialA);

  function reset() {
    setA(initialA);
    setB(initialA);
  }

  if (!shop || !rubric) {
    return <div className="empty">Pick a shop to calibrate against.</div>;
  }

  const totalA = Object.values(a).reduce((sum, v) => sum + (v || 0), 0);
  const totalB = Object.values(b).reduce((sum, v) => sum + (v || 0), 0);
  const max = questions.reduce((sum, q) => sum + q.maxScore, 0);
  const pctA = Math.round((totalA / max) * 100);
  const pctB = Math.round((totalB / max) * 100);
  const delta = Math.abs(pctA - pctB);
  const status: "good" | "warn" | "fail" =
    delta <= 5 ? "good" : delta <= 8 ? "warn" : "fail";

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Reviewer calibration</h1>
          <div className="sub">
            Per spec §13: before turning on gamification at any location, run a
            calibration. Two reviewers grade the same shop. If the average
            delta exceeds 8 points, retrain the rubric or reviewers before
            enabling gamification.
          </div>
        </div>
      </div>

      <div className="card">
        <div className="field">
          <label>Shop to calibrate against</label>
          <select
            value={shopId}
            onChange={(e) => {
              setShopId(e.target.value);
              const next = shops.find((s) => s.id === e.target.value);
              if (next) {
                const seed = Object.fromEntries(
                  next.answers.map((ans) => [ans.questionId, ans.scoreAwarded]),
                );
                setA(seed);
                setB(seed);
              }
            }}
          >
            {shops.map((s) => {
              const loc = getLocation(s.locationId);
              return (
                <option key={s.id} value={s.id}>
                  {s.shopDate} — {loc?.name} — {s.shopperName} ({s.percentage}%)
                </option>
              );
            })}
          </select>
        </div>
        <div className="muted" style={{ fontSize: 13 }}>
          Original score on file: {shop.percentage}%. Adjust each reviewer's
          score per question below.
        </div>
      </div>

      <div className="tiles">
        <div className="tile">
          <div className="label">Reviewer A</div>
          <div className="value">{pctA}%</div>
          <div className="delta">{totalA} / {max}</div>
        </div>
        <div className="tile">
          <div className="label">Reviewer B</div>
          <div className="value">{pctB}%</div>
          <div className="delta">{totalB} / {max}</div>
        </div>
        <div className="tile">
          <div className="label">Delta</div>
          <div
            className="value"
            style={{
              color:
                status === "good"
                  ? "var(--c-success)"
                  : status === "warn"
                  ? "var(--c-warn)"
                  : "var(--c-danger)",
            }}
          >
            {delta} pts
          </div>
          <div className="delta">
            {status === "good" && "calibrated"}
            {status === "warn" && "marginal"}
            {status === "fail" && "exceeds 8 — retrain"}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex-between">
          <h2 style={{ margin: 0 }}>Per-question scoring</h2>
          <button className="btn small" onClick={reset}>
            Reset both to original
          </button>
        </div>

        {rubric.sections.map((section) => (
          <div key={section.id} className="section-block">
            <div className="head">{section.name}</div>
            <div className="body">
              {section.questions.map((q) => (
                <div key={q.id} className="q-row">
                  <div className="q-text">{q.text}</div>
                  <div className="q-meta">Max {q.maxScore} pts</div>
                  <div className="row" style={{ marginTop: 6 }}>
                    <div>
                      <label>Reviewer A</label>
                      <input
                        type="number"
                        min={0}
                        max={q.maxScore}
                        value={a[q.id] ?? 0}
                        onChange={(e) =>
                          setA({ ...a, [q.id]: Number(e.target.value) })
                        }
                      />
                    </div>
                    <div>
                      <label>Reviewer B</label>
                      <input
                        type="number"
                        min={0}
                        max={q.maxScore}
                        value={b[q.id] ?? 0}
                        onChange={(e) =>
                          setB({ ...b, [q.id]: Number(e.target.value) })
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
