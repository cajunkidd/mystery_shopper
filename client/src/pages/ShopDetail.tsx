import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, downloadPdf } from "../api";
import { useAuth } from "../auth";
import { AudioReview, AudioUpload } from "../components/AudioReview";

interface Shop {
  id: string;
  shopDate: string;
  type: string;
  status: string;
  totalScore: number;
  totalMax: number;
  percentage: number;
  narrative: string | null;
  shopperName: string | null;
  evaluatedEmployeeId: string | null;
  locationId: string;
  audioFileId: string | null;
  location: { name: string; code: string };
  evaluatedEmployee: { id: string; fullName: string } | null;
  createdBy: { fullName: string };
  answers: { id: string; questionId: string; answerValue: unknown; scoreAwarded: number; comment: string | null }[];
  comments: { id: string; body: string; createdAt: string; audioTimestampSeconds: number | null; author: { fullName: string } }[];
  review: {
    id: string;
    status: string;
    managerSummary: string | null;
    managerScoreAdjustment: number | null;
    managerScoreJustification: string | null;
    bonusPointsAwarded: number | null;
    bonusJustification: string | null;
    reviewer: { fullName: string };
    reviewedAt: string | null;
  } | null;
  actionPlans: {
    id: string;
    category: string;
    description: string;
    dueDate: string;
    status: string;
    assignedTo: { id: string; fullName: string };
  }[];
  appeals: { id: string; reason: string; status: string; resolutionNotes: string | null }[];
  rubric: {
    id: string;
    name: string;
    sections: {
      id: string;
      name: string;
      questions: { id: string; text: string; maxScore: number; questionType: string }[];
    }[];
  };
}

