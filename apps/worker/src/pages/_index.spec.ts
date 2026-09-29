import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { beforeAll, describe, expect, it } from "vitest";
import IndexPage from "./index.astro";

let container: AstroContainer;

beforeAll(async () => {
  container = await AstroContainer.create();
});

async function render(origin: string): Promise<string> {
  const response = await container.renderToResponse(IndexPage, {
    request: new Request(`${origin}/`),
  });
  return response.text();
}

describe("GET /", () => {
  it("renders the four setup steps with the request origin", async () => {
    const origin = "http://aiusage.test";
    const html = await render(origin);

    expect(html.split("<li>")).toHaveLength(5);
    expect(html).toContain('<a href="/auth/github">Sign in with GitHub</a>');
    expect(html).toContain("<h2>Copy the key</h2>");
    expect(html).toContain("<h2>Install the collector</h2>");
    expect(html).toContain("<h2>Embed the widget</h2>");
    expect(html).toContain("bun add -g aiusage-collector");
    expect(html).toContain(
      `aiusage install --url ${origin} --key &lt;key&gt;</code>`,
    );
    expect(html).toContain(
      `&lt;script src=&quot;${origin}/widget/v1.js&quot; defer&gt;&lt;/script&gt;`,
    );
    expect(html).toContain(
      "&lt;aiusage-island login=&quot;&lt;login&gt;&quot;&gt;&lt;/aiusage-island&gt;",
    );
    expect(html).toContain(
      `${origin}</code> in <code>script-src</code> and <code>connect-src</code>`,
    );
    expect(html).toContain("revokes every existing key");
    expect(html).toContain('href="/privacy"');
  });

  it("takes the origin from the request instead of a fixed host", async () => {
    const html = await render("https://tokens.example");

    expect(html).toContain(
      "aiusage install --url https://tokens.example --key &lt;key&gt;",
    );
    expect(html).toContain(
      "&lt;script src=&quot;https://tokens.example/widget/v1.js&quot;",
    );
    expect(html).not.toContain("aiusage.test");
  });

  it("loads the widget for cgaravitoq as the live demo", async () => {
    const html = await render("http://aiusage.test");

    expect(html).toContain(
      '<script src="http://aiusage.test/widget/v1.js" defer></script>',
    );
    expect(html).toContain(
      '<aiusage-island login="cgaravitoq"></aiusage-island>',
    );
  });
});
