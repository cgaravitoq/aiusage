import { describe, expect, it } from "vitest";
import { copyFor, resolveLocale } from "./i18n";

describe("resolveLocale", () => {
  it("prefers the lang attribute over the page and the browser", () => {
    expect(resolveLocale("es", "en", "en-US")).toBe("es");
    expect(resolveLocale("en", "es", "es-ES")).toBe("en");
  });

  it("falls back to the closest lang attribute of the page", () => {
    expect(resolveLocale(null, "es-419", "en-US")).toBe("es");
  });

  it("falls back to the browser language", () => {
    expect(resolveLocale(null, null, "es-MX")).toBe("es");
    expect(resolveLocale(null, null, null)).toBe("en");
  });

  it("reads any Spanish tag as Spanish and everything else as English", () => {
    for (const tag of ["es", "es-ES", "ES", "es-419"]) {
      expect(resolveLocale(tag, null, null)).toBe("es");
    }
    for (const tag of ["en", "en-US", "fr", "eu", ""]) {
      expect(resolveLocale(tag, null, null)).toBe("en");
    }
  });
});

describe("copyFor", () => {
  it("labels both locales", () => {
    expect(copyFor("en")).toEqual({
      title: "Token usage",
      ranges: { day: "Day", week: "Week", month: "Month" },
      expand: "Show token usage details",
      collapse: "Hide token usage details",
      poweredBy: "powered by tokenmax",
    });
    expect(copyFor("es")).toEqual({
      title: "Uso de tokens",
      ranges: { day: "Día", week: "Semana", month: "Mes" },
      expand: "Mostrar detalles del uso de tokens",
      collapse: "Ocultar detalles del uso de tokens",
      poweredBy: "con tecnología de tokenmax",
    });
  });
});
