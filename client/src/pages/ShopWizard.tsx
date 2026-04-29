import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

type RubricType = "visit" | "call" | "web_inquiry" | "social_inquiry";

interface Location { id: string; code: string; name: string }
interface User { id: string; fullName: string; primaryLocationId: string | null; role: string }
interface Question {
  id: string;
  text: string;
  questionType: string;
  maxScore: number;
  required: boolean;
  options?: { value: string; label?: string; score?: number }[] | null;
  conditionalLogic?: { requireCommentIf?: unknown; requireCommentIfIn?: unknown[] } | null;
  displayOrder: number;
}
interface Section { id: string; name: string; displayOrder: number; questions: Question[] }
interface Rubric { id: string; name: string; type: RubricType; version: number; sections: Section[] }

type AnswerMap = Record<string, { value: unknown; comment: string }>;
type FileMap = Record<string, File | null>; // keyed by question id

const STEPS = ["Location", "Type & Date", "Shopper", "Score", "Submit"] as const;

export default function ShopWizard() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);

  const [locations, setLocations] = useState<Location[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [rubrics, setRubrics] = useState<Rubric[]>([]);

  const [locationId, setLocationId] = useState<string>("");
  const [type, setType] = useState<RubricType>("visit");
  const [shopDate, setShopDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [shopTime, setShopTime] = useState<string>("");
  const [shopperName, setShopperName] = useState("");
  const [shopperRef, setShopperRef] = useState("");
  const [evaluatedEmployeeId, setEvaluatedEmployeeId] = useState<string>("");
  const [narrative, setNarrative] = useState("");

  const [answers, setAnswers] = useState<AnswerMap>({});
  const [files, setFiles] = useState<FileMap>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ locations: Location[] }>("/locations").then((r) => setLocations(r.locations));
    api<{ rubrics: Rubric[] }>("/rubrics?status=active").then((r) => setRubrics(r.rubrics));
    api<{ users: User[] }>("/users")
      .then((r) => setUsers(r.users))
      .catch(() => setUsers([]));
  }, []);

  const activeRubric = useMemo(() => {
    const candidates = rubrics.filter((r) => r.type === type);
    return candidates[0] ?? null;
  }, [rubrics, type]);

  const [fullRubric, setFullRubric] = useState<Rubric | null>(null);
  useEffect(() => {
    if (!activeRubric) {
      setFullRubric(null);
      return;
    }
    api<{ rubric: Rubric }>(`/rubrics/${activeRubric.id}`).then((r) => setFullRubric(r.rubric));
  }, [activeRubric]);

  const employeesForLocation = useMemo(
    () => users.filter((u) => u.role === "employee" && u.primaryLocationId === locationId),
    [users, locationId],
  );

  const totals = useMemo(() => {
    if (!fullRubric) return { score: 0, max: 0 };
    let max = 0;
    let score = 0;
    for (const s of fullRubric.sections) {
      for (const q of s.questions) {
        max += q.maxScore;
        const a = answers[q.id]?.value;
        if (q.questionType === "yes_no" && (a === true || a === "yes")) score += q.maxScore;
        else if (q.questionType === "scale_1_5") {
          const n = Number(a);
          if (!Number.isNaN(n)) score += ((Math.max(1, Math.min(5, n)) - 1) / 4) * q.maxScore;
        } else if (q.questionType === "free_text" && a) score += q.maxScore;
        else if ((q.questionType === "photo_required" || q.questionType === "audio_required") && a) {
          score += q.maxScore;
        }
      }
    }
    return { score, max };
  }, [fullRubric, answers]);

  function update(qid: string, patch: Partial<{ value: unknown; comment: string }>) {
    setAnswers((prev) => ({
      ...prev,
      [qid]: { value: prev[qid]?.value ?? null, comment: prev[qid]?.comment ?? "", ...patch },
    }));
  }

  function commentRequired(q: Question, value: unknown): boolean {
    const cl = q.conditionalLogic;
    if (!cl) return false;
    if (cl.requireCommentIf !== undefined) return value === cl.requireCommentIf;
    if (Array.isArray(cl.requireCommentIfIn)) return cl.requireCommentIfIn.includes(value);
    return false;
  }

  async function submit(asDraft: boolean) {
    if (!fullRubric) return;
    if (!asDraft) {
      // Run client-side conditional-logic check + photo-required check before
      // posting (server validates conditional logic too; photo presence is
      // currently a UI-only gate since the file goes up post-create).
      for (const s of fullRubric.sections) {
        for (const q of s.questions) {
          const a = answers[q.id];
          if (commentRequired(q, a?.value) && (!a?.comment || !a.comment.trim())) {
            setError(`A comment is required for: "${q.text}"`);
            setStep(3);
            return;
          }
          if (
            q.required &&
            (q.questionType === "photo_required" || q.questionType === "audio_required") &&
            !files[q.id]
          ) {
            setError(`A file is required for: "${q.text}"`);
            setStep(3);
            return;
          }
        }
      }
    }
    setBusy(true);
    setError(null);
    try {
      const payload = {
        rubricId: fullRubric.id,
        type,
        locationId,
        shopDate: new Date(shopDate).toISOString(),
        shopTime: shopTime || undefined,
        evaluatedEmployeeId: evaluatedEmployeeId || null,
        shopperName: shopperName || undefined,
        shopperExternalRef: shopperRef || undefined,
        narrative: narrative || undefined,
        answers: Object.entries(answers)
          .filter(([, v]) => v.value !== null && v.value !== undefined && v.value !== "")
          .map(([questionId, v]) => ({
            questionId,
            answerValue: v.value,
            comment: v.comment || undefined,
          })),
        submit: !asDraft,
      };
      const r = await api<{ id: string }>("/shops", { method: "POST", body: JSON.stringify(payload) });

      // Upload any per-question files now that the shop exists. The shop GET
      // returns answer ids keyed by questionId, which the attachments endpoint
      // expects in the multipart body.
      const filesToUpload = Object.entries(files).filter(([, f]) => f);
      if (filesToUpload.length > 0) {
        const detail = await api<{ shop: { answers: { id: string; questionId: string }[] } }>(`/shops/${r.id}`);
        const answerIdByQ = new Map(detail.shop.answers.map((a) => [a.questionId, a.id]));
        const token = localStorage.getItem("token");
        await Promise.all(
          filesToUpload.map(async ([questionId, file]) => {
            const answerId = answerIdByQ.get(questionId);
            if (!answerId || !file) return;
            const fd = new FormData();
            fd.append("file", file);
            fd.append("shopAnswerId", answerId);
            await fetch(`/api/v1/shops/${r.id}/attachments`, {
              method: "POST",
              body: fd,
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
          }),
        );
      }
      nav(`/shops/${r.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">New mystery shop</h1>
      <div className="flex items-center gap-2 text-xs text-slate-500">
        {STEPS.map((s, i) => (
          <div key={s} className={`px-2 py-1 rounded ${i === step ? "bg-stine-500 text-white" : "bg-slate-100"}`}>
            {i + 1}. {s}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="card space-y-4">
          <div>
            <label className="label">Location</label>
            <select className="input" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
              <option value="">— select —</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.code})
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end">
            <button className="btn-primary" disabled={!locationId} onClick={() => setStep(1)}>
              Next
            </button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="card space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Type</label>
              <select className="input" value={type} onChange={(e) => setType(e.target.value as RubricType)}>
                <option value="visit">In-store visit</option>
                <option value="call">Mystery caller</option>
                <option value="web_inquiry">Web inquiry</option>
                <option value="social_inquiry">Social inquiry</option>
              </select>
            </div>
            <div>
              <label className="label">Shop date</label>
              <input className="input" type="date" value={shopDate} onChange={(e) => setShopDate(e.target.value)} />
            </div>
            <div>
              <label className="label">Time (optional)</label>
              <input className="input" type="time" value={shopTime} onChange={(e) => setShopTime(e.target.value)} />
            </div>
          </div>
          {!activeRubric && (
            <p className="text-sm text-rose-600">No active rubric for type "{type}". An admin must activate one first.</p>
          )}
          <div className="flex justify-between">
            <button className="btn-secondary" onClick={() => setStep(0)}>Back</button>
            <button className="btn-primary" disabled={!activeRubric} onClick={() => setStep(2)}>Next</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Shopper name</label>
              <input className="input" value={shopperName} onChange={(e) => setShopperName(e.target.value)} />
            </div>
            <div>
              <label className="label">Agency reference</label>
              <input className="input" value={shopperRef} onChange={(e) => setShopperRef(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Evaluated employee (optional)</label>
            <select
              className="input"
              value={evaluatedEmployeeId}
              onChange={(e) => setEvaluatedEmployeeId(e.target.value)}
            >
              <option value="">— evaluates the store, not a specific employee —</option>
              {employeesForLocation.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-between">
            <button className="btn-secondary" onClick={() => setStep(1)}>Back</button>
            <button className="btn-primary" onClick={() => setStep(3)}>Next</button>
          </div>
        </div>
      )}

      {step === 3 && fullRubric && (
        <div className="space-y-4">
          <div className="card flex items-center justify-between text-sm">
            <div>
              Running score: <span className="font-semibold">{totals.score.toFixed(1)} / {totals.max.toFixed(0)}</span>
              {totals.max > 0 && <span className="ml-2 text-slate-500">({((totals.score / totals.max) * 100).toFixed(1)}%)</span>}
            </div>
            <div className="text-slate-400">Rubric: {fullRubric.name} v{fullRubric.version}</div>
          </div>
          {fullRubric.sections.map((section) => (
            <div key={section.id} className="card space-y-4">
              <h3 className="font-medium text-slate-700">{section.name}</h3>
              {section.questions.map((q) => (
                <div key={q.id} className="border-t pt-3 first:border-0 first:pt-0">
                  <div className="flex justify-between items-start">
                    <div className="text-sm font-medium text-slate-700 flex-1 pr-4">
                      {q.text}
                      {q.required && <span className="text-rose-500 ml-1">*</span>}
                    </div>
                    <div className="text-xs text-slate-400">max {q.maxScore}</div>
                  </div>
                  <div className="mt-2">
                    {q.questionType === "yes_no" && (
                      <div className="flex gap-2">
                        {["yes", "no"].map((v) => (
                          <button
                            key={v}
                            type="button"
                            className={`px-3 py-1.5 rounded border text-sm ${
                              answers[q.id]?.value === v
                                ? "bg-stine-500 text-white border-stine-500"
                                : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                            }`}
                            onClick={() => update(q.id, { value: v })}
                          >
                            {v.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    )}
                    {q.questionType === "scale_1_5" && (
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            className={`w-9 h-9 rounded border text-sm ${
                              answers[q.id]?.value === n
                                ? "bg-stine-500 text-white border-stine-500"
                                : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                            }`}
                            onClick={() => update(q.id, { value: n })}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    )}
                    {q.questionType === "free_text" && (
                      <textarea
                        className="input"
                        rows={3}
                        value={(answers[q.id]?.value as string) ?? ""}
                        onChange={(e) => update(q.id, { value: e.target.value })}
                      />
                    )}
                    {(q.questionType === "photo_required" || q.questionType === "audio_required") && (
                      <div className="space-y-1">
                        <input
                          type="file"
                          accept={q.questionType === "audio_required" ? "audio/*" : "image/*"}
                          onChange={(e) => {
                            const f = e.target.files?.[0] ?? null;
                            setFiles((prev) => ({ ...prev, [q.id]: f }));
                            // Mark answer present so the running-score helper credits it.
                            update(q.id, { value: f ? f.name : null });
                          }}
                        />
                        {files[q.id] && (
                          <div className="text-xs text-emerald-700">
                            ✓ {files[q.id]!.name} ({Math.round(files[q.id]!.size / 1024)} KB) — uploaded after submit
                          </div>
                        )}
                      </div>
                    )}
                    {(() => {
                      const needsComment = commentRequired(q, answers[q.id]?.value);
                      const hasComment = !!answers[q.id]?.comment?.trim();
                      return (
                        <input
                          className={`input mt-2 text-sm ${needsComment && !hasComment ? "border-rose-400 ring-1 ring-rose-200" : ""}`}
                          placeholder={needsComment ? "Note required for this answer" : "Note (optional)"}
                          value={answers[q.id]?.comment ?? ""}
                          onChange={(e) => update(q.id, { comment: e.target.value })}
                        />
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>
          ))}
          <div className="flex justify-between">
            <button className="btn-secondary" onClick={() => setStep(2)}>Back</button>
            <button className="btn-primary" onClick={() => setStep(4)}>Next</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="card space-y-4">
          <div>
            <label className="label">Shopper narrative</label>
            <textarea className="input" rows={6} value={narrative} onChange={(e) => setNarrative(e.target.value)} />
          </div>
          {error && <p className="text-rose-600 text-sm">{error}</p>}
          <div className="flex justify-between gap-2">
            <button className="btn-secondary" onClick={() => setStep(3)} disabled={busy}>Back</button>
            <div className="flex gap-2">
              <button className="btn-secondary" onClick={() => submit(true)} disabled={busy}>Save draft</button>
              <button className="btn-primary" onClick={() => submit(false)} disabled={busy}>
                {busy ? "Submitting…" : "Submit for review"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
