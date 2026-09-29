export function collectorCommands(origin: string, key: string): string[] {
  return [
    "bun add -g aiusage-collector",
    `aiusage install --url ${origin} --key ${key}`,
  ];
}

export function widgetSnippet(origin: string, login: string): string {
  return [
    `<script src="${origin}/widget/v1.js" defer></script>`,
    `<aiusage-island login="${login}"></aiusage-island>`,
  ].join("\n");
}
