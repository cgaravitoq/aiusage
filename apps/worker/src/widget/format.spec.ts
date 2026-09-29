import { describe, expect, it } from "vitest";
import { compactTokens, dotCount, dotLevels, usdCost } from "./format";
import type { UsageSummary } from "./summary";
import { fixture } from "./test/fixture";

describe("token and cost formatting", () => {
  it("formats compact tokens in English whatever the locale", () => {
    const week = fixture("week");
    expect(compactTokens().format(week.totals.tokens)).toBe("16.3B");
    expect(compactTokens().format(1_758_100_000)).toBe("1.8B");
  });

  it("formats the API-equivalent cost in dollars per locale", () => {
    expect(usdCost("en").format(3882.03)).toBe("$3,882");
    expect(usdCost("es").format(3882.03)).toContain("US$");
  });
});

describe("dotLevels", () => {
  it("maps the last eight days of the production month to the five dot steps", () => {
    expect(dotLevels(fixture("month"))).toEqual([2, 4, 3, 4, 2, 2, 3, 2]);
  });

  it("reads the eight days that end on the summary's last day", () => {
    const history: UsageSummary = {
      ...fixture("month"),
      to: "2026-09-29",
      days: [
        { date: "2026-09-22", tokens: 100 },
        { date: "2026-09-29", tokens: 400 },
      ],
    };
    expect(dotLevels(history)).toEqual([1, 0, 0, 0, 0, 0, 0, 4]);
    expect(dotLevels(history)).toHaveLength(dotCount);
  });

  it("keeps every level inside the five steps", () => {
    for (const level of dotLevels(fixture("month"))) {
      expect(level).toBeGreaterThanOrEqual(0);
      expect(level).toBeLessThanOrEqual(4);
    }
  });
});
