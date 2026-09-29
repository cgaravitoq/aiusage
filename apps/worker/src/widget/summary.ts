export const widgetRanges = ["day", "week", "month"] as const;

export type UsageRange = (typeof widgetRanges)[number];

/** The subset of the summary payload the island reads, which is also what
 * `isSummary` guards, so a shape change on the Worker fails closed here. */
export interface UsageSummary {
  to: string;
  totals: { tokens: number };
  providers: { provider: string; tokens: number; cost_usd: number }[];
  days: { date: string; tokens: number }[];
}

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

export function isSummary(value: unknown): value is UsageSummary {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<UsageSummary>;
  return (
    typeof candidate.to === "string" &&
    isoDate.test(candidate.to) &&
    typeof candidate.totals?.tokens === "number" &&
    Array.isArray(candidate.providers) &&
    Array.isArray(candidate.days)
  );
}
