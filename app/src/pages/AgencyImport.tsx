import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store";
import type { Shop, ShopAnswer } from "../types";

const SAMPLE_CSV = `shop_date,location_code,type,shopper_ref,employee_email,greeting_q1,greeting_q2,product_q1,product_q2,product_q3,close_q1,close_q2,store_q1,store_q2,narrative
2026-04-22,STN-LAF,visit,FA-512,tyler@stine.com,YES,4,5,YES,4,YES,NO,5,YES,Friendly greeting; missed contractor account program at the close.
2026-04-23,STN-BR,visit,FA-512,jada@stine.com,YES,5,5,YES,5,YES,YES,5,YES,Excellent end to end. Asked qualifying questions and closed cleanly.
2026-04-24,STN-NAT,visit,FA-303,ben@stine.com,NO,3,4,NO,3,NO,NO,4,NO,Late greeting and missed cross-sell. Did not invite return visit.`;

interface PreviewRow {
  date: string;
  locationCode: string;
  type: string;
  shopperRef: string;
  employeeEmail: string;
  totalScore: number;
  percentage: number;
  narrative: string;
  answers: ShopAnswer[];
  locationId: string | null;
  employeeId: string | null;
}

export default function AgencyImport() {
  const { rubrics, locations, users, importShops } = useStore();
  const navigate = useNavigate();
  const [csv, setCsv] = useState(SAMPLE_CSV);
  const [parsed, setParsed] = useState<PreviewRow[] | null>(null);
  const [imported, setImported] = useState(false);

  const visitRubric = rubrics.find((r) => r.type === "visit")!;
  const visitQs = visitRubric.sections.flatMap((s) => s.questions);

  function parse() {
    const lines = csv.trim().split(/\r?\n/);
    const [, ...rows] = lines;
    const out: PreviewRow[] = rows.map((line) => {
      const cols = line.split(",");
      const [
        shop_date,
        location_code,
        type,
        shopper_ref,
        employee_email,
        ...answersAndNarrative
      ] = cols;
      const narrative = answersAndNarrative.pop() ?? "";
      const answers: ShopAnswer[] = visitQs.map((q, idx) => {
        const raw = answersAndNarrative[idx]?.trim() ?? "";
        let value: string | number | boolean = raw;
        let scoreAwarded = 0;
        if (q.type === "yes_no") {
          value = raw.toUpperCase() === "YES";
          scoreAwarded = value ? q.maxScore : 0;
        } else if (q.type === "scale_1_5") {
          const n = Number(raw) || 0;
          value = n;
          scoreAwarded = Math.round((n / 5) * q.maxScore);
        }
        return { questionId: q.id, value, scoreAwarded };
      });
      const totalScore = answers.reduce((sum, a) => sum + a.scoreAwarded, 0);
      const totalMax = visitQs.reduce((sum, q) => sum + q.maxScore, 0);
      const loc = locations.find((l) => l.code === location_code);
      const emp = users.find((u) => u.email === employee_email);
      return {
        date: shop_date,
        locationCode: location_code,
        type,
        shopperRef: shopper_ref,
        employeeEmail: employee_email,
        narrative,
        answers,
        totalScore,
        percentage: Math.round((totalScore / totalMax) * 100),
        locationId: loc?.id ?? null,
        employeeId: emp?.id ?? null,
      };
    });
    setParsed(out);
  }

  function commit() {
    if (!parsed) return;
    const totalMax = visitQs.reduce((sum, q) => sum + q.maxScore, 0);
    const newShops: Shop[] = parsed
      .filter((r) => r.locationId)
      .map((r) => ({
        id: `shop-imp-${Math.random().toString(36).slice(2, 8)}`,
        rubricId: visitRubric.id,
        type: "visit",
        locationId: r.locationId!,
        shopDate: r.date,
        evaluatedEmployeeId: r.employeeId,
        shopperName: r.shopperRef,
        status: "submitted",
        totalScore: r.totalScore,
        totalMax,
        percentage: r.percentage,
        narrative: r.narrative,
        answers: r.answers,
        createdAt: new Date().toISOString().slice(0, 10),
      }));
    importShops(newShops);
    setImported(true);
    setTimeout(() => navigate("/shops"), 800);
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Agency import</h1>
          <div className="sub">
            Phase 4 — generic CSV pipeline. Confirm field mappings with the
            agency before each import contract.
          </div>
        </div>
      </div>

      <div className="card">
        <h2>1. Paste CSV</h2>
        <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
          Expected columns:
          shop_date, location_code, type, shopper_ref, employee_email, then one
          column per visit-rubric question, then narrative.
        </div>
        <textarea
          rows={10}
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          style={{ fontFamily: "ui-monospace, monospace", fontSize: 12 }}
        />
        <div className="btn-row" style={{ marginTop: 8 }}>
          <button className="btn" onClick={() => setCsv(SAMPLE_CSV)}>
            Reset to sample
          </button>
          <button className="btn primary" onClick={parse}>
            Parse
          </button>
        </div>
      </div>

      {parsed && (
        <div className="card">
          <h2>2. Preview ({parsed.length} rows)</h2>
          <table className="list">
            <thead>
              <tr>
                <th>Date</th>
                <th>Location</th>
                <th>Employee</th>
                <th>Score</th>
                <th>Mapping</th>
              </tr>
            </thead>
            <tbody>
              {parsed.map((r, i) => (
                <tr key={i}>
                  <td>{r.date}</td>
                  <td>{r.locationCode}</td>
                  <td>{r.employeeEmail}</td>
                  <td>
                    <span className={"score " + (r.percentage >= 85 ? "green" : r.percentage >= 70 ? "amber" : "red")}>
                      {r.percentage}%
                    </span>
                  </td>
                  <td>
                    {r.locationId && r.employeeId ? (
                      <span className="pill green">resolved</span>
                    ) : !r.locationId ? (
                      <span className="pill red">location unknown</span>
                    ) : (
                      <span className="pill amber">store-level</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button
              className="btn primary"
              onClick={commit}
              disabled={imported || parsed.every((r) => !r.locationId)}
            >
              {imported ? "Imported ✓" : `Import ${parsed.filter((r) => r.locationId).length} shops`}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
