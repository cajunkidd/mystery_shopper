import './App.css'

function App() {
  return (
    <main className="shell">
      <header>
        <h1>Stine Mystery Shop & Caller Performance Platform</h1>
        <p className="subtitle">Internal tool — Stine LLC</p>
      </header>

      <section>
        <h2>Status</h2>
        <p>
          Project scaffold only. No Phase 1 features have been implemented yet.
          See <code>STINE_MYSTERY_SHOP_APP_SPEC.md</code> at the repo root for
          the build specification.
        </p>
      </section>

      <section>
        <h2>Phase 1 — Core Scorecard & Coaching Loop (not built)</h2>
        <ul>
          <li>User auth and roles</li>
          <li>Rubric/template builder (admin only)</li>
          <li>Shop result entry (manual)</li>
          <li>Manager review workflow</li>
          <li>Employee view of their own results</li>
          <li>Coaching notes and action plans</li>
          <li>Appeals/disputes</li>
          <li>Per-employee and per-location dashboards</li>
          <li>Branded PDF export per shop</li>
        </ul>
      </section>
    </main>
  )
}

export default App
