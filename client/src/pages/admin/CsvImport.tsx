import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";

interface Question { id: string; text: string }
interface Section { id: string; name: string; questions: Question[] }
interface Rubric { id: string; name: string; type: string; sections: Section[] }

interface Preview {
  rowCount: number;
  headers: string[];
  sample: Record<string, string>[];
}

interface PdfPreviewResult {
  fields: {
    locationCodeOrName: string | null;
    shopDate: string | null;
    shopperName: string | null;
    shopperExternalRef: string | null;
    narrative: string | null;
    type: string | null;
  };
  locationId: string | null;
}

function PdfPreview() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PdfPreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const token = localStorage.getItem("token");
      const r = await fetch("/api/v1/imports/pdf-preview", {
        method: "POST",
        body: fd,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!r.ok) {
        if (r.status === 503) setError("AI is not configured (ANTHROPIC_API_KEY missing).");
        else setError(`Preview failed (${r.status}).`);
        return;
      }
      setResult(await r.json());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card space-y-3">
      <h3 className="font-medium">Phase 4: agency PDF preview (Anthropic-powered)</h3>
      <p className="text-xs text-slate-500">
        Drop a single-shop PDF report. We extract location, date, shopper, and narrative; per-question scoring still
        needs the CSV mapping flow.
      </p>
      <input
        type="file"
        accept="application/pdf"
        disabled={busy}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
        }}
      />
      {busy && <p className="text-sm text-slate-500">Calling Claude…</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {result && (
        <div className="text-sm space-y-1">
          <div>Location: <span className="font-mono">{result.fields.locationCodeOrName ?? "—"}</span> {result.locationId ? "✓" : <span className="text-rose-600">no match in DB</span>}</div>
          <div>Date: <span className="font-mono">{result.fields.shopDate ?? "—"}</span></div>
          <div>Shopper: <span className="font-mono">{result.fields.shopperName ?? "—"}</span></div>
          <div>Agency ref: <span className="font-mono">{result.fields.shopperExternalRef ?? "—"}</span></div>
          <div>Type: <span className="font-mono">{result.fields.type ?? "—"}</span></div>
          {result.fields.narrative && (
            <div>
              Narrative:
              <p className="text-xs text-slate-600 italic mt-1 whitespace-pre-wrap">{result.fields.narrative}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CsvImport() {
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [rubricId, setRubricId] = useState("");
  const [fullRubric, setFullRubric] = useState<Rubric | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [rows, setRows] = useState<Record<string, string>[] | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [answerMap, setAnswerMap] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ created: number; errors: { row: number; reason: string }[] } | null>(null);

  useEffect(() => {
    api<{ rubrics: Rubric[] }>("/rubrics?status=active").then((r) => setRubrics(r.rubrics));
  }, []);

  useEffect(() => {
    if (!rubricId) {
      setFullRubric(null);
      return;
    }
    api<{ rubric: Rubric }>(`/rubrics/${rubricId}`).then((r) => setFullRubric(r.rubric));
  }, [rubricId]);

  const allQuestions = useMemo(
    () => fullRubric?.sections.flatMap((s) => s.questions.map((q) => ({ section: s.name, ...q }))) ?? [],
    [fullRubric],
  );

  async function uploadFile(file: File) {
    setBusy(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const token = localStorage.getItem("token");
      const r = await fetch("/api/v1/imports/preview", {
        method: "POST",
        body: fd,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!r.ok) throw new Error("Upload failed");
      const data = (await r.json()) as Preview & { sample: Record<string, string>[] };
      setPreview({ rowCount: data.rowCount, headers: data.headers, sample: data.sample });
      // Read all rows into memory by re-uploading not necessary — preview returns sample only.
      // Simpler approach: re-parse the file in the browser to keep all rows.
      const text = await file.text();
      const headers = data.headers;
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      const allRows: Record<string, string>[] = [];
      // skip header line
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]);
        const row: Record<string, string> = {};
        headers.forEach((h, j) => {
          row[h] = cols[j] ?? "";
        });
        allRows.push(row);
      }
      setRows(allRows);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function commit() {
    if (!rubricId || !rows || !mapping.locationCode || !mapping.shopDate) return;
    setBusy(true);
    setResult(null);
    try {
      const r = await api<{ created: number; errors: { row: number; reason: string }[] }>("/imports/commit", {
        method: "POST",
        body: JSON.stringify({
          rubricId,
          rows,
          mapping: {
            ...mapping,
            answers: Object.entries(answerMap)
              .filter(([, col]) => col)
              .map(([questionId, column]) => ({ questionId, column })),
          },
        }),
      });
      setResult(r);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">CSV import</h1>

      <PdfPreview />

      <div className="card space-y-3">
        <div>
          <label className="label">Rubric</label>
          <select className="input" value={rubricId} onChange={(e) => setRubricId(e.target.value)}>
            <option value="">— select —</option>
            {rubrics.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.type})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">CSV file</label>
          <input
            type="file"
            accept=".csv,text/csv"
            disabled={busy || !rubricId}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadFile(f);
            }}
          />
        </div>
      </div>

      {preview && fullRubric && (
        <div className="card space-y-3">
          <h3 className="font-medium">Map columns ({preview.rowCount} rows)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <Mapping label="Location code (required)" value={mapping.locationCode} headers={preview.headers}
              onChange={(v) => setMapping({ ...mapping, locationCode: v })} />
            <Mapping label="Shop date (required)" value={mapping.shopDate} headers={preview.headers}
              onChange={(v) => setMapping({ ...mapping, shopDate: v })} />
            <Mapping label="Shopper name" value={mapping.shopperName} headers={preview.headers}
              onChange={(v) => setMapping({ ...mapping, shopperName: v })} />
            <Mapping label="Agency reference" value={mapping.shopperExternalRef} headers={preview.headers}
              onChange={(v) => setMapping({ ...mapping, shopperExternalRef: v })} />
            <Mapping label="Narrative" value={mapping.narrative} headers={preview.headers}
              onChange={(v) => setMapping({ ...mapping, narrative: v })} />
            <Mapping label="Employee email" value={mapping.employeeEmail} headers={preview.headers}
              onChange={(v) => setMapping({ ...mapping, employeeEmail: v })} />
          </div>
          <div className="border-t pt-3 space-y-2">
            <h4 className="text-sm font-medium">Rubric questions → columns</h4>
            {allQuestions.map((q) => (
              <div key={q.id} className="grid grid-cols-3 gap-2 items-center text-sm">
                <div className="col-span-2 text-slate-700">
                  <span className="text-xs text-slate-400">{q.section}</span> · {q.text}
                </div>
                <select
                  className="input"
                  value={answerMap[q.id] ?? ""}
                  onChange={(e) => setAnswerMap({ ...answerMap, [q.id]: e.target.value })}
                >
                  <option value="">— skip —</option>
                  {preview.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>
          <button className="btn-primary" onClick={commit} disabled={busy || !mapping.locationCode || !mapping.shopDate}>
            {busy ? "Importing…" : `Import ${preview.rowCount} rows`}
          </button>
        </div>
      )}

      {result && (
        <div className={`card ${result.errors.length ? "bg-amber-50" : "bg-emerald-50"}`}>
          <p className="font-medium">Created {result.created} shops.</p>
          {result.errors.length > 0 && (
            <>
              <p className="text-sm mt-2">Errors ({result.errors.length}):</p>
              <ul className="text-xs list-disc list-inside text-rose-700">
                {result.errors.slice(0, 10).map((e, i) => (
                  <li key={i}>Row {e.row}: {e.reason}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Mapping({ label, value, headers, onChange }: {
  label: string; value: string | undefined; headers: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <select className="input" value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
        <option value="">— skip —</option>
        {headers.map((h) => <option key={h} value={h}>{h}</option>)}
      </select>
    </div>
  );
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        cur += c;
      }
    } else {
      if (c === ",") {
        out.push(cur);
        cur = "";
      } else if (c === '"') {
        inQuotes = true;
      } else {
        cur += c;
      }
    }
  }
  out.push(cur);
  return out;
}
