export function collectorCommands(origin: string, key: string): string[] {
  return [
    "bun add -g @cgaravitoq/aiusage",
    `aiusage install --url ${origin} --key ${key}`,
  ];
}

export function widgetSnippet(origin: string, login: string): string {
  return [
    `<script src="${origin}/widget/v1.js" defer></script>`,
    `<aiusage-island login="${login}"></aiusage-island>`,
  ].join("\n");
}

export interface AgentCredentials {
  key: string;
  login: string;
}

export const terminalAgents = ["Claude Code", "Codex", "Cursor", "Gemini CLI"];

export function agentPrompt(
  origin: string,
  { key, login }: AgentCredentials,
): string {
  const [install, connect] = collectorCommands(origin, key);
  return [
    "Set up aiusage on this machine.",
    "",
    "1. Check Bun is 1.4.0 or newer with `bun --version`. If it is older or missing, install it from https://bun.sh first.",
    "2. Install the collector:",
    "",
    "```sh",
    install,
    "```",
    "",
    "3. Ask me for my aiusage API key if you do not already have it, then connect this machine:",
    "",
    "```sh",
    connect,
    "```",
    "",
    "Never guess the key.",
    "4. Run the command `install` prints after `load:` to start collecting.",
    "5. Run `aiusage collect` and check the output says `accepted`.",
    "6. Add the widget to my site by putting these two lines in the layout:",
    "",
    "```html",
    ...widgetSnippet(origin, login).split("\n"),
    "```",
    "",
    `Ask me for my GitHub login if you do not know it. A strict Content-Security-Policy needs ${origin} in script-src and connect-src.`,
  ].join("\n");
}

export function agentOpenInTargets(
  prompt: string,
): { name: string; href: string }[] {
  const query = encodeURIComponent(prompt);
  return [
    { name: "ChatGPT", href: `https://chatgpt.com/?q=${query}` },
    { name: "Claude", href: `https://claude.ai/new?q=${query}` },
    { name: "Grok", href: `https://grok.com/?q=${query}` },
    { name: "Perplexity", href: `https://www.perplexity.ai/search?q=${query}` },
  ];
}
