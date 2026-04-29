import { useEffect, useState } from "react";

type Health = { status: string; service: string };

export function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch((e) => setError(String(e)));
  }, []);

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem", maxWidth: 720 }}>
      <h1>Stine Mystery Shopper</h1>
      <p>Phase 1 scaffold. Replace this with the real shell once Contract Manager conventions are wired in.</p>
      <section>
        <h2>Backend status</h2>
        {error && <pre style={{ color: "crimson" }}>{error}</pre>}
        {health ? (
          <pre>{JSON.stringify(health, null, 2)}</pre>
        ) : (
          !error && <p>Pinging backend…</p>
        )}
      </section>
    </main>
  );
}
