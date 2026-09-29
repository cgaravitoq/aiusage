export const styles = `
:host { all: initial; --ease-island: cubic-bezier(0.32, 0.72, 0, 1); --ease-default: cubic-bezier(0.4, 0, 0.2, 1); }
*, *::before, *::after { box-sizing: border-box; }
[hidden] { display: none !important; }
button { margin: 0; padding: 0; border: 0; background: none; color: inherit; font: inherit; letter-spacing: inherit; }
ul { margin: 0; padding: 0; list-style: none; }
svg { display: block; }

.root {
  position: fixed; inset: 0 0 auto; z-index: 50; display: flex; justify-content: center;
  pointer-events: none; color: #fff; text-align: left; font-size: 14px; line-height: 20px;
  font-family: "Instagram Sans", system-ui, -apple-system, "Segoe UI", sans-serif;
  transition: transform 300ms cubic-bezier(0, 0, 0.2, 1);
}
.root[data-hidden] { transform: translateY(calc(-100% - 2rem)); }

.strip { position: absolute; top: 0; left: 0; right: 0; height: 8px; background-color: #000; }

.island {
  pointer-events: auto; position: relative; width: 144px; background-color: #000;
  border-radius: 0 0 16px 16px; box-shadow: 0 14px 20px -14px rgb(0 0 0 / 0.6);
  transition: width 500ms var(--ease-island), border-radius 500ms var(--ease-island);
}
.root:not([data-open]) .island:hover { width: 160px; }
.root[data-open] .island { width: 288px; border-radius: 0 0 28px 28px; }

.shoulder { position: absolute; top: 7px; width: 11px; height: 11px; fill: #000; }
.shoulder-left { left: -10px; }
.shoulder-right { right: -10px; }

.header {
  position: relative; display: flex; align-items: center; height: 44px; padding-top: 8px;
  transition: padding 500ms var(--ease-island);
}
.root[data-open] .header { padding-right: 16px; padding-left: 16px; }

.toggle { position: absolute; inset: 0; cursor: pointer; }
.lead { flex-grow: 1; transition: flex-grow 500ms var(--ease-island); }
.root[data-open] .lead { flex-grow: 0; }
.tail { flex-grow: 1; }

.readout { pointer-events: none; display: flex; align-items: center; gap: 10px; }
.dots { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 2px; }
.dot { width: 5px; height: 5px; border-radius: 9999px; background-color: rgb(255 255 255 / 0.15); }
.dot[data-level="1"] { background-color: rgb(255 255 255 / 0.35); }
.dot[data-level="2"] { background-color: rgb(255 255 255 / 0.55); }
.dot[data-level="3"] { background-color: rgb(255 255 255 / 0.8); }
.dot[data-level="4"] { background-color: rgb(255 255 255 / 1); }
.total { font-weight: 700; font-size: 14px; line-height: 20px; font-variant-numeric: tabular-nums; }

.panel { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 500ms var(--ease-island); }
.root[data-open] .panel { grid-template-rows: 1fr; }
.clip { overflow: hidden; }
.body {
  position: relative; left: 50%; width: 288px; transform: translateX(-50%); opacity: 0;
  padding: 0 16px 8px; font-size: 12px; line-height: 16px;
  transition: opacity 300ms var(--ease-default);
}
.root[data-open] .body { opacity: 1; transition-delay: 150ms; }

.switch { display: flex; padding: 2px; border-radius: 9999px; background-color: rgb(255 255 255 / 0.1); }
.switch button {
  flex: 1 1 0%; padding: 2px 0; border-radius: 9999px; color: rgb(255 255 255 / 0.6); cursor: pointer;
  transition: color 150ms var(--ease-default), background-color 150ms var(--ease-default);
}
.switch button:hover { color: #fff; }
.switch button:disabled { opacity: 0.4; }
.switch button[aria-pressed="true"] { background-color: #fff; color: #000; }

.providers { display: flex; flex-direction: column; margin-top: 8px; }
.providers li { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding: 6px 0; }
.providers li + li { border-top: 1px solid rgb(255 255 255 / 0.1); }
.provider { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-transform: capitalize; }
.usage { flex-shrink: 0; color: rgb(255 255 255 / 0.5); font-variant-numeric: tabular-nums; }
.amount { color: #fff; }

.powered {
  display: block; margin-top: 8px; color: rgb(255 255 255 / 0.6); text-align: right;
  text-decoration: none; transition: color 150ms var(--ease-default);
}
.powered:hover { color: #fff; }

@media print { .root { display: none; } }
`;

let sheet: CSSStyleSheet | undefined;

export function islandSheet(): CSSStyleSheet {
  sheet ??= new CSSStyleSheet();
  sheet.replaceSync(styles);
  return sheet;
}
