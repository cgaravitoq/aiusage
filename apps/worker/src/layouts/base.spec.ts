import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const layout = readFileSync(
  fileURLToPath(new URL("./base.astro", import.meta.url)),
  "utf8",
);

function declarations(selector: string): Record<string, string> {
  const rule = new RegExp(`\\n\\s*${selector} \\{([^}]*)\\}`).exec(layout);
  if (!rule?.[1]) {
    throw new Error(`no ${selector} rule in base.astro`);
  }
  return Object.fromEntries(
    rule[1]
      .split(";")
      .map((declaration) => declaration.split(":").map((part) => part.trim()))
      .filter(([property]) => property),
  );
}

describe("base layout styles", () => {
  it("keeps each code block line whole and scrolls it inside the block", () => {
    const pre = declarations("pre");

    expect(pre["white-space"]).toBe("pre");
    expect(pre["overflow-x"]).toBe("auto");
    expect(pre).not.toHaveProperty("overflow-wrap");
  });
});
