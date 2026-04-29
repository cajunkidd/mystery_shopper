import { useState } from "react";
import type { Shop } from "../types";

const cannedSummaries: Record<string, { summary: string; themes: string[]; sentiment: "positive" | "mixed" | "negative" }> = {
  "shop-001": {
    summary:
      "Shopper found product knowledge strong but flagged that the associate did not ask for the sale or surface the contractor program despite a clear pro-customer cue (rental property project).",
    themes: ["Close consistency", "Contractor program callout", "Cue recognition"],
    sentiment: "mixed",
  },
  "shop-002": {
    summary:
      "Uniformly positive shop. Shopper highlighted prompt greeting, qualifying questions, fit-for-need recommendation, the close, and loyalty signup — all four close behaviors landed.",
    themes: ["End-to-end close mastery", "Loyalty signup", "Prompt greeting"],
    sentiment: "positive",
  },
  "shop-003": {
    summary:
      "Caller experience missed multiple standards: late phone pickup, no branded greeting, no qualifying questions before quote, no invitation to visit. Note: associate appealed citing call handoff context.",
    themes: ["Phone greeting standard", "Discovery before quoting", "Invite-in close"],
    sentiment: "negative",
  },
  "shop-004": {
    summary:
      "New associate showed solid fundamentals — good greeting and product knowledge — with a single missed cross-sell opportunity (caulk on a tile job).",
    themes: ["Cross-sell habit", "New-hire fundamentals"],
    sentiment: "positive",
  },
  "shop-005": {
    summary:
      "Mid-tier shop. Late greeting and missed close are repeating patterns for this employee per recent shop history.",
    themes: ["Greeting timing", "Asking for the sale", "Repeat pattern"],
    sentiment: "mixed",
  },
};

export function AISummaryPanel({ shop }: { shop: Shop }) {
  const [generated, setGenerated] = useState(false);
  const result = cannedSummaries[shop.id];
  if (!result) {
    return (
      <div className="card">
        <h2>AI insights</h2>
        <div className="empty">
          Summary not yet generated for this shop.
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex-between">
        <h2 style={{ margin: 0 }}>AI insights</h2>
        <span className="pill blue">Phase 4 preview</span>
      </div>
      <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
        Generated via the same Anthropic API wrapper used by Contract Manager.
        Demo shows canned output keyed to seed shops.
      </div>

      {!generated ? (
        <button
          className="btn primary"
          style={{ marginTop: 12 }}
          onClick={() => setGenerated(true)}
        >
          Generate insights
        </button>
      ) : (
        <>
          <h3 style={{ marginTop: 14 }}>Summary</h3>
          <p>{result.summary}</p>

          <h3>Themes</h3>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {result.themes.map((t) => (
              <span key={t} className="pill blue">
                {t}
              </span>
            ))}
          </div>

          <h3 style={{ marginTop: 12 }}>Sentiment</h3>
          <span
            className={
              "pill " +
              (result.sentiment === "positive"
                ? "green"
                : result.sentiment === "negative"
                ? "red"
                : "amber")
            }
          >
            {result.sentiment}
          </span>
        </>
      )}
    </div>
  );
}
