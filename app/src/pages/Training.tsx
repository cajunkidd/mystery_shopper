import { useStore } from "../store";

export default function Training() {
  const { trainingModules, currentUser, actionPlans, shops } = useStore();

  const myActionPlans = actionPlans.filter((p) => p.assignedTo === currentUser.id);
  const recommendedCategories = new Set(myActionPlans.map((p) => p.category));

  const myShops = shops.filter((s) => s.evaluatedEmployeeId === currentUser.id);
  const sectionWeak = (() => {
    const acc: Record<string, number[]> = {};
    myShops.forEach((s) => {
      s.answers.forEach((a) => {
        const cat = a.questionId.includes("greet")
          ? "Greeting"
          : a.questionId.includes("prod")
          ? "Product Knowledge"
          : a.questionId.includes("close")
          ? "Close"
          : a.questionId.includes("disc")
          ? "Discovery"
          : "Other";
        acc[cat] = acc[cat] ?? [];
        acc[cat].push(a.scoreAwarded);
      });
    });
    return Object.entries(acc)
      .map(([cat, vals]) => ({
        cat,
        avg: vals.reduce((a, b) => a + b, 0) / Math.max(1, vals.length),
      }))
      .sort((a, b) => a.avg - b.avg);
  })();

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Microlearning</h1>
          <div className="sub">
            Short modules tied to coaching categories. Phase 4 closes the loop:
            low score → assigned training → re-test.
          </div>
        </div>
      </div>

      {sectionWeak.length > 0 && (
        <div className="callout">
          <strong>Recommended for you:</strong> based on your most recent shops,
          your weakest category is{" "}
          <strong>{sectionWeak[0].cat}</strong>. Modules below tagged for that
          category are highlighted.
        </div>
      )}

      {Array.from(new Set(trainingModules.map((m) => m.category))).map((cat) => (
        <div className="card" key={cat}>
          <div className="flex-between">
            <h2 style={{ margin: 0 }}>{cat}</h2>
            {(recommendedCategories.has(cat) || sectionWeak[0]?.cat === cat) && (
              <span className="pill amber">Recommended</span>
            )}
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {trainingModules
              .filter((m) => m.category === cat)
              .map((m) => (
                <li
                  key={m.id}
                  style={{
                    padding: 12,
                    borderTop: "1px solid var(--c-border)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <strong>{m.title}</strong>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {m.durationMinutes} min · {m.description}
                    </div>
                  </div>
                  <button className="btn small primary">Start</button>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </>
  );
}
