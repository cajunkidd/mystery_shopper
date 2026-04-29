import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { computeShopScore, useStore } from "../store";
import type { RubricType, Shop, ShopAnswer } from "../types";

const STEPS = [
  "Basics",
  "Rubric",
  "Answers",
  "Narrative",
  "Review",
] as const;

export default function ShopWizard() {
  const navigate = useNavigate();
  const { rubrics, locations, users, currentUser, createShop } = useStore();

  const [step, setStep] = useState(0);
  const [locationId, setLocationId] = useState<string>(
    currentUser.primaryLocationId ?? locations[0].id,
  );
  const [type, setType] = useState<RubricType>("visit");
  const [shopDate, setShopDate] = useState<string>(
    new Date().toISOString().slice(0, 10),
  );
  const [shopperName, setShopperName] = useState("");
  const [employeeId, setEmployeeId] = useState<string>("");
  const [narrative, setNarrative] = useState("");
  const [answers, setAnswers] = useState<Record<string, ShopAnswer>>({});

  const rubric = useMemo(
    () => rubrics.find((r) => r.type === type && r.status === "active")!,
    [rubrics, type],
  );

  const locationEmployees = useMemo(
    () => users.filter((u) => u.role === "employee" && u.primaryLocationId === locationId),
    [users, locationId],
  );

  function setAnswer(questionId: string, partial: Partial<ShopAnswer>) {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        questionId,
        value: partial.value ?? prev[questionId]?.value ?? "",
        scoreAwarded: partial.scoreAwarded ?? prev[questionId]?.scoreAwarded ?? 0,
        comment: partial.comment ?? prev[questionId]?.comment,
      },
    }));
  }

  const allRequiredAnswered = rubric.sections
    .flatMap((s) => s.questions)
    .filter((q) => q.required)
    .every((q) => answers[q.id] !== undefined);

  const computed = useMemo(() => {
    const arr = Object.values(answers);
    return computeShopScore(rubric, arr);
  }, [answers, rubric]);

  function submit() {
    const shop: Shop = {
      id: `shop-${Math.random().toString(36).slice(2, 8)}`,
      rubricId: rubric.id,
      type,
      locationId,
      shopDate,
      evaluatedEmployeeId: employeeId || null,
      shopperName: shopperName || "Internal shop",
      status: "submitted",
      totalScore: computed.total,
      totalMax: computed.max,
      percentage: computed.percentage,
      narrative,
      answers: Object.values(answers),
      createdAt: new Date().toISOString().slice(0, 10),
    };
    createShop(shop);
    navigate(`/shops/${shop.id}`);
  }

  function next() {
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  const canAdvance = (() => {
    if (step === 0) return locationId && shopDate && shopperName.trim();
    if (step === 1) return !!rubric;
    if (step === 2) return allRequiredAnswered;
    if (step === 3) return narrative.trim().length > 10;
    return true;
  })();

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Enter mystery shop</h1>
          <div className="sub">Step {step + 1} of {STEPS.length} — {STEPS[step]}</div>
        </div>
        <button className="btn" onClick={() => navigate(-1)}>Cancel</button>
      </div>

      <div className="steps">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={
              "step" +
              (i === step ? " active" : "") +
              (i < step ? " done" : "")
            }
          >
            <span className="num">{i + 1}.</span>
            {label}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="card">
          <div className="row">
            <div className="field">
              <label>Location</label>
              <select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} — {l.code}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Shop date</label>
              <input
                type="date"
                value={shopDate}
                onChange={(e) => setShopDate(e.target.value)}
              />
            </div>
          </div>
          <div className="row">
            <div className="field">
              <label>Type</label>
              <select value={type} onChange={(e) => setType(e.target.value as RubricType)}>
                <option value="visit">In-store visit</option>
                <option value="call">Mystery caller</option>
              </select>
            </div>
            <div className="field">
              <label>Shopper / agency reference</label>
              <input
                type="text"
                value={shopperName}
                onChange={(e) => setShopperName(e.target.value)}
                placeholder="e.g. Field Agent #428"
              />
            </div>
          </div>
          <div className="field">
            <label>Evaluated employee (optional)</label>
            <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
              <option value="">— Store-level shop —</option>
              {locationEmployees.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName}
                </option>
              ))}
            </select>
            <div className="help">Some shops evaluate the store as a whole, not an individual.</div>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="card">
          <h2>{rubric.name}</h2>
          <div className="muted" style={{ marginBottom: 12 }}>
            Version {rubric.version}. Snapshot will be stored with this shop.
          </div>
          {rubric.sections.map((section) => (
            <div key={section.id} className="section-block">
              <div className="head">
                <span>{section.name}</span>
                <span className="muted">{section.questions.length} questions</span>
              </div>
              <div className="body">
                {section.questions.map((q) => (
                  <div key={q.id} className="q-row">
                    <div className="q-text">{q.text}</div>
                    <div className="q-meta">
                      {q.type.replace(/_/g, " ")} · max {q.maxScore} pts
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {step === 2 && (
        <div>
          {rubric.sections.map((section) => (
            <div key={section.id} className="section-block">
              <div className="head">
                <span>{section.name}</span>
              </div>
              <div className="body">
                {section.questions.map((q) => {
                  const ans = answers[q.id];
                  return (
                    <div key={q.id} className="q-row">
                      <div className="q-text">
                        {q.text}{" "}
                        {q.required && (
                          <span className="muted" style={{ fontSize: 11 }}>· required</span>
                        )}
                      </div>
                      <div className="q-meta" style={{ marginBottom: 6 }}>
                        Max {q.maxScore} pts · {q.type.replace(/_/g, " ")}
                      </div>

                      {q.type === "yes_no" && (
                        <div className="btn-row">
                          <button
                            className={
                              "btn small " +
                              (ans?.value === true ? "primary" : "")
                            }
                            onClick={() =>
                              setAnswer(q.id, { value: true, scoreAwarded: q.maxScore })
                            }
                          >
                            Yes
                          </button>
                          <button
                            className={
                              "btn small " +
                              (ans?.value === false ? "primary" : "")
                            }
                            onClick={() =>
                              setAnswer(q.id, { value: false, scoreAwarded: 0 })
                            }
                          >
                            No
                          </button>
                          <span className="muted" style={{ alignSelf: "center" }}>
                            {ans ? `${ans.scoreAwarded} pts` : ""}
                          </span>
                        </div>
                      )}

                      {q.type === "scale_1_5" && (
                        <div className="btn-row">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button
                              key={n}
                              className={
                                "btn small " +
                                (ans?.value === n ? "primary" : "")
                              }
                              onClick={() =>
                                setAnswer(q.id, {
                                  value: n,
                                  scoreAwarded: Math.round((n / 5) * q.maxScore),
                                })
                              }
                            >
                              {n}
                            </button>
                          ))}
                          <span className="muted" style={{ alignSelf: "center" }}>
                            {ans ? `${ans.scoreAwarded} pts` : ""}
                          </span>
                        </div>
                      )}

                      <div style={{ marginTop: 8 }}>
                        <input
                          type="text"
                          placeholder="Comment (optional)"
                          value={ans?.comment ?? ""}
                          onChange={(e) =>
                            setAnswer(q.id, { comment: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {step === 3 && (
        <div className="card">
          <div className="field">
            <label>Shopper narrative</label>
            <textarea
              rows={8}
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              placeholder="The shopper's overall written comment about the visit."
            />
            <div className="help">This is the qualitative anchor for the score.</div>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="card">
          <h2>Review and submit</h2>
          <div className="tiles">
            <div className="tile">
              <div className="label">Score</div>
              <div className="value">{computed.percentage}%</div>
              <div className="delta">{computed.total} / {computed.max}</div>
            </div>
            <div className="tile">
              <div className="label">Type</div>
              <div className="value" style={{ fontSize: 18 }}>
                {type === "call" ? "Mystery caller" : "In-store visit"}
              </div>
            </div>
            <div className="tile">
              <div className="label">Routes to</div>
              <div className="value" style={{ fontSize: 14 }}>
                Store manager for {locations.find((l) => l.id === locationId)?.name}
              </div>
            </div>
          </div>
          <div className="callout">
            On submit, the shop is routed to the location's store manager and the
            evaluated employee is notified once the manager completes the review.
          </div>
        </div>
      )}

      <div className="btn-row" style={{ marginTop: 16 }}>
        <button className="btn" onClick={back} disabled={step === 0}>
          Back
        </button>
        {step < STEPS.length - 1 ? (
          <button className="btn primary" onClick={next} disabled={!canAdvance}>
            Next
          </button>
        ) : (
          <button className="btn primary" onClick={submit}>
            Submit shop
          </button>
        )}
      </div>
    </>
  );
}
