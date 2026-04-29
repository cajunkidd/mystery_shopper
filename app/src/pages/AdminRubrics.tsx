import { useStore } from "../store";

export default function AdminRubrics() {
  const { rubrics } = useStore();

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Rubrics</h1>
          <div className="sub">Snapshot per shop ensures historical accuracy when versions change.</div>
        </div>
        <button className="btn primary" disabled>+ New rubric (coming soon)</button>
      </div>

      {rubrics.map((r) => {
        const max = r.sections
          .flatMap((s) => s.questions)
          .reduce((sum, q) => sum + q.maxScore, 0);
        return (
          <div className="card" key={r.id}>
            <div className="flex-between">
              <div>
                <h2 style={{ margin: 0 }}>{r.name}</h2>
                <div className="muted">
                  v{r.version} · {r.type} · max {max} pts
                </div>
              </div>
              <span
                className={"pill " + (r.status === "active" ? "green" : "")}
              >
                {r.status}
              </span>
            </div>
            <div style={{ marginTop: 12 }}>
              {r.sections.map((s) => (
                <div key={s.id} className="section-block">
                  <div className="head">
                    <span>{s.name}</span>
                    <span className="muted">
                      {s.questions.length} questions · weight {Math.round(s.weight * 100)}%
                    </span>
                  </div>
                  <div className="body">
                    {s.questions.map((q) => (
                      <div key={q.id} className="q-row">
                        <div className="q-text">{q.text}</div>
                        <div className="q-meta">
                          {q.type.replace(/_/g, " ")} · max {q.maxScore} pts
                          {q.required ? " · required" : ""}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}
