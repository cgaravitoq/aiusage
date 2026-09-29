import type { LoadedSummaries } from "./api";
import { compactTokens, dotLevels, usdCost } from "./format";
import type { WidgetCopy, WidgetLocale } from "./i18n";
import { type UsageRange, type UsageSummary, widgetRanges } from "./summary";

export interface ViewOptions {
  copy: WidgetCopy;
  locale: WidgetLocale;
  origin: string;
  summaries: LoadedSummaries;
  history: UsageSummary;
  selected: UsageRange;
}

export interface IslandView {
  root: HTMLElement;
  island: HTMLElement;
  toggle: HTMLButtonElement;
  buttons: Map<UsageRange, HTMLButtonElement>;
  setOpen(open: boolean): void;
  select(range: UsageRange): void;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className !== undefined) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function shoulder(side: "left" | "right"): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 11 11");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("shoulder", `shoulder-${side}`);
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute(
    "d",
    side === "left"
      ? "M0 0H11V11H10A10 10 0 0 0 0 1Z"
      : "M11 0H0V11H1A10 10 0 0 1 11 1Z",
  );
  svg.append(path);
  return svg;
}

export function createView(options: ViewOptions): IslandView {
  const { copy, locale, origin, summaries, history, selected } = options;
  const tokens = compactTokens(locale);
  const cost = usdCost(locale);

  const island = el("div", "island");
  island.append(shoulder("left"), shoulder("right"));

  const toggle = el("button", "toggle");
  toggle.type = "button";
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-label", copy.expand);

  const dots = el("span", "dots");
  dots.setAttribute("aria-hidden", "true");
  for (const level of dotLevels(history)) {
    const dot = el("span", "dot");
    dot.dataset.level = String(level);
    dots.append(dot);
  }

  const readout = el("span", "readout");
  readout.append(dots);
  const totals = new Map<UsageRange, HTMLElement>();
  for (const range of widgetRanges) {
    const summary = summaries[range];
    if (summary === undefined) continue;
    const total = el("span", "total", tokens.format(summary.totals.tokens));
    total.hidden = range !== selected;
    totals.set(range, total);
    readout.append(total);
  }

  const header = el("div", "header");
  header.append(toggle, el("span", "lead"), readout, el("span", "tail"));

  const switchRow = el("div", "switch");
  const buttons = new Map<UsageRange, HTMLButtonElement>();
  const lists = new Map<UsageRange, HTMLUListElement>();
  for (const range of widgetRanges) {
    const summary = summaries[range];
    const button = el("button", undefined, copy.ranges[range]);
    button.type = "button";
    button.dataset.range = range;
    button.setAttribute("aria-pressed", String(range === selected));
    button.setAttribute("aria-disabled", String(summary === undefined));
    button.disabled = summary === undefined;
    buttons.set(range, button);
    switchRow.append(button);

    if (summary === undefined) continue;
    const list = el("ul", "providers");
    list.hidden = range !== selected;
    for (const provider of summary.providers) {
      const usage = el("span", "usage");
      usage.append(
        el("span", "amount", tokens.format(provider.tokens)),
        ` ${cost.format(provider.cost_usd)}`,
      );
      const item = el("li");
      item.append(el("span", "provider", provider.provider), usage);
      list.append(item);
    }
    lists.set(range, list);
  }

  const powered = el("a", "powered", copy.poweredBy);
  powered.href = `${origin}/`;
  powered.target = "_blank";
  powered.rel = "noreferrer";
  powered.tabIndex = -1;

  const body = el("div", "body");
  body.append(switchRow, ...lists.values(), powered);
  const clip = el("div", "clip");
  clip.append(body);
  const panel = el("div", "panel");
  panel.append(clip);

  island.append(header, panel);
  const root = el("div", "root");
  root.append(el("div", "strip"), island);

  return {
    root,
    island,
    toggle,
    buttons,
    setOpen(open) {
      root.toggleAttribute("data-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? copy.collapse : copy.expand);
      powered.tabIndex = open ? 0 : -1;
    },
    select(range) {
      for (const [key, total] of totals) total.hidden = key !== range;
      for (const [key, list] of lists) list.hidden = key !== range;
      for (const [key, button] of buttons) {
        button.setAttribute("aria-pressed", String(key === range));
      }
    },
  };
}
