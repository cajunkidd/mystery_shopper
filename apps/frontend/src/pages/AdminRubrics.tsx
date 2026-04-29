import { useState } from "react";
import { useStore } from "../store";
import type { QuestionType, Rubric, RubricQuestion, RubricSection, RubricType } from "../types";

export default function AdminRubrics() {
  const { rubrics, saveRubric, activateRubric, retireRubric } = useStore();
  const [editingId, setEditingId] = useState<string | null>(null);

  const editing = editingId ? rubrics.find((r) => r.id === editingId) : null;

  function newDraft(type: RubricType) {
    const sameType = rubrics.filter((r) => r.type === type);
    const nextVersion =
      Math.max(0, ...sameType.map((r) => r.version)) + 1;
    const draft: Rubric = {
      id: `rub-${Math.random().toString(36).slice(2, 8)}`,
      name: `${type === "visit" ? "In-Store Visit" : type === "call" ? "Mystery Caller" : "Inquiry"} v${nextVersion}`,
      type,
      version: nextVersion,
      status: "draft",
      sections: [
        {
          id: `sec-${Math.random().toString(36).slice(2, 6)}`,
          name: "New section",
          weight: 1,
          questions: [],
        },
      ],
    };
    saveRubric(draft);
    setEditingId(draft.id);
  }

  if (editing) {
    return (
      <RubricEditor
        rubric={editing}
        onSave={saveRubric}
        onClose={() => setEditingId(null)}
        onActivate={() => {
          activateRubric(editing.id);
          setEditingId(null);
        }}
      />
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Rubrics</h1>
          <div className="sub">
            Snapshot per shop ensures historical accuracy when versions
            change. Activate a draft to retire the prior active version of
            the same type.
          </div>
        </div>
        <div className="btn-row">
          <button className="btn" onClick={() => newDraft("visit")}>
            + New visit rubric
          </button>
          <button className="btn" onClick={() => newDraft("call")}>
            + New caller rubric
          </button>
        </div>
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
                  v{r.version} · {r.type} · max {max} pts ·{" "}
                  {r.sections.length} section
                  {r.sections.length === 1 ? "" : "s"}
                </div>
              </div>
              <div className="btn-row">
                <span
                  className={
                    "pill " +
                    (r.status === "active"
                      ? "green"
                      : r.status === "draft"
                      ? "amber"
                      : "")
                  }
                >
                  {r.status}
                </span>
                {r.status === "draft" && (
                  <button
                    className="btn small primary"
                    onClick={() => setEditingId(r.id)}
                  >
                    Edit
                  </button>
                )}
                {r.status === "draft" && r.sections.some((s) => s.questions.length > 0) && (
                  <button
                    className="btn small primary"
                    onClick={() => activateRubric(r.id)}
                  >
                    Activate
                  </button>
                )}
                {r.status === "active" && (
                  <button
                    className="btn small"
                    onClick={() => {
                      if (confirm("Retire this rubric?")) retireRubric(r.id);
                    }}
                  >
                    Retire
                  </button>
                )}
                {r.status !== "draft" && (
                  <button
                    className="btn small"
                    onClick={() => setEditingId(r.id)}
                  >
                    View
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}

const QUESTION_TYPES: QuestionType[] = ["yes_no", "scale_1_5", "multi_choice", "free_text"];

function RubricEditor({
  rubric,
  onSave,
  onClose,
  onActivate,
}: {
  rubric: Rubric;
  onSave: (r: Rubric) => void;
  onClose: () => void;
  onActivate: () => void;
}) {
  const [name, setName] = useState(rubric.name);
  const [sections, setSections] = useState<RubricSection[]>(rubric.sections);
  const isDraft = rubric.status === "draft";

  function persist(next: RubricSection[], nextName = name) {
    setSections(next);
    onSave({ ...rubric, name: nextName, sections: next });
  }

  function moveSection(idx: number, delta: number) {
    const newIdx = idx + delta;
    if (newIdx < 0 || newIdx >= sections.length) return;
    const next = [...sections];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    persist(next);
  }

  function moveQuestion(sIdx: number, qIdx: number, delta: number) {
    const newIdx = qIdx + delta;
    const sec = sections[sIdx];
    if (newIdx < 0 || newIdx >= sec.questions.length) return;
    const nextQs = [...sec.questions];
    [nextQs[qIdx], nextQs[newIdx]] = [nextQs[newIdx], nextQs[qIdx]];
    const next = sections.map((s, i) =>
      i === sIdx ? { ...s, questions: nextQs } : s,
    );
    persist(next);
  }

  function addSection() {
    const next = [
      ...sections,
      {
        id: `sec-${Math.random().toString(36).slice(2, 6)}`,
        name: "New section",
        weight: 1,
        questions: [],
      },
    ];
    persist(next);
  }

  function removeSection(idx: number) {
    persist(sections.filter((_, i) => i !== idx));
  }

  function addQuestion(sIdx: number) {
    const q: RubricQuestion = {
      id: `q-${Math.random().toString(36).slice(2, 6)}`,
      text: "New question",
      type: "yes_no",
      maxScore: 10,
      required: true,
    };
    const next = sections.map((s, i) =>
      i === sIdx ? { ...s, questions: [...s.questions, q] } : s,
    );
    persist(next);
  }

  function updateSection(idx: number, patch: Partial<RubricSection>) {
    const next = sections.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    persist(next);
  }

  function updateQuestion(sIdx: number, qIdx: number, patch: Partial<RubricQuestion>) {
    const next = sections.map((s, i) =>
      i === sIdx
        ? {
            ...s,
            questions: s.questions.map((q, j) =>
              j === qIdx ? { ...q, ...patch } : q,
            ),
          }
        : s,
    );
    persist(next);
  }

  function removeQuestion(sIdx: number, qIdx: number) {
    const next = sections.map((s, i) =>
      i === sIdx
        ? { ...s, questions: s.questions.filter((_, j) => j !== qIdx) }
        : s,
    );
    persist(next);
  }

  const total = sections
    .flatMap((s) => s.questions)
    .reduce((sum, q) => sum + q.maxScore, 0);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>{isDraft ? "Edit rubric" : "View rubric"}</h1>
          <div className="sub">
            v{rubric.version} · {rubric.type} ·{" "}
            <span className="pill">{rubric.status}</span>
          </div>
        </div>
        <div className="btn-row">
          <button className="btn" onClick={onClose}>
            ← Back
          </button>
          {isDraft && (
            <button
              className="btn primary"
              disabled={sections.every((s) => s.questions.length === 0)}
              onClick={onActivate}
            >
              Activate
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <div className="field">
          <label>Rubric name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={(e) => persist(sections, e.target.value)}
            disabled={!isDraft}
          />
        </div>
        <div className="muted" style={{ fontSize: 13 }}>
          Total max score: <strong>{total}</strong>
        </div>
      </div>

      {sections.map((section, sIdx) => (
        <div className="section-block" key={section.id}>
          <div className="head">
            <div style={{ flex: 1, display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="text"
                value={section.name}
                onChange={(e) =>
                  updateSection(sIdx, { name: e.target.value })
                }
                disabled={!isDraft}
                style={{ maxWidth: 300 }}
              />
              <span className="muted" style={{ fontSize: 12 }}>
                Weight
              </span>
              <input
                type="number"
                step={0.05}
                value={section.weight}
                onChange={(e) =>
                  updateSection(sIdx, { weight: Number(e.target.value) })
                }
                disabled={!isDraft}
                style={{ maxWidth: 80 }}
              />
            </div>
            {isDraft && (
              <div className="btn-row">
                <button
                  className="btn small"
                  onClick={() => moveSection(sIdx, -1)}
                  disabled={sIdx === 0}
                >
                  ↑
                </button>
                <button
                  className="btn small"
                  onClick={() => moveSection(sIdx, +1)}
                  disabled={sIdx === sections.length - 1}
                >
                  ↓
                </button>
                <button
                  className="btn small danger"
                  onClick={() => removeSection(sIdx)}
                >
                  Remove
                </button>
              </div>
            )}
          </div>
          <div className="body">
            {section.questions.length === 0 ? (
              <div className="empty">No questions yet.</div>
            ) : (
              section.questions.map((q, qIdx) => (
                <div key={q.id} className="q-row">
                  {isDraft ? (
                    <>
                      <input
                        type="text"
                        value={q.text}
                        onChange={(e) =>
                          updateQuestion(sIdx, qIdx, { text: e.target.value })
                        }
                      />
                      <div className="row" style={{ marginTop: 6 }}>
                        <select
                          value={q.type}
                          onChange={(e) =>
                            updateQuestion(sIdx, qIdx, {
                              type: e.target.value as QuestionType,
                            })
                          }
                        >
                          {QUESTION_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t.replace(/_/g, " ")}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          value={q.maxScore}
                          onChange={(e) =>
                            updateQuestion(sIdx, qIdx, {
                              maxScore: Number(e.target.value),
                            })
                          }
                          placeholder="Max score"
                        />
                        <label
                          style={{
                            display: "flex",
                            gap: 6,
                            alignItems: "center",
                            fontWeight: 400,
                            margin: 0,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={q.required}
                            onChange={(e) =>
                              updateQuestion(sIdx, qIdx, {
                                required: e.target.checked,
                              })
                            }
                          />
                          Required
                        </label>
                      </div>
                      <div className="btn-row" style={{ marginTop: 6 }}>
                        <button
                          className="btn small"
                          onClick={() => moveQuestion(sIdx, qIdx, -1)}
                          disabled={qIdx === 0}
                        >
                          ↑
                        </button>
                        <button
                          className="btn small"
                          onClick={() => moveQuestion(sIdx, qIdx, +1)}
                          disabled={qIdx === section.questions.length - 1}
                        >
                          ↓
                        </button>
                        <button
                          className="btn small danger"
                          onClick={() => removeQuestion(sIdx, qIdx)}
                        >
                          Remove
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="q-text">{q.text}</div>
                      <div className="q-meta">
                        {q.type.replace(/_/g, " ")} · max {q.maxScore} pts
                        {q.required ? " · required" : ""}
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
            {isDraft && (
              <button
                className="btn small"
                onClick={() => addQuestion(sIdx)}
                style={{ marginTop: 8 }}
              >
                + Add question
              </button>
            )}
          </div>
        </div>
      ))}

      {isDraft && (
        <button className="btn" onClick={addSection}>
          + Add section
        </button>
      )}
    </>
  );
}
