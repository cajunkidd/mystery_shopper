import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../api";

type QType = "yes_no" | "scale_1_5" | "multi_choice" | "free_text" | "photo_required" | "audio_required";

interface Question {
  id?: string;
  text: string;
  questionType: QType;
  maxScore: number;
  weight: number;
  required: boolean;
  displayOrder: number;
}

interface Section {
  id?: string;
  name: string;
  displayOrder: number;
  weight: number;
  questions: Question[];
}

interface Rubric {
  id: string;
  name: string;
  type: string;
  version: number;
  status: string;
  sections: Section[];
}

export default function RubricEditor() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [rubric, setRubric] = useState<Rubric | null>(null);
  const [name, setName] = useState("");
  const [sections, setSections] = useState<Section[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragSection, setDragSection] = useState<number | null>(null);
  const [dragQ, setDragQ] = useState<{ sIdx: number; qIdx: number } | null>(null);

  useEffect(() => {
    if (!id) return;
    api<{ rubric: Rubric }>(`/rubrics/${id}`).then((r) => {
      setRubric(r.rubric);
      setName(r.rubric.name);
      setSections(r.rubric.sections);
    });
  }, [id]);

  function addSection() {
    setSections((s) => [
      ...s,
      {
        name: `Section ${s.length + 1}`,
        displayOrder: s.length + 1,
        weight: 1,
        questions: [{ text: "", questionType: "yes_no", maxScore: 10, weight: 1, required: true, displayOrder: 1 }],
      },
    ]);
  }
  function updateSection(idx: number, patch: Partial<Section>) {
    setSections((s) => s.map((sec, i) => (i === idx ? { ...sec, ...patch } : sec)));
  }
  function removeSection(idx: number) {
    setSections((s) => s.filter((_, i) => i !== idx));
  }
  function addQuestion(sIdx: number) {
    updateSection(sIdx, {
      questions: [
        ...sections[sIdx].questions,
        {
          text: "",
          questionType: "yes_no",
          maxScore: 10,
          weight: 1,
          required: true,
          displayOrder: sections[sIdx].questions.length + 1,
        },
      ],
    });
  }
  function updateQuestion(sIdx: number, qIdx: number, patch: Partial<Question>) {
    updateSection(sIdx, {
      questions: sections[sIdx].questions.map((q, i) => (i === qIdx ? { ...q, ...patch } : q)),
    });
  }
  function removeQuestion(sIdx: number, qIdx: number) {
    updateSection(sIdx, { questions: sections[sIdx].questions.filter((_, i) => i !== qIdx) });
  }

  function reorderSections(from: number, to: number) {
    if (from === to) return;
    setSections((s) => {
      const out = [...s];
      const [moved] = out.splice(from, 1);
      out.splice(to, 0, moved);
      return out.map((sec, i) => ({ ...sec, displayOrder: i + 1 }));
    });
  }
  function reorderQuestions(sIdx: number, from: number, to: number) {
    if (from === to) return;
    const sec = sections[sIdx];
    const out = [...sec.questions];
    const [moved] = out.splice(from, 1);
    out.splice(to, 0, moved);
    updateSection(sIdx, { questions: out.map((q, i) => ({ ...q, displayOrder: i + 1 })) });
  }

  async function save() {
    if (!rubric) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/rubrics/${rubric.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name, sections }),
      });
      nav("/admin/rubrics");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!rubric) return <p className="text-slate-500">Loading…</p>;
  const locked = rubric.status !== "draft";

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold">Rubric editor</h1>
          <p className="text-sm text-slate-500">Type: {rubric.type} · v{rubric.version} · {rubric.status}</p>
        </div>
        {!locked && (
          <button className="btn-primary" onClick={save} disabled={busy}>
            Save
          </button>
        )}
      </div>
      {locked && (
        <div className="card bg-amber-50 border-amber-200 text-sm text-amber-900">
          This rubric is {rubric.status}. Editing is locked. Activate a new draft version to make changes.
        </div>
      )}
      {error && <div className="card bg-rose-50 border-rose-200 text-rose-900 text-sm">{error}</div>}

      <div className="card">
        <label className="label">Name</label>
        <input className="input" value={name} disabled={locked} onChange={(e) => setName(e.target.value)} />
      </div>

      {sections.map((section, sIdx) => (
        <div
          key={sIdx}
          className={`card space-y-3 ${dragSection === sIdx ? "opacity-60" : ""}`}
          draggable={!locked}
          onDragStart={() => setDragSection(sIdx)}
          onDragOver={(e) => {
            if (dragSection != null && dragSection !== sIdx) e.preventDefault();
          }}
          onDrop={() => {
            if (dragSection != null) reorderSections(dragSection, sIdx);
            setDragSection(null);
          }}
          onDragEnd={() => setDragSection(null)}
        >
          <div className="flex items-center gap-2">
            {!locked && <span className="cursor-grab text-slate-300 select-none" title="Drag to reorder">⋮⋮</span>}
            <input
              className="input flex-1 font-medium"
              value={section.name}
              disabled={locked}
              onChange={(e) => updateSection(sIdx, { name: e.target.value })}
            />
            {!locked && (
              <button className="btn-danger text-xs" onClick={() => removeSection(sIdx)}>
                Remove section
              </button>
            )}
          </div>
          {section.questions.map((q, qIdx) => (
            <div
              key={qIdx}
              className={`border-l-2 border-slate-200 pl-3 space-y-2 ${dragQ?.sIdx === sIdx && dragQ.qIdx === qIdx ? "opacity-60" : ""}`}
              draggable={!locked}
              onDragStart={(e) => {
                e.stopPropagation();
                setDragQ({ sIdx, qIdx });
              }}
              onDragOver={(e) => {
                if (dragQ?.sIdx === sIdx && dragQ.qIdx !== qIdx) {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}
              onDrop={(e) => {
                e.stopPropagation();
                if (dragQ?.sIdx === sIdx) reorderQuestions(sIdx, dragQ.qIdx, qIdx);
                setDragQ(null);
              }}
              onDragEnd={() => setDragQ(null)}
            >
              <textarea
                className="input"
                rows={2}
                placeholder="Question text"
                value={q.text}
                disabled={locked}
                onChange={(e) => updateQuestion(sIdx, qIdx, { text: e.target.value })}
              />
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-sm">
                <select
                  className="input"
                  value={q.questionType}
                  disabled={locked}
                  onChange={(e) => updateQuestion(sIdx, qIdx, { questionType: e.target.value as QType })}
                >
                  <option value="yes_no">Yes / No</option>
                  <option value="scale_1_5">Scale 1–5</option>
                  <option value="free_text">Free text</option>
                  <option value="multi_choice">Multi choice</option>
                  <option value="photo_required">Photo required</option>
                  <option value="audio_required">Audio required</option>
                </select>
                <input
                  className="input"
                  type="number"
                  step="0.5"
                  placeholder="Max score"
                  value={q.maxScore}
                  disabled={locked}
                  onChange={(e) => updateQuestion(sIdx, qIdx, { maxScore: Number(e.target.value) })}
                />
                <label className="flex items-center gap-2 text-slate-700">
                  <input
                    type="checkbox"
                    checked={q.required}
                    disabled={locked}
                    onChange={(e) => updateQuestion(sIdx, qIdx, { required: e.target.checked })}
                  />
                  Required
                </label>
                {!locked && (
                  <button className="btn-secondary text-xs" onClick={() => removeQuestion(sIdx, qIdx)}>
                    Remove question
                  </button>
                )}
              </div>
            </div>
          ))}
          {!locked && (
            <button className="btn-secondary text-xs" onClick={() => addQuestion(sIdx)}>
              Add question
            </button>
          )}
        </div>
      ))}

      {!locked && (
        <button className="btn-secondary" onClick={addSection}>
          Add section
        </button>
      )}
    </div>
  );
}
