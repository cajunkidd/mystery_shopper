import { describe, it, expect } from "vitest";
import { parseCsvLine } from "./csv";

describe("parseCsvLine", () => {
  it("splits on commas outside of quotes", () => {
    expect(parseCsvLine("a,b,c")).toEqual(["a", "b", "c"]);
  });

  it("preserves commas inside quoted values", () => {
    expect(parseCsvLine('one,"two, with comma",three')).toEqual(["one", "two, with comma", "three"]);
  });

  it("handles escaped quotes via doubled-quote", () => {
    expect(parseCsvLine('a,"she said ""hi""",c')).toEqual(["a", 'she said "hi"', "c"]);
  });

  it("returns an empty trailing column for a trailing comma", () => {
    expect(parseCsvLine("a,b,")).toEqual(["a", "b", ""]);
  });

  it("handles a single value with no commas", () => {
    expect(parseCsvLine("hello")).toEqual(["hello"]);
  });

  it("handles an empty string", () => {
    expect(parseCsvLine("")).toEqual([""]);
  });
});
