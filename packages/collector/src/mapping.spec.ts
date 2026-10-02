import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import type { AntigravityStep } from "./antigravity";
import { parseCcusageDaily } from "./ccusage";
import type { DevinStep } from "./devin";
import { mapAntigravitySteps, mapCcusageDays, mapDevinSteps } from "./mapping";
import { costOf } from "./pricing";
import type { UsageDay } from "./usage";

const sample = await readFile(
  new URL("./test/ccusage-daily.json", import.meta.url),
  "utf8",
);

const expected: UsageDay[] = [
  {
    cache_create: 0,
    cache_read: 12108940,
    cost_usd: 3.4878810000000002,
    date: "2026-09-22",
    input: 1788879,
    model: "gemini-3.8-flash-high",
    output: 27925,
    provider: "antigravity",
  },
  {
    cache_create: 16901,
    cache_read: 13560,
    cost_usd: 0.036618000000000005,
    date: "2026-09-22",
    input: 10,
    model: "claude-haiku-4-5-20251001",
    output: 290,
    provider: "claude",
  },
  {
    cache_create: 6666790,
    cache_read: 451078084,
    cost_usd: 331.7700170000004,
    date: "2026-09-22",
    input: 4460,
    model: "claude-opus-5",
    output: 1581631,
    provider: "claude",
  },
  {
    cache_create: 584125,
    cache_read: 39873314,
    cost_usd: 14.793850800000003,
    date: "2026-09-22",
    input: 472,
    model: "claude-opus-5-5",
    output: 107215,
    provider: "claude",
  },
  {
    cache_create: 0,
    cache_read: 14315904,
    cost_usd: 0.287444712,
    date: "2026-09-22",
    input: 817896,
    model: "deepseek-v4.1-flash",
    output: 44989,
    provider: "opencode",
  },
  {
    cache_create: 0,
    cache_read: 2571968,
    cost_usd: 0.11519331040000001,
    date: "2026-09-22",
    input: 512264,
    model: "mimo-v2.6-flash",
    output: 70236,
    provider: "opencode",
  },
  {
    cache_create: 0,
    cache_read: 247424000,
    cost_usd: 2.942646000000001,
    date: "2026-09-22",
    input: 5511508,
    model: "deepseek-v4.1-flash",
    output: 2289413,
    provider: "pi",
  },
  {
    cache_create: 0,
    cache_read: 57988032,
    cost_usd: 3.098191910000003,
    date: "2026-09-22",
    input: 7295893,
    model: "glm-5.3-flash",
    output: 528334,
    provider: "pi",
  },
  {
    cache_create: 0,
    cache_read: 17461824,
    cost_usd: 0.2582674471999998,
    date: "2026-09-22",
    input: 633541,
    model: "mimo-v2.6-flash",
    output: 430995,
    provider: "pi",
  },
  {
    cache_create: 5872744,
    cache_read: 307359443,
    cost_usd: 136.44884459999983,
    date: "2026-09-26",
    input: 3376,
    model: "claude-opus-5-5",
    output: 1399075,
    provider: "claude",
  },
  {
    cache_create: 0,
    cache_read: 238604288,
    cost_usd: 127.04867119999999,
    date: "2026-09-26",
    input: 4712394,
    model: "gpt-5.6-sol",
    output: 637869,
    provider: "codex",
  },
  {
    cache_create: 0,
    cache_read: 1446912,
    cost_usd: 2.8843419999999997,
    date: "2026-09-26",
    input: 108123,
    model: "gpt-6-astra",
    output: 7124,
    provider: "codex",
  },
];

