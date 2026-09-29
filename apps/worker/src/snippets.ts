export function collectorCommands(origin: string, key: string): string[] {
  return [
    "bun add -g tokenmax-collector",
    `tokenmax install --url ${origin} --key ${key}`,
  ];
}

export function widgetSnippet(origin: string, login: string): string {
  return [
    `<script src="${origin}/widget/v1.js" defer></script>`,
    `<tokenmax-island login="${login}"></tokenmax-island>`,
  ].join("\n");
}
