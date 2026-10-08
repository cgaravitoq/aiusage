import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  utimes,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Fetcher } from "./http";
import {
  costOf,
  litellmPricesUrl,
  loadPrices,
  parseLitellmPrices,
  priceFor,
} from "./pricing";

const sample = JSON.stringify({
  "gemini-3.8-flash": {
    cache_creation_input_token_cost: 1.25e-6,
    cache_read_input_token_cost: 7.5e-8,
    input_cost_per_token: 7.5e-7,
    litellm_provider: "gemini",
    output_cost_per_token: 3.75e-6,
  },
  "gemini/gemini-3.8-flash": {
    input_cost_per_token: 7.5e-7,
    output_cost_per_token: 3.75e-6,
  },
  sample_spec: { input_cost_per_token: 0, litellm_provider: "one of..." },
  "text-embedding-3-small": { input_cost_per_token: 2e-8 },
});

const fetcherReturning = (
  status: number,
  body: string,
  calls: string[],
): Fetcher => {
  return async (url) => {
    calls.push(url);
    return { status, text: async () => body };
  };
};

const failingFetcher: Fetcher = async () => {
  throw new Error("offline");
};

let dir: string;
let pricesFile: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "aiusage-prices-"));
  pricesFile = join(dir, "aiusage", "litellm-prices.json");
});

afterEach(async () => {
  await rm(dir, { force: true, recursive: true });
});

describe("parseLitellmPrices", () => {
  it("keeps the entries priced per input and output token", () => {
    const table = parseLitellmPrices(sample);

    expect([...table.keys()]).toEqual([
      "gemini-3.8-flash",
      "gemini/gemini-3.8-flash",
    ]);
    expect(table.get("gemini-3.8-flash")).toEqual({
      cacheCreate: 1.25e-6,
      cacheRead: 7.5e-8,
      input: 7.5e-7,
      output: 3.75e-6,
    });
    expect(table.get("gemini/gemini-3.8-flash")).toEqual({
      cacheCreate: 0,
      cacheRead: 0,
      input: 7.5e-7,
      output: 3.75e-6,
    });
  });
});

describe("costOf", () => {
  const price = {
    cacheCreate: 1.25e-6,
    cacheRead: 7.5e-8,
    input: 7.5e-7,
    output: 3.75e-6,
  };

  it("prices the three token kinds", () => {
    expect(costOf(price, { cacheRead: 8144, input: 1392, output: 133 })).toBe(
      1392 * 7.5e-7 + 133 * 3.75e-6 + 8144 * 7.5e-8,
    );
  });

  it("prices the cache creation tokens when the usage has them", () => {
    expect(
      costOf(price, {
        cacheCreate: 17366,
        cacheRead: 8144,
        input: 2,
        output: 5,
      }),
    ).toBe(2 * 7.5e-7 + 5 * 3.75e-6 + 8144 * 7.5e-8 + 17366 * 1.25e-6);
  });
});

describe("priceFor", () => {
  const listed = {
    cacheCreate: 0,
    cacheRead: 1.5e-8,
    input: 4.4e-8,
    output: 3e-7,
  };
  const resold = {
    cacheCreate: 0,
    cacheRead: 6e-9,
    input: 3e-7,
    output: 1.2e-6,
  };
  const own = { cacheCreate: 0, cacheRead: 2e-8, input: 1e-7, output: 4e-7 };
  const table = new Map([
    ["azure_ai/deepseek-v4.1-flash", resold],
    ["openrouter/deepseek/deepseek-v4.1-flash", listed],
    ["glm-5.3-flash", own],
    ["openrouter/z-ai/glm-5.3-flash", listed],
  ]);

  it("prefers the bare LiteLLM name", () => {
    expect(priceFor(table, "glm-5.3-flash")).toBe(own);
  });

  it("falls back to the OpenRouter listing of a model LiteLLM only keys by reseller", () => {
    expect(priceFor(table, "deepseek-v4.1-flash")).toBe(listed);
  });

  it("finds nothing for a model no listing names", () => {
    expect(priceFor(table, "swe-2-max")).toBeUndefined();
    expect(priceFor(table, "deepseek")).toBeUndefined();
  });
});

