import type { UsageRange } from "./summary";

export type WidgetLocale = "en" | "es";

export interface WidgetCopy {
  title: string;
  ranges: Record<UsageRange, string>;
  expand: string;
  collapse: string;
  poweredBy: string;
}

const copies: Record<WidgetLocale, WidgetCopy> = {
  en: {
    title: "Token usage",
    ranges: { day: "Day", week: "Week", month: "Month" },
    expand: "Show token usage details",
    collapse: "Hide token usage details",
    poweredBy: "powered by aiusage",
  },
  es: {
    title: "Uso de tokens",
    ranges: { day: "Día", week: "Semana", month: "Mes" },
    expand: "Mostrar detalles del uso de tokens",
    collapse: "Ocultar detalles del uso de tokens",
    poweredBy: "con tecnología de aiusage",
  },
};

export function copyFor(locale: WidgetLocale): WidgetCopy {
  return copies[locale];
}

export function resolveLocale(
  attribute: string | null,
  page: string | null,
  browser: string | null,
): WidgetLocale {
  const tag = attribute ?? page ?? browser ?? "";
  return tag.toLowerCase().startsWith("es") ? "es" : "en";
}
