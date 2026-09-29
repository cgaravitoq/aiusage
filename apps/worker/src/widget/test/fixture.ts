import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { vi } from "vitest";
import type { UsageRange, UsageSummary } from "../summary";

export interface SummaryStub {
  origin: string;
  login: string;
  available: Partial<Record<UsageRange, UsageSummary>>;
}

// happy-dom replaces the global URL, which resolves relative file paths wrongly,
// so the fixtures directory is resolved with the node: modules instead.
const fixtures = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

export function fixture(range: UsageRange): UsageSummary {
  const file = join(fixtures, `summary-${range}.json`);
  return JSON.parse(readFileSync(file, "utf8")) as UsageSummary;
}

export function summaries(): Record<UsageRange, UsageSummary> {
  return {
    day: fixture("day"),
    week: fixture("week"),
    month: fixture("month"),
  };
}

export function query<T extends Element>(
  root: ParentNode,
  selector: string,
): T {
  const found = root.querySelector<T>(selector);
  if (found === null) throw new Error(`missing ${selector}`);
  return found;
}

/** Answers the summary route only for the documented URL shape, so a spec cannot
 * pass against a double that accepts a request the real Worker would reject. */
export function stubSummaries(stub: SummaryStub): string[] {
  const requested: string[] = [];
  vi.stubGlobal("fetch", async (input: string) => {
    const url = new URL(input);
    if (
      url.origin !== stub.origin ||
      url.pathname !== `/api/u/${stub.login}/summary`
    ) {
      throw new Error(`unexpected request ${input}`);
    }
    requested.push(`${url.pathname}${url.search}`);
    const range = url.searchParams.get("range");
    const summary =
      range === null ? undefined : stub.available[range as UsageRange];
    if (summary === undefined) return new Response("{}", { status: 404 });
    return new Response(JSON.stringify(summary), { status: 200 });
  });
  return requested;
}

export function stubStorage(): Map<string, string> {
  const entries = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => {
      entries.set(key, value);
    },
  });
  return entries;
}
