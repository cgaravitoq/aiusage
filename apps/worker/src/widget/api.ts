import {
  isSummary,
  type UsageRange,
  type UsageSummary,
  widgetRanges,
} from "./summary";

export type LoadedSummaries = Partial<Record<UsageRange, UsageSummary>>;

const widgetPath = "/widget/v1.js";

function scriptOrigin(): string {
  const script = document.currentScript;
  if (script instanceof HTMLScriptElement) return new URL(script.src).origin;
  const tagged = [...document.scripts].find((candidate) =>
    candidate.src.endsWith(widgetPath),
  );
  return tagged === undefined ? location.origin : new URL(tagged.src).origin;
}

export const apiOrigin = scriptOrigin();

async function loadSummary(
  origin: string,
  login: string,
  range: UsageRange,
): Promise<UsageSummary | null> {
  try {
    const response = await fetch(
      `${origin}/api/u/${encodeURIComponent(login)}/summary?range=${range}`,
    );
    if (!response.ok) return null;
    const body: unknown = await response.json();
    return isSummary(body) ? body : null;
  } catch {
    return null;
  }
}

export async function loadSummaries(
  origin: string,
  login: string,
): Promise<LoadedSummaries> {
  const loaded = await Promise.all(
    widgetRanges.map(
      async (range) =>
        [range, await loadSummary(origin, login, range)] as const,
    ),
  );
  const summaries: LoadedSummaries = {};
  for (const [range, summary] of loaded) {
    if (summary !== null) summaries[range] = summary;
  }
  return summaries;
}