export default function ShopDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [shop, setShop] = useState<Shop | null>(null);
  const [appealReason, setAppealReason] = useState("");
  const [appealText, setAppealText] = useState("");
  const [showAppeal, setShowAppeal] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    api<{ shop: Shop }>(`/shops/${id}`).then((r) => setShop(r.shop));
  }, [id]);

  async function fileAppeal() {
    if (!shop) return;
    setBusy(true);
    try {
      await api(`/shops/${shop.id}/appeals`, {
        method: "POST",
        body: JSON.stringify({ reason: appealReason, requestedChange: appealText }),
      });
      const r = await api<{ shop: Shop }>(`/shops/${shop.id}`);
      setShop(r.shop);
      setShowAppeal(false);
      setAppealReason("");
      setAppealText("");
    } finally {
      setBusy(false);
    }
  }

  if (!shop || !user) return <p className="text-slate-500">Loading…</p>;

  const canReview =
    (user.role === "store_manager" && shop.locationId === user.primaryLocationId) ||
    user.role === "district_manager" ||
    user.role === "admin";
  const canAppeal = user.role === "employee" && shop.evaluatedEmployeeId === user.id && shop.status !== "appealed";

  const answersById = new Map(shop.answers.map((a) => [a.questionId, a]));

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">
            {shop.location.name} · {shop.shopDate.slice(0, 10)}
          </h1>
          <p className="text-sm text-slate-500">
            {shop.type} · {shop.evaluatedEmployee?.fullName ?? "Store-level shop"} · status: <span className="font-medium">{shop.status.replace(/_/g, " ")}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-3xl font-semibold">{shop.percentage.toFixed(1)}%</div>
            <div className="text-xs text-slate-500">{shop.totalScore.toFixed(1)} / {shop.totalMax.toFixed(0)}</div>
          </div>
          <button className="btn-secondary" onClick={() => downloadPdf(shop.id)}>Export PDF</button>
        </div>
      </div>

      <div className="card">
        <h3 className="font-medium mb-2">Rubric answers</h3>
        {shop.rubric.sections.map((section) => (
          <div key={section.id} className="mb-4">
            <div className="font-medium text-stine-700 text-sm">{section.name}</div>
            <ul className="mt-2 space-y-2">
              {section.questions.map((q) => {
                const a = answersById.get(q.id);
                return (
                  <li key={q.id} className="text-sm border-l-2 border-slate-200 pl-3">
                    <div className="text-slate-600">{q.text}</div>
                    <div className="text-slate-800">
                      <span className="font-medium">{JSON.stringify(a?.answerValue ?? "—")}</span>
                      <span className="ml-2 text-slate-400 text-xs">
                        {a?.scoreAwarded.toFixed(1) ?? 0} / {q.maxScore}
                      </span>
                    </div>
                    {a?.comment && <div className="text-xs text-slate-500 italic">"{a.comment}"</div>}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {shop.narrative && (
        <div className="card">
          <h3 className="font-medium mb-2">Shopper narrative</h3>
          <p className="text-sm whitespace-pre-wrap">{shop.narrative}</p>
        </div>
      )}

      {(user.role === "store_manager" || user.role === "district_manager" || user.role === "admin") && (
        <AISummaryPanel shopId={shop.id} />
      )}

      {shop.review && (
        <div className="card">
          <h3 className="font-medium mb-2">Manager review</h3>
          <p className="text-xs text-slate-500 mb-2">
            Reviewer: {shop.review.reviewer.fullName} · status: {shop.review.status}
            {shop.review.reviewedAt && ` · completed ${shop.review.reviewedAt.slice(0, 10)}`}
          </p>
          {shop.review.managerSummary && <p className="text-sm whitespace-pre-wrap">{shop.review.managerSummary}</p>}
          {shop.review.managerScoreAdjustment != null && (
            <p className="text-xs text-amber-700 mt-2">
              Score adjustment: {shop.review.managerScoreAdjustment >= 0 ? "+" : ""}
              {shop.review.managerScoreAdjustment} — {shop.review.managerScoreJustification}
            </p>
          )}
          {shop.review.bonusPointsAwarded != null && shop.review.bonusPointsAwarded > 0 && (
            <p className="text-xs text-emerald-700 mt-1">
              Manager bonus: +{shop.review.bonusPointsAwarded} — {shop.review.bonusJustification}
            </p>
          )}
        </div>
      )}

      {shop.actionPlans.length > 0 && (
        <div className="card">
          <h3 className="font-medium mb-2">Action plans</h3>
          <ul className="space-y-2">
            {shop.actionPlans.map((ap) => (
              <li key={ap.id} className="text-sm flex items-start justify-between border-b last:border-0 pb-2">
                <div>
                  <div className="font-medium">[{ap.category}] {ap.description}</div>
                  <div className="text-xs text-slate-500">
                    Assigned to {ap.assignedTo.fullName} · due {ap.dueDate.slice(0, 10)} · status: {ap.status}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {shop.appeals.length > 0 && (
        <div className="card">
          <h3 className="font-medium mb-2">Appeals</h3>
          <ul className="space-y-2">
            {shop.appeals.map((a) => (
              <li key={a.id} className="text-sm">
                <div><span className="font-medium">Status:</span> {a.status}</div>
                <div><span className="font-medium">Reason:</span> {a.reason}</div>
                {a.resolutionNotes && <div className="text-xs text-slate-500">Resolution: {a.resolutionNotes}</div>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {shop.type === "call" && (
        <div className="card">
          <h3 className="font-medium mb-2">Audio recording</h3>
          {!shop.audioFileId ? (
            canReview ? (
              <AudioUpload
                shopId={shop.id}
                onUploaded={async () => {
                  const r = await api<{ shop: Shop }>(`/shops/${shop.id}`);
                  setShop(r.shop);
                }}
              />
            ) : (
              <p className="text-sm text-slate-500">No recording uploaded yet.</p>
            )
          ) : (
            <AudioReview
              shopId={shop.id}
              attachmentId={shop.audioFileId}
              comments={shop.comments}
              canComment={canReview}
              onChange={async () => {
                const r = await api<{ shop: Shop }>(`/shops/${shop.id}`);
                setShop(r.shop);
              }}
            />
          )}
        </div>
      )}

      {canReview && shop.review?.status !== "completed" && (
        <ManagerReviewPanel shop={shop} onChange={(s) => setShop(s)} />
      )}

      {canAppeal && (
        <div className="card">
          <h3 className="font-medium mb-2">Disagree with this score?</h3>
          {!showAppeal && (
            <button className="btn-secondary" onClick={() => setShowAppeal(true)}>File an appeal</button>
          )}
          {showAppeal && (
            <div className="space-y-2">
              <input className="input" placeholder="Reason" value={appealReason} onChange={(e) => setAppealReason(e.target.value)} />
              <textarea
                className="input"
                rows={3}
                placeholder="What change are you requesting?"
                value={appealText}
                onChange={(e) => setAppealText(e.target.value)}
              />
              <div className="flex gap-2 justify-end">
                <button className="btn-secondary" onClick={() => setShowAppeal(false)} disabled={busy}>Cancel</button>
                <button className="btn-primary" onClick={fileAppeal} disabled={busy || !appealReason}>
                  Submit appeal
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AISummaryPanel({ shopId }: { shopId: string }) {
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<{ summary: string; strengths: string[]; improvements: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ summary: { summary: string; strengths: string[]; improvements: string[] } }>(
        `/shops/${shopId}/summary`,
        { method: "POST", body: JSON.stringify({}) },
      );
      setSummary(r.summary);
    } catch (e) {
      const apiErr = e as { status?: number; body?: { error?: string } };
      if (apiErr.status === 503 || apiErr.body?.error === "ai_not_configured") {
        setError("AI summarization is not configured (ANTHROPIC_API_KEY missing).");
      } else {
        setError("AI summary failed. Try again later.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">AI summary</h3>
        <button className="btn-secondary text-xs" disabled={busy} onClick={generate}>
          {busy ? "Generating…" : summary ? "Regenerate" : "Generate"}
        </button>
      </div>
      {error && <p className="text-sm text-rose-600 mt-2">{error}</p>}
      {summary && (
        <div className="mt-3 space-y-3 text-sm">
          <p className="whitespace-pre-wrap">{summary.summary}</p>
          {summary.strengths.length > 0 && (
            <div>
              <div className="font-medium text-emerald-700 text-xs uppercase">Strengths</div>
              <ul className="list-disc list-inside text-slate-700">
                {summary.strengths.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}
          {summary.improvements.length > 0 && (
            <div>
              <div className="font-medium text-amber-700 text-xs uppercase">Improvement areas</div>
              <ul className="list-disc list-inside text-slate-700">
                {summary.improvements.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ManagerReviewPanel({ shop, onChange }: { shop: Shop; onChange: (s: Shop) => void }) {
  const [summary, setSummary] = useState(shop.review?.managerSummary ?? "");
  const [adjustment, setAdjustment] = useState<string>(
    shop.review?.managerScoreAdjustment != null ? String(shop.review.managerScoreAdjustment) : "",
  );
  const [adjJustification, setAdjJustification] = useState(shop.review?.managerScoreJustification ?? "");
  const [bonus, setBonus] = useState<string>(
    shop.review?.bonusPointsAwarded != null ? String(shop.review.bonusPointsAwarded) : "",
  );
  const [bonusJustification, setBonusJustification] = useState(shop.review?.bonusJustification ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Action plan form
  const [apCategory, setApCategory] = useState("");
  const [apDescription, setApDescription] = useState("");
  const [apDueDate, setApDueDate] = useState(
    new Date(Date.now() + 14 * 86400 * 1000).toISOString().slice(0, 10),
  );

  async function ensureReview(): Promise<string> {
    if (shop.review) return shop.review.id;
    const r = await api<{ review: { id: string } }>(`/shops/${shop.id}/review`, { method: "POST" });
    return r.review.id;
  }

  async function saveReview() {
    setBusy(true);
    setError(null);
    try {
      const reviewId = await ensureReview();
      await api(`/reviews/${reviewId}`, {
        method: "PATCH",
        body: JSON.stringify({
          managerSummary: summary || null,
          managerScoreAdjustment: adjustment === "" ? null : Number(adjustment),
          managerScoreJustification: adjJustification || null,
          bonusPointsAwarded: bonus === "" ? null : Number(bonus),
          bonusJustification: bonusJustification || null,
        }),
      });
      const r = await api<{ shop: Shop }>(`/shops/${shop.id}`);
      onChange(r.shop);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function addActionPlan() {
    if (!shop.evaluatedEmployeeId) {
      setError("This shop isn't tied to a specific employee, so no action plan can be assigned.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const reviewId = await ensureReview();
      await api(`/shops/${shop.id}/action-plans`, {
        method: "POST",
        body: JSON.stringify({
          assignedToId: shop.evaluatedEmployeeId,
          reviewId,
          category: apCategory,
          description: apDescription,
          dueDate: new Date(apDueDate).toISOString(),
        }),
      });
      setApCategory("");
      setApDescription("");
      const r = await api<{ shop: Shop }>(`/shops/${shop.id}`);
      onChange(r.shop);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function complete() {
    setBusy(true);
    setError(null);
    try {
      const reviewId = await ensureReview();
      await api(`/reviews/${reviewId}/complete`, { method: "POST" });
      const r = await api<{ shop: Shop }>(`/shops/${shop.id}`);
      onChange(r.shop);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card border-stine-100 border-2">
      <h3 className="font-medium mb-3 text-stine-700">Manager review</h3>
      <div className="space-y-3">
        <div>
          <label className="label">Summary</label>
          <textarea className="input" rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="label">Score adjustment (+/-)</label>
            <input className="input" type="number" step="0.5" value={adjustment} onChange={(e) => setAdjustment(e.target.value)} />
          </div>
          <div>
            <label className="label">Adjustment justification</label>
            <input className="input" value={adjJustification} onChange={(e) => setAdjJustification(e.target.value)} />
          </div>
          <div>
            <label className="label">Bonus points (0–25)</label>
            <input className="input" type="number" min={0} max={25} value={bonus} onChange={(e) => setBonus(e.target.value)} />
          </div>
          <div>
            <label className="label">Bonus justification</label>
            <input className="input" value={bonusJustification} onChange={(e) => setBonusJustification(e.target.value)} />
          </div>
        </div>
        <button className="btn-secondary" onClick={saveReview} disabled={busy}>Save review</button>

        <div className="border-t pt-3">
          <h4 className="font-medium text-sm mb-2">Add action plan</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <input className="input" placeholder="Category (e.g. Greeting)" value={apCategory} onChange={(e) => setApCategory(e.target.value)} />
            <input className="input md:col-span-2" placeholder="Description" value={apDescription} onChange={(e) => setApDescription(e.target.value)} />
            <input className="input" type="date" value={apDueDate} onChange={(e) => setApDueDate(e.target.value)} />
            <button
              className="btn-secondary md:col-span-2"
              disabled={busy || !apCategory || !apDescription}
              onClick={addActionPlan}
            >
              Add action plan
            </button>
          </div>
        </div>

        {error && <p className="text-rose-600 text-sm">{error}</p>}

        <div className="flex justify-end pt-2 border-t">
          <button className="btn-primary" onClick={complete} disabled={busy}>
            Mark review complete
          </button>
        </div>
      </div>
    </div>
  );
}
