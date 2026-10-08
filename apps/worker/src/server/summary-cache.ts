import type { UsageRange, UsageSummary } from "@/server/usage";
import { summarizeUsage } from "@/server/usage";

const cachedForSeconds = 300;

// A Worker on a Custom Domain runs in front of the edge cache, so the route's
// s-maxage alone caches nothing: each colo keeps a summary in the Cache API for
// the five minutes the route advertises instead of reading D1 in WEUR again.
export async function cachedSummary(
  db: D1Database,
  origin: string,
  login: string,
  range: UsageRange,
  now: Date,
): Promise<UsageSummary | null> {
  const key = `${origin}/api/u/${encodeURIComponent(login.toLowerCase())}/summary?range=${range}`;
  const cache = await caches.open("summaries");
  const hit = await cache.match(key);
  if (hit) {
    return hit.json<UsageSummary>();
  }
  const summary = await summarizeUsage(db, login, range, now);
  if (summary !== null) {
    await cache.put(
      key,
      Response.json(summary, {
        headers: { "Cache-Control": `max-age=${cachedForSeconds}` },
      }),
    );
  }
  return summary;
}
