import { describe, expect, it } from "vitest";
import {
  agentOpenInTargets,
  agentPrompt,
  collectorCommands,
  widgetSnippet,
} from "./snippets";

const origin = "http://aiusage.test";
const key = `tmx_${"ab".repeat(32)}`;

describe("agentPrompt", () => {
  it("carries the page commands and the widget snippet for the origin", () => {
    const prompt = agentPrompt(origin, { key: "<KEY>", login: "<LOGIN>" });

    for (const command of collectorCommands(origin, "<KEY>")) {
      expect(prompt).toContain(command);
    }
    expect(prompt).toContain(widgetSnippet(origin, "<LOGIN>"));
    expect(prompt).toContain("Bun is 1.4.0 or newer");
    expect(prompt).toContain("aiusage collect");
    expect(prompt).toContain("accepted");
  });

  it("asks for the credentials instead of guessing them", () => {
    const prompt = agentPrompt(origin, { key: "<KEY>", login: "<LOGIN>" });

    expect(prompt).toContain("Ask me for my aiusage API key");
    expect(prompt).toContain("Ask me for my GitHub login");
    expect(prompt).toContain("Never guess the key.");
  });

  it("uses the real key and login once the page has them", () => {
    const prompt = agentPrompt(origin, { key, login: "octocat" });

    expect(prompt).toContain(`aiusage install --url ${origin} --key ${key}`);
    expect(prompt).toContain(`<aiusage-island login="octocat">`);
  });
});

describe("agentOpenInTargets", () => {
  it("encodes the prompt into every provider URL", () => {
    const prompt = agentPrompt(origin, { key: "<KEY>", login: "<LOGIN>" });
    const query = encodeURIComponent(prompt);
    const targets = agentOpenInTargets(prompt);

    expect(targets.map((target) => target.name)).toEqual([
      "ChatGPT",
      "Claude",
      "Grok",
      "Perplexity",
    ]);
    for (const target of targets) {
      expect(target.href).toContain(query);
    }
    expect(targets[0]?.href).toBe(`https://chatgpt.com/?q=${query}`);
    expect(targets[3]?.href).toBe(
      `https://www.perplexity.ai/search?q=${query}`,
    );
  });
});
