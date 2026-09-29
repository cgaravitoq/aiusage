import type { WidgetLocale } from "./i18n";
import type { UsageSummary } from "./summary";

export const dotCount = 8;

export function compactTokens(): Intl.NumberFormat {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  });
}

export function usdCost(locale: WidgetLocale): Intl.NumberFormat {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function dotLevels(history: UsageSummary): number[] {
  const byDate = new Map(history.days.map((day) => [day.date, day.tokens]));
  const last = new Date(`${history.to}T00:00:00Z`);
  const tokens = Array.from({ length: dotCount }, (_, index) => {
    const date = new Date(last);
    date.setUTCDate(last.getUTCDate() + index - dotCount + 1);
    return byDate.get(date.toISOString().slice(0, 10)) ?? 0;
  });
  const busiest = Math.max(1, ...tokens);
  return tokens.map((value) =>
    value === 0 ? 0 : Math.ceil((value / busiest) * 4),
  );
}
