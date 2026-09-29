// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AiusageIslandElement } from "./element";
import "./index";
import {
  fixture,
  query,
  stubStorage,
  stubSummaries,
  summaries,
} from "./test/fixture";

const tag = "aiusage-island";
const login = "cgaravitoq";
const origin = location.origin;

let stored: Map<string, string>;

beforeEach(() => {
  stored = stubStorage();
  stubSummaries({ origin, login, available: summaries() });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.documentElement.removeAttribute("lang");
  document.body.replaceChildren();
});

function mount(attributes: Record<string, string> = {}): AiusageIslandElement {
  const island = document.createElement(tag) as AiusageIslandElement;
  island.setAttribute("login", login);
  for (const [name, value] of Object.entries(attributes)) {
    island.setAttribute(name, value);
  }
  document.body.append(island);
  return island;
}

async function rendered(
  attributes: Record<string, string> = {},
): Promise<{ island: AiusageIslandElement; root: HTMLElement }> {
  const island = mount(attributes);
  await vi.waitFor(() => expect(island.shadowRoot).not.toBeNull());
  const shadow = island.shadowRoot;
  if (shadow === null) throw new Error("the island did not render");
  return { island, root: query<HTMLElement>(shadow, ".root") };
}

function click(target: EventTarget): void {
  target.dispatchEvent(
    new MouseEvent("click", { bubbles: true, composed: true }),
  );
}

function labels(root: ParentNode): (string | null)[] {
  return [...root.querySelectorAll(".switch button")].map(
    (button) => button.textContent,
  );
}

