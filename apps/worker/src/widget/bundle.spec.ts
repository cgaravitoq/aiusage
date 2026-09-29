import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";

const worker = fileURLToPath(new URL("../..", import.meta.url));

/** Measured at 10108 bytes when the island shipped; the ceiling is that size
 * rounded up to the next kilobyte, so any growth beyond it fails here. */
const ceiling = 11 * 1024;

const packageJson: unknown = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
);

function buildScript(): string {
  const scripts = (packageJson as { scripts: Record<string, string> }).scripts;
  return scripts["widget:build"] ?? "";
}

function outfile(script: string): string {
  const found = /--outfile[= ](\S+)/.exec(script);
  if (found === null) throw new Error(`no outfile in ${script}`);
  return found[1];
}

let bundle: string;

beforeAll(() => {
  execFileSync("bun", ["run", "widget:build"], { cwd: worker, stdio: "pipe" });
  bundle = readFileSync(
    new URL(`../../${outfile(buildScript())}`, import.meta.url),
    "utf8",
  );
});

describe("the built widget", () => {
  it("stays under the size ceiling", () => {
    expect(new TextEncoder().encode(bundle).length).toBeLessThan(ceiling);
  });

  it("is a classic script, not a module", () => {
    expect(() => new Function(bundle)).not.toThrow();
  });

  it("defines the custom element", () => {
    expect(bundle).toContain("aiusage-island");
    expect(bundle).toContain("customElements.define");
  });

  it("is served with the cache header its path declares", () => {
    const served = `/${outfile(buildScript()).replace(/^public\//, "")}`;
    const headers = readFileSync(
      new URL("../../public/_headers", import.meta.url),
      "utf8",
    );

    expect(served).toBe("/widget/v1.js");
    expect(headers).toContain(served);
    expect(headers).toContain("Cache-Control: public, max-age=3600");
  });
});
