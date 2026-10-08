import { afterEach, describe, expect, it, vi } from "vitest";
import { cachedSummary } from "@/server/summary-cache";
import { recordUsage } from "@/server/usage";
import { stubCaches } from "@/test/memory-cache";
import { createSqliteD1, type SqliteD1TestDatabase } from "@/test/sqlite-d1";

const origin = "https://aiusage.example";
const now = new Date("2026-09-10T12:00:00.000Z");
const databases: SqliteD1TestDatabase[] = [];

async function recorded(): Promise<D1Database> {
  const sqlite = createSqliteD1();
  databases.push(sqlite);
  sqlite.exec(
    "INSERT INTO users (github_login, avatar_url) VALUES ('octocat', 'https://example.com/avatar.png')",
  );
  const db = sqlite.asD1();
  await recordUsage(
    db,
    1,
    {
      machine: "mac-1",
      timezone: "UTC",
      providers: ["anthropic"],
      days: [
        {
          date: "2026-09-10",
          provider: "anthropic",
          model: "claude-opus-5",
          input: 10,
          output: 20,
          cache_create: 5,
          cache_read: 40,
          cost_usd: 0.5,
        },
      ],
    },
    now,
  );
  return db;
}

afterEach(() => {
  vi.unstubAllGlobals();
  for (const sqlite of databases) sqlite.close();
  databases.length = 0;
});

describe("cachedSummary", () => {
  it("answers a repeated summary from the colo cache without reading D1", async () => {
    stubCaches();
    const db = await recorded();
    const prepare = vi.spyOn(db, "prepare");

    const first = await cachedSummary(db, origin, "octocat", "week", now);
    const reads = prepare.mock.calls.length;
    const second = await cachedSummary(db, origin, "octocat", "week", now);

    expect(first?.totals.tokens).toBe(75);
    expect(second).toEqual(first);
    expect(prepare).toHaveBeenCalledTimes(reads);
  });

  it("keeps each range for five minutes under the lowercased login", async () => {
    const store = stubCaches();
    const db = await recorded();

    await cachedSummary(db, origin, "Octocat", "day", now);
    await cachedSummary(db, origin, "octocat", "week", now);

    expect([...store.keys()]).toEqual([
      `${origin}/api/u/octocat/summary?range=day`,
      `${origin}/api/u/octocat/summary?range=week`,
    ]);
    expect(
      store
        .get(`${origin}/api/u/octocat/summary?range=day`)
        ?.headers.get("Cache-Control"),
    ).toBe("max-age=300");
  });

  it("never caches a login that has no account yet", async () => {
    const store = stubCaches();
    const db = await recorded();

    await expect(
      cachedSummary(db, origin, "nobody", "week", now),
    ).resolves.toBeNull();

    expect(store.size).toBe(0);
  });
});