describe("aiusage-island", () => {
  it("renders the production summaries with the week range by default", async () => {
    const { island, root } = await rendered();

    expect(island.getAttribute("role")).toBe("region");
    expect(island.getAttribute("aria-label")).toBe("Token usage");
    expect(root.hasAttribute("data-open")).toBe(false);
    expect(query(root, ".strip")).toBeInstanceOf(HTMLElement);
    expect(root.querySelectorAll(".shoulder")).toHaveLength(2);

    expect(labels(root)).toEqual(["Day", "Week", "Month"]);
    expect(root.querySelectorAll(".total:not([hidden])")).toHaveLength(1);
    expect(query(root, ".total:not([hidden])").textContent).toBe("16.3B");
    expect(query(root, '.switch button[aria-pressed="true"]').textContent).toBe(
      "Week",
    );

    const rows = [...root.querySelectorAll(".providers:not([hidden]) li")];
    expect(rows.map((row) => query(row, ".provider").textContent)).toEqual([
      "claude",
      "pi",
      "codex",
      "devin",
      "antigravity",
      "grok",
    ]);
    expect(query(rows[0], ".usage").textContent).toBe("9.4B $3,882");

    expect(
      [...root.querySelectorAll<HTMLElement>(".dot")].map(
        (dot) => dot.dataset.level,
      ),
    ).toEqual(["2", "4", "3", "4", "2", "2", "3", "2"]);

    const powered = query<HTMLAnchorElement>(root, ".powered");
    expect(powered.textContent).toBe("powered by aiusage");
    expect(powered.href).toBe(`${origin}/`);
    expect(powered.target).toBe("_blank");
    expect(powered.rel).toBe("noreferrer");
    expect(powered.tabIndex).toBe(-1);
    expect(root.querySelector(".lucide")).toBeNull();
  });

  it("renders nothing when every range fails", async () => {
    const requested = stubSummaries({ origin, login, available: {} });
    const island = mount();

    await vi.waitFor(() => expect(requested).toHaveLength(3));

    expect(island.shadowRoot).toBeNull();
    expect(island.getAttribute("role")).toBeNull();
  });

  it("keeps the ranges that answer when one fails", async () => {
    stubSummaries({
      origin,
      login,
      available: { week: fixture("week"), month: fixture("month") },
    });

    const { root } = await rendered();
    const buttons = [
      ...root.querySelectorAll<HTMLButtonElement>(".switch button"),
    ];

    expect(buttons.map((button) => button.disabled)).toEqual([
      true,
      false,
      false,
    ]);
    expect(
      buttons.map((button) => button.getAttribute("aria-disabled")),
    ).toEqual(["true", "false", "false"]);
    expect(root.querySelectorAll(".total")).toHaveLength(2);
    expect(query(root, ".total:not([hidden])").textContent).toBe("16.3B");
  });

  it("remembers the selected range in localStorage", async () => {
    const { root } = await rendered();

    click(query(root, '.switch button[data-range="month"]'));

    expect(stored.get("aiusage-island-range")).toBe("month");
    expect(query(root, '.switch button[aria-pressed="true"]').textContent).toBe(
      "Month",
    );
    expect(query(root, ".total:not([hidden])").textContent).toBe("36.9B");
    expect(
      query(root, ".providers:not([hidden])").querySelectorAll("li"),
    ).toHaveLength(7);

    const second = await rendered();
    expect(
      query(second.root, '.switch button[aria-pressed="true"]').textContent,
    ).toBe("Month");
  });

  it("ignores a stored range the API cannot serve", async () => {
    stored.set("aiusage-island-range", "day");
    stubSummaries({
      origin,
      login,
      available: { week: fixture("week"), month: fixture("month") },
    });

    const { root } = await rendered();

    expect(query(root, '.switch button[aria-pressed="true"]').textContent).toBe(
      "Week",
    );
  });

  it("renders and switches ranges when storage is denied", async () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
    });

    const { root } = await rendered();

    expect(query(root, '.switch button[aria-pressed="true"]').textContent).toBe(
      "Week",
    );
    click(query(root, '.switch button[data-range="month"]'));
    expect(query(root, '.switch button[aria-pressed="true"]').textContent).toBe(
      "Month",
    );
  });

  it("labels the island in Spanish from the lang attribute", async () => {
    const { island, root } = await rendered({ lang: "es-ES" });

    expect(island.getAttribute("aria-label")).toBe("Uso de tokens");
    expect(labels(root)).toEqual(["Día", "Semana", "Mes"]);
    expect(query(root, ".total:not([hidden])").textContent).toBe("16.3B");
    expect(query(root, ".usage").textContent).toContain("US$");
    expect(query(root, ".powered").textContent).toBe(
      "con tecnología de aiusage",
    );
    expect(query(root, ".toggle").getAttribute("aria-label")).toBe(
      "Mostrar detalles del uso de tokens",
    );
  });

  it("takes the language from the closest lang on the page", async () => {
    document.documentElement.lang = "es";

    const { root } = await rendered();

    expect(labels(root)).toEqual(["Día", "Semana", "Mes"]);
  });

  it("falls back to the browser language", async () => {
    vi.spyOn(navigator, "language", "get").mockReturnValue("es-MX");

    const { root } = await rendered();

    expect(labels(root)).toEqual(["Día", "Semana", "Mes"]);
  });

  it("opens with aria and focus order following the state", async () => {
    const { root } = await rendered();
    const toggle = query<HTMLButtonElement>(root, ".toggle");
    const powered = query<HTMLAnchorElement>(root, ".powered");

    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(toggle.getAttribute("aria-label")).toBe("Show token usage details");
    expect(powered.tabIndex).toBe(-1);

    click(toggle);

    expect(root.hasAttribute("data-open")).toBe(true);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(toggle.getAttribute("aria-label")).toBe("Hide token usage details");
    expect(powered.tabIndex).toBe(0);
  });

  it("closes on Escape and on a click outside the island", async () => {
    const { root } = await rendered();
    const toggle = query<HTMLButtonElement>(root, ".toggle");

    click(toggle);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(root.hasAttribute("data-open")).toBe(false);

    click(toggle);
    click(query(root, ".island"));
    expect(root.hasAttribute("data-open")).toBe(true);

    click(document.body);
    expect(root.hasAttribute("data-open")).toBe(false);
  });

  it("hides and closes while the reader scrolls up", async () => {
    const { root } = await rendered();
    click(query(root, ".toggle"));
    expect(root.hasAttribute("data-open")).toBe(true);

    document.documentElement.scrollTop = 400;
    window.dispatchEvent(new Event("scroll"));
    expect(root.hasAttribute("data-hidden")).toBe(false);

    document.documentElement.scrollTop = 200;
    window.dispatchEvent(new Event("scroll"));
    expect(root.hasAttribute("data-hidden")).toBe(true);
    expect(root.hasAttribute("data-open")).toBe(false);

    document.documentElement.scrollTop = 0;
    window.dispatchEvent(new Event("scroll"));
    expect(root.hasAttribute("data-hidden")).toBe(false);
  });
});