describe("mapCcusageDays", () => {
  it("maps the captured 20.0.26 sample to the reported rows", () => {
    expect(mapCcusageDays(parseCcusageDaily(sample))).toEqual(expected);
  });

  it("sums the rows that collapse to one date, provider and model", () => {
    const collapsed = mapCcusageDays(
      parseCcusageDaily(
        JSON.stringify({
          daily: [
            {
              agents: [
                {
                  agent: "pi",
                  modelBreakdowns: [
                    {
                      cacheCreationTokens: 10,
                      cacheReadTokens: 20,
                      cost: 0.5,
                      inputTokens: 100,
                      modelName: "[pi] deepseek-v4-flash",
                      outputTokens: 50,
                    },
                    {
                      cacheCreationTokens: 1,
                      cacheReadTokens: 2,
                      cost: 0.25,
                      inputTokens: 10,
                      modelName: "deepseek-v4-flash",
                      outputTokens: 5,
                    },
                  ],
                },
              ],
              period: "2026-09-22",
            },
          ],
        }),
      ),
    );

    expect(collapsed).toEqual([
      {
        cache_create: 11,
        cache_read: 22,
        cost_usd: 0.75,
        date: "2026-09-22",
        input: 110,
        model: "deepseek-v4-flash",
        output: 55,
        provider: "pi",
      },
    ]);
  });

  it("drops a model breakdown whose four token counts are zero", () => {
    const mapped = mapCcusageDays(
      parseCcusageDaily(
        JSON.stringify({
          daily: [
            {
              agents: [
                {
                  agent: "claude",
                  modelBreakdowns: [
                    {
                      cacheCreationTokens: 0,
                      cacheReadTokens: 0,
                      cost: 0,
                      inputTokens: 0,
                      modelName: "claude-sonnet-5",
                      outputTokens: 0,
                    },
                    {
                      cacheCreationTokens: 1,
                      cacheReadTokens: 2,
                      cost: 0.5,
                      inputTokens: 10,
                      modelName: "claude-opus-5",
                      outputTokens: 20,
                    },
                  ],
                },
              ],
              period: "2026-09-22",
            },
          ],
        }),
      ),
    );

    expect(mapped.map((day) => day.model)).toEqual(["claude-opus-5"]);
  });

  it("strips the agent prefix from model names", () => {
    const models = mapCcusageDays(parseCcusageDaily(sample))
      .filter((day) => day.provider === "pi")
      .map((day) => day.model);

    expect(models).toContain("deepseek-v4.1-flash");
    expect(models.some((model) => model.startsWith("["))).toBe(false);
  });

  it("rejects a sample without daily", () => {
    expect(() => parseCcusageDaily('{"totals":{}}')).toThrow(/daily/);
  });
});

describe("mapAntigravitySteps", () => {
  const flash = {
    cacheCreate: 0,
    cacheRead: 7.5e-8,
    input: 7.5e-7,
    output: 3.75e-6,
  };
  const previous = { cacheCreate: 0, cacheRead: 0, input: 5e-7, output: 3e-6 };
  const prices = new Map([
    ["gemini-3.8-flash", flash],
    ["gemini/gemini-3.7-flash", previous],
  ]);
  const steps: AntigravityStep[] = [
    {
      at: new Date("2026-09-12T22:30:00.000Z"),
      cacheRead: 0,
      input: 2232,
      model: "gemini-3.8-flash",
      output: 229,
    },
    {
      at: new Date("2026-09-13T12:26:50.000Z"),
      cacheRead: 8144,
      input: 9536,
      model: "gemini-3.8-flash",
      output: 133,
    },
    {
      at: new Date("2026-09-13T12:27:00.000Z"),
      cacheRead: 10,
      input: 100,
      model: "gemini-3.8-flash",
      output: 20,
    },
    {
      at: new Date("2026-09-13T12:28:00.000Z"),
      cacheRead: 0,
      input: 50,
      model: "gemini-3.7-flash",
      output: 5,
    },
    {
      at: new Date("2026-09-13T12:29:00.000Z"),
      cacheRead: 0,
      input: 204,
      model: "gemini-unknown",
      output: 4,
    },
    {
      at: new Date("2026-09-13T12:30:00.000Z"),
      cacheRead: 0,
      input: 0,
      model: "gemini-3.8-flash",
      output: 0,
    },
  ];
  const flashDay: UsageDay = {
    cache_create: 0,
    cache_read: 8154,
    cost_usd: costOf(flash, { cacheRead: 8154, input: 11868, output: 382 }),
    date: "2026-09-13",
    input: 11868,
    model: "gemini-3.8-flash",
    output: 382,
    provider: "antigravity",
  };
  const previousDay: UsageDay = {
    cache_create: 0,
    cache_read: 0,
    cost_usd: costOf(previous, { cacheRead: 0, input: 50, output: 5 }),
    date: "2026-09-13",
    input: 50,
    model: "gemini-3.7-flash",
    output: 5,
    provider: "antigravity",
  };
  const unknownDay: UsageDay = {
    cache_create: 0,
    cache_read: 0,
    cost_usd: 0,
    date: "2026-09-13",
    input: 204,
    model: "gemini-unknown",
    output: 4,
    provider: "antigravity",
  };

  it("sums each model per calendar day of the timezone and prices it", () => {
    expect(mapAntigravitySteps(steps, "Europe/Madrid", prices)).toEqual({
      days: [previousDay, flashDay, unknownDay],
      warnings: ["antigravity: no price for gemini-unknown"],
    });
  });

  it("warns once for a model the table does not cover and keeps its rows", () => {
    const unknown: AntigravityStep[] = [
      {
        at: new Date("2026-09-12T12:00:00.000Z"),
        cacheRead: 0,
        input: 10,
        model: "gemini-unknown",
        output: 1,
      },
      {
        at: new Date("2026-09-13T12:00:00.000Z"),
        cacheRead: 0,
        input: 20,
        model: "gemini-unknown",
        output: 2,
      },
    ];

    const mapped = mapAntigravitySteps(unknown, "UTC", prices);

    expect(mapped.warnings).toEqual([
      "antigravity: no price for gemini-unknown",
    ]);
    expect(mapped.days).toEqual([
      {
        cache_create: 0,
        cache_read: 0,
        cost_usd: 0,
        date: "2026-09-12",
        input: 10,
        model: "gemini-unknown",
        output: 1,
        provider: "antigravity",
      },
      {
        cache_create: 0,
        cache_read: 0,
        cost_usd: 0,
        date: "2026-09-13",
        input: 20,
        model: "gemini-unknown",
        output: 2,
        provider: "antigravity",
      },
    ]);
  });

  it("splits the days by the timezone it is given", () => {
    const days = mapAntigravitySteps(steps, "UTC", prices).days.map(
      (day) => [day.date, day.model, day.input] as const,
    );

    expect(days).toEqual([
      ["2026-09-12", "gemini-3.8-flash", 2232],
      ["2026-09-13", "gemini-3.7-flash", 50],
      ["2026-09-13", "gemini-3.8-flash", 9636],
      ["2026-09-13", "gemini-unknown", 204],
    ]);
  });
});

