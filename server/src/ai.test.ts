import { describe, it, expect, vi, afterEach } from "vitest";

// Capture the args passed to messages.create so we can assert on the request shape
// without making a real API call.
const messagesCreate = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: messagesCreate };
  },
}));

afterEach(() => {
  messagesCreate.mockReset();
});

describe("summarizeShop", () => {
  it("places cache_control on the system block (stable prefix)", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    messagesCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify({ summary: "ok", strengths: [], improvements: [], sentiment: "neutral" }),
        },
      ],
    });
    const { summarizeShop } = await import("./ai.js");
    await summarizeShop({
      type: "visit",
      shopDate: new Date("2026-04-01"),
      percentage: 80,
      narrative: "Shopper had a good experience.",
      answers: [{ text: "Greeted?", answer: "yes", comment: null }],
    });

    expect(messagesCreate).toHaveBeenCalledOnce();
    const call = messagesCreate.mock.calls[0][0];
    // Stable system prompt has the cache breakpoint.
    expect(call.system).toBeInstanceOf(Array);
    expect(call.system[0].cache_control).toEqual({ type: "ephemeral" });
    // Adaptive thinking, structured outputs, sensible model.
    expect(call.thinking).toEqual({ type: "adaptive" });
    expect(call.output_config.format.type).toBe("json_schema");
    // §6.9: sentiment is a required output field for negative-narrative flagging.
    expect(call.output_config.format.schema.required).toContain("sentiment");
    expect(call.model).toMatch(/^claude-/);
    // The user message contains the per-shop (volatile) content — must come AFTER
    // the cache breakpoint or the cache will never be reused.
    expect(call.messages[0].content).toContain("Shopper had a good experience.");
    expect(call.messages[0].cache_control).toBeUndefined();
  });
});

describe("extractShopFromPdf", () => {
  it("posts the PDF as a base64 document block with structured outputs", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    messagesCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            locationCodeOrName: "STN-SUL",
            shopDate: "2026-04-12",
            shopperName: "Pat Shopper",
            shopperExternalRef: "AGENCY-9988",
            narrative: "Friendly greeting; weak close.",
            type: "visit",
          }),
        },
      ],
    });
    const { extractShopFromPdf } = await import("./ai.js");
    const result = await extractShopFromPdf("dGVzdC1wZGY=");
    expect(result.locationCodeOrName).toBe("STN-SUL");
    expect(result.type).toBe("visit");

    const call = messagesCreate.mock.calls[0][0];
    // PDF goes in the user turn as a base64 document — never in the system prefix
    // (would invalidate the prompt cache for every new shop).
    const userBlocks = call.messages[0].content as Array<{ type: string; source?: { type: string; media_type: string } }>;
    const doc = userBlocks.find((b) => b.type === "document");
    expect(doc).toBeDefined();
    expect(doc?.source?.media_type).toBe("application/pdf");
    expect(doc?.source?.type).toBe("base64");
    // The system prompt is the only thing with the cache breakpoint.
    expect(call.system[0].cache_control).toEqual({ type: "ephemeral" });
    // Schema requires every field — we'd rather get nulls than guesses.
    const schema = call.output_config.format.schema;
    expect(schema.required).toEqual(
      expect.arrayContaining(["locationCodeOrName", "shopDate", "shopperName", "shopperExternalRef", "narrative", "type"]),
    );
  });

  it("throws when ANTHROPIC_API_KEY is missing", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const { extractShopFromPdf } = await import("./ai.js");
    await expect(extractShopFromPdf("xx")).rejects.toThrow("anthropic_api_key_missing");
  });
});
