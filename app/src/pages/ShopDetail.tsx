import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useStore } from "../store";
import { formatDate, formatRelative, scoreClass } from "../format";
import type { ActionPlan, Appeal, Review } from "../types";
import { AudioReview } from "../components/AudioReview";
import { CommentThread } from "../components/CommentThread";

export default function ShopDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    getShop,
    getRubric,
    getLocation,
    getUser,
    getReview,
    getActionPlansForShop,
    getAppealsForShop,
    currentUser,
    saveReview,
    updateShopStatus,
    createActionPlan,
    fileAppeal,
    resolveAppeal,
    updateActionPlanStatus,
  } = useStore();

  const shop = id ? getShop(id) : undefined;
  if (!shop) {
    return (
      <div className="empty">
        Shop not found. <Link to="/shops">Back to shops</Link>
      </div>
    );
  }
  const rubric = getRubric(shop.rubricId)!;
  const loc = getLocation(shop.locationId)!;
  const employee = shop.evaluatedEmployeeId ? getUser(shop.evaluatedEmployeeId) : null;
  const existingReview = getReview(shop.id);
  const plans = getActionPlansForShop(shop.id);
  const apps = getAppealsForShop(shop.id);

  const isManager =
    currentUser.role === "store_manager" ||
    currentUser.role === "district_manager" ||
    currentUser.role === "admin";

  const isEmployee = currentUser.role === "employee" && currentUser.id === shop.evaluatedEmployeeId;

  const adjustedScore = useMemo(() => {
    let total = shop.totalScore;
    if (existingReview?.scoreAdjustment != null) total += existingReview.scoreAdjustment;
    if (existingReview?.bonusPoints != null) total += existingReview.bonusPoints;
    const max = shop.totalMax;
    return { total, max, percentage: Math.round((total / max) * 100) };
  }, [shop, existingReview]);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>
            {shop.type === "call" ? "Mystery caller" : "In-store visit"} ·{" "}
            {loc.name}
          </h1>
          <div className="sub">
            {formatDate(shop.shopDate)} · Shopper {shop.shopperName} ·{" "}
            <span className="pill">{shop.status.replace(/_/g, " ")}</span>
          </div>
        </div>
        <div className="btn-row">
          <button className="btn" onClick={() => navigate(-1)}>← Back</button>
          <button className="btn" onClick={() => window.print()}>Export PDF</button>
        </div>
      </div>

      <div className="split">
        <div>
          <div className="card">
            <div className="flex-between">
              <h2 style={{ margin: 0 }}>Score</h2>
              <div>
                <span className={`score ${scoreClass(adjustedScore.percentage)}`} style={{ fontSize: 22 }}>
                  {adjustedScore.percentage}%
                </span>
                <span className="muted" style={{ marginLeft: 8 }}>
                  {adjustedScore.total} / {adjustedScore.max}
                </span>
              </div>
            </div>
            <div className="score-bar">
              <div
                className={`fill ${scoreClass(adjustedScore.percentage)}`}
                style={{ width: `${Math.min(adjustedScore.percentage, 100)}%` }}
              />
            </div>
            {existingReview && (existingReview.scoreAdjustment || existingReview.bonusPoints) ? (
              <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                Includes manager adjustments: raw {shop.totalScore}
                {existingReview.scoreAdjustment ? ` · adjustment ${existingReview.scoreAdjustment > 0 ? "+" : ""}${existingReview.scoreAdjustment}` : ""}
                {existingReview.bonusPoints ? ` · bonus +${existingReview.bonusPoints}` : ""}
              </div>
            ) : null}
          </div>

          <div className="card">
            <h2>Shopper narrative</h2>
            <p style={{ margin: 0 }}>{shop.narrative}</p>
          </div>

          <h2 style={{ margin: "24px 0 12px" }}>Rubric: {rubric.name}</h2>
          {rubric.sections.map((section) => {
            const sectionAnswers = section.questions.map((q) => ({
              q,
              a: shop.answers.find((ans) => ans.questionId === q.id),
            }));
            const sGot = sectionAnswers.reduce((sum, x) => sum + (x.a?.scoreAwarded ?? 0), 0);
            const sMax = section.questions.reduce((sum, q) => sum + q.maxScore, 0);
            const pct = Math.round((sGot / sMax) * 100);
            return (
              <div key={section.id} className="section-block">
                <div className="head">
                  <span>{section.name}</span>
                  <span>
                    <span className={`score ${scoreClass(pct)}`}>{pct}%</span>{" "}
                    <span className="muted">{sGot}/{sMax}</span>
                  </span>
                </div>
                <div className="body">
                  {sectionAnswers.map(({ q, a }) => (
                    <div key={q.id} className="q-row">
                      <div className="q-text">{q.text}</div>
                      <div className="q-meta">
                        Answer:{" "}
                        <strong>
                          {a == null
                            ? "—"
                            : typeof a.value === "boolean"
                            ? a.value
                              ? "Yes"
                              : "No"
                            : String(a.value)}
                        </strong>{" "}
                        · {a?.scoreAwarded ?? 0} / {q.maxScore}
                      </div>
                      {a?.comment && <div className="q-comment">{a.comment}</div>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {shop.type === "call" && shop.audioDurationSeconds && (
            <AudioReview
              shopId={shop.id}
              durationSeconds={shop.audioDurationSeconds}
            />
          )}

          <ReviewSection
            shopId={shop.id}
            existing={existingReview}
            isManager={isManager}
            onSave={(review) => {
              saveReview(review);
              if (shop.status === "submitted")
                updateShopStatus(shop.id, "under_review");
            }}
            onComplete={(review) => {
              saveReview(review);
              updateShopStatus(
                shop.id,
                plans.length ? "action_assigned" : "closed",
              );
            }}
            currentUserId={currentUser.id}
          />

          <ActionPlansSection
            shopId={shop.id}
            plans={plans}
            isManager={isManager}
            isEmployee={isEmployee}
            employeeId={shop.evaluatedEmployeeId}
            currentUserId={currentUser.id}
            sections={rubric.sections.map((s) => s.name)}
            onCreate={(plan) => {
              createActionPlan(plan);
              if (shop.status !== "appealed") updateShopStatus(shop.id, "action_assigned");
            }}
            onAck={(planId) => updateActionPlanStatus(planId, "acknowledged")}
            onComplete={(planId) => updateActionPlanStatus(planId, "completed")}
            onVerify={(planId, note) => updateActionPlanStatus(planId, "verified", note)}
          />

          <AppealsSection
            shopId={shop.id}
            appeals={apps}
            isEmployee={isEmployee}
            isManager={isManager}
            currentUserId={currentUser.id}
            onFile={(appeal) => fileAppeal(appeal)}
            onResolve={(id, status, notes, adj) => resolveAppeal(id, status, notes, adj)}
          />

          <CommentThread shopId={shop.id} />
        </div>

        <aside>
          <div className="card">
            <h3>Shop details</h3>
            <div className="field">
              <div className="muted" style={{ fontSize: 12 }}>Location</div>
              <div>{loc.name} ({loc.code})</div>
            </div>
            <div className="field">
              <div className="muted" style={{ fontSize: 12 }}>Date</div>
              <div>{formatDate(shop.shopDate)} ({formatRelative(shop.shopDate)})</div>
            </div>
            <div className="field">
              <div className="muted" style={{ fontSize: 12 }}>Type</div>
              <div>{shop.type === "call" ? "Mystery caller" : "In-store visit"}</div>
            </div>
            <div className="field">
              <div className="muted" style={{ fontSize: 12 }}>Evaluated employee</div>
              <div>{employee?.fullName ?? "—"}</div>
            </div>
            <div className="field">
              <div className="muted" style={{ fontSize: 12 }}>Shopper</div>
              <div>{shop.shopperName}</div>
            </div>
            <div className="field">
              <div className="muted" style={{ fontSize: 12 }}>Rubric</div>
              <div>{rubric.name} (v{rubric.version})</div>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

function ReviewSection({
  shopId,
  existing,
  isManager,
  onSave,
  onComplete,
  currentUserId,
}: {
  shopId: string;
  existing: Review | undefined;
  isManager: boolean;
  onSave: (r: Review) => void;
  onComplete: (r: Review) => void;
  currentUserId: string;
}) {
  const [editing, setEditing] = useState(!existing);
  const [summary, setSummary] = useState(existing?.managerSummary ?? "");
  const [adj, setAdj] = useState<string>(
    existing?.scoreAdjustment != null ? String(existing.scoreAdjustment) : "",
  );
  const [adjReason, setAdjReason] = useState(existing?.scoreJustification ?? "");
  const [bonus, setBonus] = useState<string>(
    existing?.bonusPoints != null ? String(existing.bonusPoints) : "",
  );
  const [bonusReason, setBonusReason] = useState(existing?.bonusJustification ?? "");

  if (!isManager && !existing) return null;

  if (!isManager && existing) {
    return (
      <div className="card">
        <h2>Manager review</h2>
        <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
          Reviewed {existing.reviewedAt ? formatRelative(existing.reviewedAt) : "in progress"}
        </div>
        <p style={{ marginTop: 8 }}>{existing.managerSummary}</p>
        {existing.scoreAdjustment != null && (
          <div className="callout">
            Score adjustment: {existing.scoreAdjustment > 0 ? "+" : ""}
            {existing.scoreAdjustment}
            <div className="muted">{existing.scoreJustification}</div>
          </div>
        )}
        {existing.bonusPoints != null && existing.bonusPoints > 0 && (
          <div className="callout success">
            Bonus points: +{existing.bonusPoints}
            <div className="muted">{existing.bonusJustification}</div>
          </div>
        )}
      </div>
    );
  }

  function buildReview(status: "in_progress" | "completed"): Review {
    return {
      id: existing?.id ?? `rev-${Math.random().toString(36).slice(2, 8)}`,
      shopId,
      reviewerId: currentUserId,
      status,
      managerSummary: summary,
      scoreAdjustment: adj === "" ? null : Number(adj),
      scoreJustification: adjReason,
      bonusPoints: bonus === "" ? null : Number(bonus),
      bonusJustification: bonusReason,
      reviewedAt:
        status === "completed"
          ? new Date().toISOString().slice(0, 10)
          : existing?.reviewedAt ?? null,
    };
  }

  const adjValid = adj === "" || (adjReason.trim().length > 0);
  const bonusValid = bonus === "" || (bonusReason.trim().length > 0);
  const summaryValid = summary.trim().length > 0;

  return (
    <div className="card">
      <div className="flex-between">
        <h2 style={{ margin: 0 }}>Manager review</h2>
        {existing?.status === "completed" && !editing && (
          <button className="btn small" onClick={() => setEditing(true)}>Edit</button>
        )}
      </div>
      {!editing && existing ? (
        <>
          <p style={{ marginTop: 12 }}>{existing.managerSummary}</p>
          {existing.scoreAdjustment != null && (
            <div className="callout">
              Score adjustment: {existing.scoreAdjustment > 0 ? "+" : ""}
              {existing.scoreAdjustment}
              <div className="muted">{existing.scoreJustification}</div>
            </div>
          )}
          {existing.bonusPoints != null && existing.bonusPoints > 0 && (
            <div className="callout success">
              Bonus: +{existing.bonusPoints}
              <div className="muted">{existing.bonusJustification}</div>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="field">
            <label>Manager summary <span className="muted">(required)</span></label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="What went well, what to work on, and your coaching recommendation."
            />
          </div>
          <div className="row">
            <div className="field">
              <label>Score adjustment</label>
              <input
                type="number"
                value={adj}
                onChange={(e) => setAdj(e.target.value)}
                placeholder="e.g. -3 or +5"
              />
              <div className="help">Required justification if set. All adjustments are audited.</div>
            </div>
            <div className="field">
              <label>Bonus points (0–25)</label>
              <input
                type="number"
                min={0}
                max={25}
                value={bonus}
                onChange={(e) => setBonus(e.target.value)}
              />
              <div className="help">Phase 3 will feed gamification ledger.</div>
            </div>
          </div>
          {adj !== "" && (
            <div className="field">
              <label>Justification for score adjustment</label>
              <textarea
                value={adjReason}
                onChange={(e) => setAdjReason(e.target.value)}
                placeholder="Why is this adjustment fair?"
              />
            </div>
          )}
          {bonus !== "" && (
            <div className="field">
              <label>Justification for bonus</label>
              <textarea
                value={bonusReason}
                onChange={(e) => setBonusReason(e.target.value)}
                placeholder="What did the employee do that earns this?"
              />
            </div>
          )}
          <div className="btn-row">
            <button
              className="btn"
              disabled={!summaryValid}
              onClick={() => {
                onSave(buildReview("in_progress"));
                setEditing(false);
              }}
            >
              Save draft
            </button>
            <button
              className="btn primary"
              disabled={!summaryValid || !adjValid || !bonusValid}
              onClick={() => {
                onComplete(buildReview("completed"));
                setEditing(false);
              }}
            >
              Complete review
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ActionPlansSection({
  shopId,
  plans,
  isManager,
  isEmployee,
  employeeId,
  currentUserId,
  sections,
  onCreate,
  onAck,
  onComplete,
  onVerify,
}: {
  shopId: string;
  plans: ActionPlan[];
  isManager: boolean;
  isEmployee: boolean;
  employeeId: string | null;
  currentUserId: string;
  sections: string[];
  onCreate: (p: ActionPlan) => void;
  onAck: (id: string) => void;
  onComplete: (id: string) => void;
  onVerify: (id: string, note: string) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [category, setCategory] = useState(sections[0]);
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });

  return (
    <div className="card">
      <div className="flex-between">
        <h2 style={{ margin: 0 }}>Action plans</h2>
        {isManager && employeeId && (
          <button
            className="btn small"
            onClick={() => setCreating((v) => !v)}
          >
            {creating ? "Cancel" : "+ New action plan"}
          </button>
        )}
      </div>

      {creating && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--c-border)" }}>
          <div className="row">
            <div className="field">
              <label>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {sections.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Due date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
          <div className="field">
            <label>What should the employee do?</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the developmental action — pair with X, study Y, role-play Z."
            />
          </div>
          <button
            className="btn primary"
            disabled={!description.trim() || !employeeId}
            onClick={() => {
              if (!employeeId) return;
              onCreate({
                id: `ap-${Math.random().toString(36).slice(2, 8)}`,
                shopId,
                assignedTo: employeeId,
                assignedBy: currentUserId,
                category,
                description: description.trim(),
                dueDate,
                status: "open",
                acknowledgedAt: null,
                completedAt: null,
                verifiedAt: null,
                verificationNotes: "",
              });
              setDescription("");
              setCreating(false);
            }}
          >
            Assign
          </button>
        </div>
      )}

      {plans.length === 0 ? (
        <div className="empty">No action plans yet.</div>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0" }}>
          {plans.map((p) => (
            <li
              key={p.id}
              style={{
                padding: 12,
                border: "1px solid var(--c-border)",
                borderRadius: 8,
                marginBottom: 8,
              }}
            >
              <div className="flex-between">
                <strong>{p.category}</strong>
                <span className="pill">{p.status.replace(/_/g, " ")}</span>
              </div>
              <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                Due {formatRelative(p.dueDate)}
                {p.acknowledgedAt && ` · Acknowledged ${formatRelative(p.acknowledgedAt)}`}
                {p.completedAt && ` · Completed ${formatRelative(p.completedAt)}`}
                {p.verifiedAt && ` · Verified ${formatRelative(p.verifiedAt)}`}
              </div>
              <p style={{ marginTop: 6 }}>{p.description}</p>
              {p.verificationNotes && (
                <div className="callout success" style={{ marginTop: 6 }}>
                  <strong>Manager verification: </strong>
                  {p.verificationNotes}
                </div>
              )}
              <div className="btn-row" style={{ marginTop: 8 }}>
                {isEmployee && p.status === "open" && (
                  <button className="btn small primary" onClick={() => onAck(p.id)}>
                    Acknowledge
                  </button>
                )}
                {isEmployee && (p.status === "acknowledged" || p.status === "in_progress") && (
                  <button className="btn small primary" onClick={() => onComplete(p.id)}>
                    Mark complete
                  </button>
                )}
                {isManager && p.status === "completed" && (
                  <VerifyControl onVerify={(note) => onVerify(p.id, note)} />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function VerifyControl({ onVerify }: { onVerify: (note: string) => void }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  if (!open) {
    return (
      <button className="btn small primary" onClick={() => setOpen(true)}>
        Verify completion
      </button>
    );
  }
  return (
    <div style={{ width: "100%", marginTop: 6 }}>
      <textarea
        placeholder="Confirm what you observed (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="btn-row" style={{ marginTop: 6 }}>
        <button className="btn small" onClick={() => setOpen(false)}>
          Cancel
        </button>
        <button
          className="btn small primary"
          onClick={() => {
            onVerify(note);
            setOpen(false);
          }}
        >
          Verify
        </button>
      </div>
    </div>
  );
}

function AppealsSection({
  shopId,
  appeals,
  isEmployee,
  isManager,
  currentUserId,
  onFile,
  onResolve,
}: {
  shopId: string;
  appeals: Appeal[];
  isEmployee: boolean;
  isManager: boolean;
  currentUserId: string;
  onFile: (a: Appeal) => void;
  onResolve: (
    id: string,
    status: "approved" | "denied" | "partially_approved",
    notes: string,
    adj: number | null,
  ) => void;
}) {
  const [filing, setFiling] = useState(false);
  const [reason, setReason] = useState("");
  const [requestedChange, setRequestedChange] = useState("");
  const hasOpenAppeal = appeals.some(
    (a) => a.status === "open" || a.status === "under_review",
  );

  return (
    <div className="card">
      <div className="flex-between">
        <h2 style={{ margin: 0 }}>Appeals</h2>
        {isEmployee && !hasOpenAppeal && (
          <button className="btn small" onClick={() => setFiling((v) => !v)}>
            {filing ? "Cancel" : "File appeal"}
          </button>
        )}
      </div>

      {filing && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--c-border)" }}>
          <div className="callout">
            Appeals are private — only you and your manager see this until it's resolved.
          </div>
          <div className="field">
            <label>Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="What about this evaluation isn't accurate?"
            />
          </div>
          <div className="field">
            <label>Requested change</label>
            <textarea
              value={requestedChange}
              onChange={(e) => setRequestedChange(e.target.value)}
              placeholder="What would you like the manager to do?"
            />
          </div>
          <button
            className="btn primary"
            disabled={!reason.trim()}
            onClick={() => {
              onFile({
                id: `app-${Math.random().toString(36).slice(2, 8)}`,
                shopId,
                filedBy: currentUserId,
                filedAt: new Date().toISOString().slice(0, 10),
                reason: reason.trim(),
                requestedChange: requestedChange.trim(),
                status: "under_review",
                resolverId: null,
                resolutionNotes: "",
                resolvedAt: null,
                scoreAdjustmentApplied: null,
              });
              setReason("");
              setRequestedChange("");
              setFiling(false);
            }}
          >
            File appeal
          </button>
        </div>
      )}

      {appeals.length === 0 ? (
        <div className="empty">No appeals on this shop.</div>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0" }}>
          {appeals.map((a) => (
            <AppealItem
              key={a.id}
              appeal={a}
              isManager={isManager}
              onResolve={onResolve}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function AppealItem({
  appeal,
  isManager,
  onResolve,
}: {
  appeal: Appeal;
  isManager: boolean;
  onResolve: (
    id: string,
    status: "approved" | "denied" | "partially_approved",
    notes: string,
    adj: number | null,
  ) => void;
}) {
  const [resolving, setResolving] = useState(false);
  const [decision, setDecision] = useState<"approved" | "denied" | "partially_approved">("approved");
  const [notes, setNotes] = useState("");
  const [adjustment, setAdjustment] = useState<string>("");

  const open = appeal.status === "open" || appeal.status === "under_review";

  return (
    <li
      style={{
        padding: 12,
        border: "1px solid var(--c-border)",
        borderRadius: 8,
        marginBottom: 8,
      }}
    >
      <div className="flex-between">
        <strong>Appeal filed {formatRelative(appeal.filedAt)}</strong>
        <span className="pill">{appeal.status.replace(/_/g, " ")}</span>
      </div>
      <div className="field" style={{ marginTop: 8 }}>
        <div className="muted" style={{ fontSize: 12 }}>Reason</div>
        <div>{appeal.reason}</div>
      </div>
      {appeal.requestedChange && (
        <div className="field">
          <div className="muted" style={{ fontSize: 12 }}>Requested change</div>
          <div>{appeal.requestedChange}</div>
        </div>
      )}
      {appeal.resolutionNotes && (
        <div className="callout success">
          <strong>Manager resolution: </strong>
          {appeal.resolutionNotes}
          {appeal.scoreAdjustmentApplied != null && (
            <div className="muted">
              Score adjustment applied: {appeal.scoreAdjustmentApplied > 0 ? "+" : ""}
              {appeal.scoreAdjustmentApplied}
            </div>
          )}
        </div>
      )}

      {isManager && open && !resolving && (
        <button className="btn small primary" onClick={() => setResolving(true)} style={{ marginTop: 8 }}>
          Resolve
        </button>
      )}
      {isManager && resolving && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--c-border)" }}>
          <div className="row">
            <div className="field">
              <label>Decision</label>
              <select value={decision} onChange={(e) => setDecision(e.target.value as never)}>
                <option value="approved">Approve</option>
                <option value="partially_approved">Partially approve</option>
                <option value="denied">Deny</option>
              </select>
            </div>
            <div className="field">
              <label>Score adjustment</label>
              <input
                type="number"
                value={adjustment}
                onChange={(e) => setAdjustment(e.target.value)}
                placeholder="optional"
              />
            </div>
          </div>
          <div className="field">
            <label>Resolution notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Why did you decide this way?"
            />
          </div>
          <div className="btn-row">
            <button className="btn" onClick={() => setResolving(false)}>Cancel</button>
            <button
              className="btn primary"
              disabled={!notes.trim()}
              onClick={() => {
                onResolve(
                  appeal.id,
                  decision,
                  notes.trim(),
                  adjustment === "" ? null : Number(adjustment),
                );
                setResolving(false);
              }}
            >
              Submit decision
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