describe("mapDevinSteps", () => {
  const fable = {
    cacheCreate: 1.25e-5,
    cacheRead: 2.5e-7,
    input: 1e-5,
    output: 5e-5,
  };
  const sol = { cacheCreate: 5e-6, cacheRead: 4e-7, input: 4e-6, output: 2e-5 };
  const prices = new Map([
    ["claude-fable-5-1", fable],
    ["gpt-5.6-sol", sol],
  ]);
  const at = new Date("2026-09-19T16:01:31.208Z");
  const steps: DevinStep[] = [
    {
      at,
      cacheCreate: 1100211,
      cacheRead: 55834239,
      input: 772,
      model: "claude-fable-5-1-high",
      output: 245921,
    },
    {
      at,
      cacheCreate: 2552197,
      cacheRead: 64854071,
      input: 672,
      model: "claude-fable-5-1-xhigh",
      output: 270203,
    },
    {
      at,
      cacheCreate: 24494,
      cacheRead: 0,
      input: 3,
      model: "gpt-5-6-sol-high",
      output: 114,
    },
    {
      at,
      cacheCreate: 0,
      cacheRead: 0,
      input: 17615,
      model: "swe-2-medium",
      output: 48,
    },
  ];

  it("collapses the effort levels of a model into its LiteLLM name and prices it", () => {
    expect(mapDevinSteps(steps, "Europe/Madrid", prices)).toEqual({
      days: [
        {
          cache_create: 3652408,
          cache_read: 120688310,
          cost_usd: costOf(fable, {
            cacheCreate: 3652408,
            cacheRead: 120688310,
            input: 1444,
            output: 516124,
          }),
          date: "2026-09-19",
          input: 1444,
          model: "claude-fable-5-1",
          output: 516124,
          provider: "devin",
        },
        {
          cache_create: 24494,
          cache_read: 0,
          cost_usd: costOf(sol, {
            cacheCreate: 24494,
            cacheRead: 0,
            input: 3,
            output: 114,
          }),
          date: "2026-09-19",
          input: 3,
          model: "gpt-5.6-sol",
          output: 114,
          provider: "devin",
        },
        {
          cache_create: 0,
          cache_read: 0,
          cost_usd: 0,
          date: "2026-09-19",
          input: 17615,
          model: "swe-2",
          output: 48,
          provider: "devin",
        },
      ],
      warnings: ["devin: no price for swe-2"],
    });
  });
});