describe("loadPrices", () => {
  it("fetches LiteLLM and writes the cache when there is none", async () => {
    const calls: string[] = [];

    const table = await loadPrices(
      fetcherReturning(200, sample, calls),
      pricesFile,
      new Date("2026-09-13T12:00:00.000Z"),
    );

    expect(calls).toEqual([litellmPricesUrl]);
    expect(table.get("gemini-3.8-flash")?.input).toBe(7.5e-7);
    expect(await readFile(pricesFile, "utf8")).toBe(sample);
  });

  it("reads a cache younger than a day without fetching", async () => {
    const calls: string[] = [];
    const now = new Date("2026-09-13T12:00:00.000Z");
    await writeCache(sample, new Date(now.getTime() - 23 * 60 * 60 * 1000));

    const table = await loadPrices(
      fetcherReturning(200, "{}", calls),
      pricesFile,
      now,
    );

    expect(calls).toEqual([]);
    expect(table.size).toBe(2);
  });

  it("refreshes a cache older than a day", async () => {
    const calls: string[] = [];
    const now = new Date("2026-09-13T12:00:00.000Z");
    await writeCache("{}", new Date(now.getTime() - 25 * 60 * 60 * 1000));

    const table = await loadPrices(
      fetcherReturning(200, sample, calls),
      pricesFile,
      now,
    );

    expect(calls).toEqual([litellmPricesUrl]);
    expect(table.size).toBe(2);
    expect(await readFile(pricesFile, "utf8")).toBe(sample);
  });

  it("refetches a fresh cache that holds no prices", async () => {
    const calls: string[] = [];
    const now = new Date("2026-09-13T12:00:00.000Z");
    await writeCache("{}", new Date(now.getTime() - 60 * 1000));

    const table = await loadPrices(
      fetcherReturning(200, sample, calls),
      pricesFile,
      now,
    );

    expect(calls).toEqual([litellmPricesUrl]);
    expect(table.size).toBe(2);
    expect(await readFile(pricesFile, "utf8")).toBe(sample);
  });

  it("keeps the stale cache when the fetch fails", async () => {
    const now = new Date("2026-09-13T12:00:00.000Z");
    await writeCache(sample, new Date(now.getTime() - 25 * 60 * 60 * 1000));

    const table = await loadPrices(failingFetcher, pricesFile, now);

    expect(table.size).toBe(2);
    expect(await readFile(pricesFile, "utf8")).toBe(sample);
  });

  it("keeps the stale cache when LiteLLM answers an error", async () => {
    const now = new Date("2026-09-13T12:00:00.000Z");
    await writeCache(sample, new Date(now.getTime() - 25 * 60 * 60 * 1000));

    const table = await loadPrices(
      fetcherReturning(503, "unavailable", []),
      pricesFile,
      now,
    );

    expect(table.size).toBe(2);
  });

  it("refetches when the cache is not a price table", async () => {
    const calls: string[] = [];
    const now = new Date("2026-09-13T12:00:00.000Z");
    await writeCache("{", new Date(now.getTime() - 60 * 1000));

    const table = await loadPrices(
      fetcherReturning(200, sample, calls),
      pricesFile,
      now,
    );

    expect(calls).toEqual([litellmPricesUrl]);
    expect(table.size).toBe(2);
    expect(await readFile(pricesFile, "utf8")).toBe(sample);
    expect(await readdir(join(dir, "aiusage"))).toEqual([
      "litellm-prices.json",
    ]);
  });

  it("gives up on a price fetch that never answers", async () => {
    const neverAnswers: Fetcher = async (_url, init) => {
      const signal = init.signal;
      if (signal === undefined || signal === null) {
        throw new Error("the price fetch carries no signal");
      }
      await new Promise<void>((resolve) => {
        signal.addEventListener("abort", () => resolve());
      });
      signal.throwIfAborted();
      throw new Error("the price fetch was not aborted");
    };

    await expect(
      loadPrices(neverAnswers, pricesFile, new Date(), 50),
    ).rejects.toThrow(/abort|timeout/i);
  });

  it("keeps the stale cache when LiteLLM answers an empty table", async () => {
    const now = new Date("2026-09-13T12:00:00.000Z");
    await writeCache(sample, new Date(now.getTime() - 25 * 60 * 60 * 1000));

    const table = await loadPrices(
      fetcherReturning(200, "{}", []),
      pricesFile,
      now,
    );

    expect(table.size).toBe(2);
    expect(await readFile(pricesFile, "utf8")).toBe(sample);
  });

  it("fails without a cache when the fetch fails", async () => {
    await expect(
      loadPrices(failingFetcher, pricesFile, new Date()),
    ).rejects.toThrow("could not load model prices: offline");
    await expect(readFile(pricesFile, "utf8")).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("fails without a cache when the body is not a price table", async () => {
    await expect(
      loadPrices(fetcherReturning(200, "[]", []), pricesFile, new Date()),
    ).rejects.toThrow("could not load model prices");
  });
});

async function writeCache(source: string, modifiedAt: Date): Promise<void> {
  await mkdir(join(dir, "aiusage"), { recursive: true });
  await writeFile(pricesFile, source);
  await utimes(pricesFile, modifiedAt, modifiedAt);
}
