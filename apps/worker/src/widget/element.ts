import { apiOrigin, type LoadedSummaries, loadSummaries } from "./api";
import { copyFor, resolveLocale, type WidgetLocale } from "./i18n";
import { islandSheet } from "./styles";
import { type UsageRange, widgetRanges } from "./summary";
import { createView, type IslandView } from "./view";

const rangeKey = "tokenmax-island-range";
const preferredRanges = [
  "week",
  "day",
  "month",
] as const satisfies readonly UsageRange[];
const scrollThreshold = 4;

function storedRange(): UsageRange | null {
  try {
    const stored = localStorage.getItem(rangeKey);
    return widgetRanges.find((range) => range === stored) ?? null;
  } catch {
    return null;
  }
}

function rememberRange(range: UsageRange): void {
  try {
    localStorage.setItem(rangeKey, range);
  } catch {
    // Private mode and sandboxed frames deny storage; the range still holds for this page view.
  }
}

function initialRange(summaries: LoadedSummaries): UsageRange {
  const stored = storedRange();
  if (stored !== null && summaries[stored] !== undefined) return stored;
  return (
    preferredRanges.find((range) => summaries[range] !== undefined) ?? "week"
  );
}

export class TokenmaxIslandElement extends HTMLElement {
  #view: IslandView | undefined;
  #open = false;
  #lastScrollY = 0;

  connectedCallback(): void {
    if (this.#view !== undefined) {
      this.#listen();
      return;
    }
    const login = this.getAttribute("login")?.trim();
    if (login === undefined || login === "") return;
    const locale = resolveLocale(
      this.getAttribute("lang"),
      this.closest("[lang]")?.getAttribute("lang") ?? null,
      navigator.language,
    );
    void this.#start(login, locale);
  }

  disconnectedCallback(): void {
    document.removeEventListener("click", this.#onClick);
    document.removeEventListener("keydown", this.#onKeyDown);
    window.removeEventListener("scroll", this.#onScroll);
  }

  async #start(login: string, locale: WidgetLocale): Promise<void> {
    const summaries = await loadSummaries(apiOrigin, login);
    const history = summaries.month ?? summaries.week ?? summaries.day;
    if (this.#view !== undefined || history === undefined) return;

    const copy = copyFor(locale);
    const selected = initialRange(summaries);
    const view = createView({
      copy,
      locale,
      origin: apiOrigin,
      summaries,
      history,
      selected,
    });
    const shadow = this.attachShadow({ mode: "open" });
    shadow.adoptedStyleSheets = [islandSheet()];
    shadow.append(view.root);

    this.#view = view;
    this.#lastScrollY = window.scrollY;
    this.setAttribute("role", "region");
    this.setAttribute("aria-label", copy.title);
    this.#listen();
  }

  #listen(): void {
    document.addEventListener("click", this.#onClick);
    document.addEventListener("keydown", this.#onKeyDown);
    window.addEventListener("scroll", this.#onScroll, { passive: true });
  }

  #setOpen(open: boolean): void {
    this.#open = open;
    this.#view?.setOpen(open);
  }

  #onClick = (event: MouseEvent): void => {
    const view = this.#view;
    if (view === undefined) return;
    const path = event.composedPath();
    if (!path.includes(view.island)) {
      this.#setOpen(false);
      return;
    }
    if (path.includes(view.toggle)) {
      this.#setOpen(!this.#open);
      return;
    }
    for (const [range, button] of view.buttons) {
      if (!button.disabled && path.includes(button)) {
        rememberRange(range);
        view.select(range);
        return;
      }
    }
  };

  #onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Escape") this.#setOpen(false);
  };

  #onScroll = (): void => {
    const scrollY = window.scrollY;
    const atTop = scrollY <= 0;
    if (!atTop && Math.abs(scrollY - this.#lastScrollY) < scrollThreshold)
      return;
    const hidden = !atTop && scrollY < this.#lastScrollY;
    this.#lastScrollY = scrollY;
    this.#view?.root.toggleAttribute("data-hidden", hidden);
    if (hidden) this.#setOpen(false);
  };
}
