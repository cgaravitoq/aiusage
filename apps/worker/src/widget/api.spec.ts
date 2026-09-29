// @vitest-environment happy-dom
// @vitest-environment-options {"settings":{"disableJavaScriptFileLoading":true,"handleDisabledFileLoadingAsSuccess":true}}
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadSummaries } from "./api";
import { fixture, stubSummaries, summaries } from "./test/fixture";

const origin = "https://tokenmax.example";
const login = "cgaravitoq";

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  for (const script of document.querySelectorAll("script")) script.remove();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("apiOrigin", () => {
  it("is the origin of the script that loaded the widget", async () => {
    const script = document.createElement("script");
    script.src = "https://tokenmax.example/widget/v1.js";
    vi.spyOn(document, "currentScript", "get").mockReturnValue(script);

    const { apiOrigin } = await import("./api");

    expect(apiOrigin).toBe("https://tokenmax.example");
  });

  it("finds its own script tag when the browser no longer reports currentScript", async () => {
    const script = document.createElement("script");
    script.src = "https://self-hosted.example/widget/v1.js";
    document.head.append(script);

    const { apiOrigin } = await import("./api");

    expect(apiOrigin).toBe("https://self-hosted.example");
  });

  it("falls back to the page origin", async () => {
    const { apiOrigin } = await import("./api");

    expect(apiOrigin).toBe(location.origin);
  });
});

describe("loadSummaries", () => {
  it("asks the summary route once per range", async () => {
    const requested = stubSummaries({ origin, login, available: summaries() });

    const loaded = await loadSummaries(origin, login);

    expect(requested).toEqual([
      `/api/u/${login}/summary?range=day`,
      `/api/u/${login}/summary?range=week`,
      `/api/u/${login}/summary?range=month`,
    ]);
    expect(loaded).toEqual(summaries());
  });

  it("keeps only the ranges that answered", async () => {
    stubSummaries({ origin, login, available: { week: fixture("week") } });

    const loaded = await loadSummaries(origin, login);

    expect(Object.keys(loaded)).toEqual(["week"]);
  });

  it("drops a payload that is not a summary", async () => {
    vi.stubGlobal("fetch", async () => new Response('{"ok":true}'));

    const loaded = await loadSummaries(origin, login);

    expect(loaded).toEqual({});
  });

  it("renders nothing when the network fails", async () => {
    vi.stubGlobal("fetch", () => Promise.reject(new Error("offline")));

    const loaded = await loadSummaries(origin, login);

    expect(loaded).toEqual({});
  });
});
