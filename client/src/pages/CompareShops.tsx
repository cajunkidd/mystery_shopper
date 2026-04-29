import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api";

interface Shop {
  id: string;
  shopDate: string;
  type: string;
  percentage: number;
  totalScore: number;
  totalMax: number;
  location: { name: string; code: string };
  evaluatedEmployee: { id: string; fullName: string } | null;
  answers: { id: string; questionId: string; answerValue: unknown; scoreAwarded: number; comment: string | null }[];
  rubric: {
    id: string;
    sections: {
      id: string;
      name: string;
      questions: { id: string; text: string; maxScore: number }[];
    }[];
  };
}

interface SectionRow {
  id: string;
  name: string;
  aPct: number | null;
  bPct: number | null;
  delta: number | null;
}

function sectionPct(shop: Shop, sectionId: string): number | null {
  const sec = shop.rubric.sections.find((s) => s.id === sectionId);
  if (!sec) return null;
  const ids = new Set(sec.questions.map((q) => q.id));
  let score = 0;
  let max = 0;
  for (const a of shop.answers) {
    if (ids.has(a.questionId)) {
      score += a.scoreAwarded;
      const q = sec.questions.find((x) => x.id === a.questionId);
      if (q) max += q.maxScore;
    }
  }
  if (max === 0) return null;
  return (score / max) * 100;
}

function deltaCls(d: number | null): string {
  if (d == null) return "text-slate-400";
  if (d >= 5) return "text-emerald-700";
  if (d <= -5) return "text-rose-700";
  return "text-slate-600";
}

export default function CompareShops() {
  const [params] = useSearchParams();
  const aId = params.get("a");
  const bId = params.get("b");
  const [a, setA] = useState<Shop | null>(null);
  const [b, setB] = useState<Shop | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!aId || !bId) {
      setError("Missing shop IDs in URL (?a=…&b=…).");
      return;
    }
    Promise.all([
      api<{ shop: Shop }>(`/shops/${aId}`),
      api<{ shop: Shop }>(`/shops/${bId}`),
    ])
      .then(([ra, rb]) => {
        setA(ra.shop);
        setB(rb.shop);
      })
      .catch(() => setError("Could not load one of the shops (forbidden or missing)."));
  }, [aId, bId]);

  if (error) return <p className="text-rose-600">{error}</p>;
  if (!a || !b) return <p className="text-slate-500">Loading…</p>;
  if (a.rubric.id !== b.rubric.id) {
    return (
      <div className="card">
        <p className="text-amber-700 text-sm">
          These shops use different rubrics ({a.rubric.id.slice(0, 8)} vs {b.rubric.id.slice(0, 8)}). A side-by-side
          comparison only makes sense when both shops were graded against the same rubric version. Pick a different
          pair.
        </p>
      </div>
    );
  }

  const sections: SectionRow[] = a.rubric.sections.map((s) => {
    const aPct = sectionPct(a, s.id);
    const bPct = sectionPct(b, s.id);
    const delta = aPct != null && bPct != null ? bPct - aPct : null;
    return { id: s.id, name: s.name, aPct, bPct, delta };
  });

  const aAnswers = new Map(a.answers.map((x) => [x.questionId, x]));
  const bAnswers = new Map(b.answers.map((x) => [x.questionId, x]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Compare shops</h1>
        <p className="text-xs text-slate-400">B − A is the delta column</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="card">
          <div className="text-xs uppercase tracking-wide text-slate-500">Shop A</div>
          <div className="font-medium mt-1">
            <Link className="text-stine-600 hover:underline" to={`/shops/${a.id}`}>
              {a.shopDate.slice(0, 10)} · {a.type}
            </Link>
          </div>
          <div className="text-sm">{a.location.name} · {a.evaluatedEmployee?.fullName ?? "—"}</div>
          <div className="text-2xl font-semibold mt-2">{a.percentage.toFixed(1)}%</div>
        </div>
        <div className="card">
          <div className="text-xs uppercase tracking-wide text-slate-500">Shop B</div>
          <div className="font-medium mt-1">
            <Link className="text-stine-600 hover:underline" to={`/shops/${b.id}`}>
              {b.shopDate.slice(0, 10)} · {b.type}
            </Link>
          </div>
          <div className="text-sm">{b.location.name} · {b.evaluatedEmployee?.fullName ?? "—"}</div>
          <div className="text-2xl font-semibold mt-2">
            {b.percentage.toFixed(1)}%
            <span className={`ml-2 text-base ${deltaCls(b.percentage - a.percentage)}`}>
              ({b.percentage - a.percentage >= 0 ? "+" : ""}
              {(b.percentage - a.percentage).toFixed(1)})
            </span>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="font-medium mb-2">Per section</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="py-2 pr-4">Section</th>
              <th className="pr-4 text-right">A</th>
              <th className="pr-4 text-right">B</th>
              <th className="text-right">Δ</th>
            </tr>
          </thead>
          <tbody>
            {sections.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="py-2 pr-4">{s.name}</td>
                <td className="pr-4 text-right">{s.aPct == null ? "—" : `${s.aPct.toFixed(1)}%`}</td>
                <td className="pr-4 text-right">{s.bPct == null ? "—" : `${s.bPct.toFixed(1)}%`}</td>
                <td className={`text-right font-medium ${deltaCls(s.delta)}`}>
                  {s.delta == null ? "—" : `${s.delta >= 0 ? "+" : ""}${s.delta.toFixed(1)}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2 className="font-medium mb-2">Per question</h2>
        {a.rubric.sections.map((sec) => (
          <div key={sec.id} className="mb-4">
            <div className="text-xs uppercase text-slate-500">{sec.name}</div>
            <ul className="mt-1 space-y-1">
              {sec.questions.map((q) => {
                const aA = aAnswers.get(q.id);
                const bA = bAnswers.get(q.id);
                const d = aA && bA ? bA.scoreAwarded - aA.scoreAwarded : null;
                return (
                  <li key={q.id} className="text-sm flex justify-between border-l-2 border-slate-200 pl-2">
                    <span className="flex-1 pr-4 text-slate-700">{q.text}</span>
                    <span className="text-slate-500 font-mono text-xs whitespace-nowrap">
                      {aA?.scoreAwarded.toFixed(1) ?? "—"} → {bA?.scoreAwarded.toFixed(1) ?? "—"}
                      <span className={`ml-2 ${deltaCls(d)}`}>
                        {d == null ? "" : `(${d >= 0 ? "+" : ""}${d.toFixed(1)})`}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
