import Anthropic from "@anthropic-ai/sdk";

// Per spec §6.9: most current Sonnet at time of build.
const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

const SUMMARIZER_SYSTEM = `You analyze mystery-shopper feedback for Stine LLC, a 14-location retailer.

Your job is to read shopper narratives and structured rubric answers, then produce concise, balanced summaries that focus on observable behaviors. Tone is developmental — what the employee did well, what they could improve — never punitive. Avoid PII (shopper names, addresses).

Output strictly valid JSON matching the shape requested. No prose outside the JSON.`;

interface ShopForSummary {
  type: string;
  shopDate: Date;
  percentage: number;
  narrative: string | null;
  answers: { text: string; answer: string; comment: string | null }[];
}

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!_client) _client = new Anthropic();
  return _client;
}

export interface ShopSummary {
  summary: string;
  strengths: string[];
  improvements: string[];
}

export async function summarizeShop(shop: ShopForSummary): Promise<ShopSummary> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("anthropic_api_key_missing");
  }

  const userContent = renderShopForPrompt(shop);

  const response = await client().messages.create({
    model: MODEL,
    max_tokens: 1024,
    thinking: { type: "adaptive" },
    // System prompt is the stable prefix; everything below the cache_control breakpoint
    // can be reused across summarization calls. Per shared/prompt-caching.md.
    system: [
      {
        type: "text",
        text: SUMMARIZER_SYSTEM,
        cache_control: { type: "ephemeral" },
      },
    ],
    output_config: {
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            strengths: { type: "array", items: { type: "string" } },
            improvements: { type: "array", items: { type: "string" } },
          },
          required: ["summary", "strengths", "improvements"],
          additionalProperties: false,
        },
      },
    },
    messages: [{ role: "user", content: userContent }],
  });

  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("ai_empty_response");
  return JSON.parse(text.text) as ShopSummary;
}

interface ThemeShop {
  shopId: string;
  date: string;
  percentage: number;
  narrative: string | null;
  topComments: string[];
}

export interface ThemeAnalysis {
  themes: { name: string; description: string; supportingShopIds: string[] }[];
  overallTrend: string;
}

export async function clusterThemes(scope: string, shops: ThemeShop[]): Promise<ThemeAnalysis> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("anthropic_api_key_missing");
  if (shops.length === 0) return { themes: [], overallTrend: "Not enough data." };

  const userBody =
    `Scope: ${scope}\n\nShops (${shops.length}):\n` +
    shops
      .map(
        (s, i) =>
          `[${i + 1}] id=${s.shopId} date=${s.date} score=${s.percentage.toFixed(0)}%\n` +
          `   narrative: ${s.narrative ?? "—"}\n` +
          `   comments: ${s.topComments.slice(0, 5).join(" | ") || "—"}`,
      )
      .join("\n\n");

  const response = await client().messages.create({
    model: MODEL,
    max_tokens: 2048,
    thinking: { type: "adaptive" },
    system: [
      {
        type: "text",
        text: SUMMARIZER_SYSTEM,
        cache_control: { type: "ephemeral" },
      },
    ],
    output_config: {
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            themes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  supportingShopIds: { type: "array", items: { type: "string" } },
                },
                required: ["name", "description", "supportingShopIds"],
                additionalProperties: false,
              },
            },
            overallTrend: { type: "string" },
          },
          required: ["themes", "overallTrend"],
          additionalProperties: false,
        },
      },
    },
    messages: [
      {
        role: "user",
        content: `Identify the top 3 recurring themes across these mystery shops and describe the overall trend. Reference shops by their id.\n\n${userBody}`,
      },
    ],
  });

  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("ai_empty_response");
  return JSON.parse(text.text) as ThemeAnalysis;
}

function renderShopForPrompt(shop: ShopForSummary): string {
  const answers = shop.answers
    .slice(0, 30)
    .map((a) => `  - ${a.text} → ${a.answer}${a.comment ? ` (note: ${a.comment})` : ""}`)
    .join("\n");
  return `Shop type: ${shop.type}
Date: ${shop.shopDate.toISOString().slice(0, 10)}
Score: ${shop.percentage.toFixed(1)}%

Rubric answers:
${answers}

Shopper narrative:
${shop.narrative ?? "(none)"}

Produce: a 2-3 sentence developmental summary, up to 3 specific strengths, and up to 3 specific areas to improve. Focus on observable behaviors.`;
}
