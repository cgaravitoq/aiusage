# aiusage

Self-hostable token-usage service: a Cloudflare Worker that stores daily per-provider and per-model counts reported by a local collector, and serves a public per-login summary.

Extracted from cgaravitoq/portfolio-monorepo at 69ebf6a on 2026-09-12.

## Worker

The worker is `apps/worker`: an Astro 7 app on the Cloudflare adapter with a Hono 4 API, a Vue 3 key page and D1 storage.

### Prerequisites

A Cloudflare account, Bun 1.4.0 and `bunx wrangler login`.

### Deploy

1. Run `git clone https://github.com/cgaravitoq/aiusage.git`, change into the checkout with `cd aiusage`, then run `bun install`.
2. From `apps/worker`, run `bunx wrangler d1 create aiusage`, then replace `d1_databases[0].database_id` in `apps/worker/wrangler.jsonc` with the returned id.
3. Create a GitHub OAuth app whose callback URL is `https://<worker>.workers.dev/auth/github/callback`.
4. Set the six secrets with `bunx wrangler secret put`: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `PRIVACY_CONTROLLER`, `PRIVACY_EMAIL`, `PRIVACY_AUTHORITY_NAME` and `PRIVACY_AUTHORITY_URL`.
5. From `apps/worker`, run `bunx wrangler d1 migrations apply DB --remote`.
6. Run `bun run build` from the root, then deploy by pushing to `main` with the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets, or with `bunx wrangler deploy` from `apps/worker`.
7. Sign in at `/auth/github` and copy the key shown once at `/keys`.
8. Install the collector with `bun add -g @cgaravitoq/aiusage`, run `aiusage install --url <url> --key <key>`, then run the command printed after `load:` to activate collection on macOS or Linux.

### Local development

Copy `apps/worker/.dev.vars.example` to `apps/worker/.dev.vars` and fill the six values, run `bunx wrangler d1 migrations apply DB --local` from `apps/worker`, create a second GitHub OAuth app whose callback is `http://localhost:8787/auth/github/callback`, then run `bun run build` from the root and `bunx wrangler dev --port 8787` from `apps/worker`.
The callback is derived from the request origin, so no other configuration is needed.

### Public API

`GET /api/u/:login/summary?range=day|week|month` (default `week`) answers `{ login, range, from, to, timezone, totals { input, output, cache_create, cache_read, tokens, cost_usd }, providers [{ provider, tokens, cost_usd, models [{ model, tokens, cost_usd }] }], days [{ date, tokens, cost_usd }] }` with `Cache-Control: public, s-maxage=300`.
`range` is a 1-, 7- or 30-day window ending today in the timezone of the most recently seen machine, and the collector reports only the last 14 calendar days on each run, so a longer window shows the rows earlier reports left in the store rather than a full 30 days of collection.
Providers and models rank by tokens descending then name, days ascend, and errors are `400 {"error":"invalid range"}` and `404 {"error":"unknown user"}`.
Every response of that route, the errors included, carries `Access-Control-Allow-Origin: *` so a page on any origin can read it from a browser, the request is a simple GET that needs no preflight, and no other route is cross-origin readable.

## Embed

`<aiusage-island>` is a dependency-free web component that renders one login's public summary as the island hanging from the top edge of the page.
The Worker serves it at `/widget/v1.js`, so an instance that hosts the widget needs nothing else.

```html
<script src="https://aiusage.cgaravito.dev/widget/v1.js" defer></script>
<aiusage-island login="jane"></aiusage-island>
```

`login` is required and `lang` is optional.
The island asks for the day, week and month ranges at once, shows the last eight days as its dot grid, and renders nothing at all when every one of those requests fails.
It resolves its language from `lang`, then from the closest `[lang]` on the page, then from `navigator.language`, and reads any `es*` tag as Spanish.
It reads the API from the origin of the script's own `src`, so a self-hosted instance reports its own summaries without configuration, and its expanded panel ends with a "powered by aiusage" link to that same origin.
The chosen range is remembered in `localStorage` under `aiusage-island-range`, Escape and a click outside the island close it, and it hides while the reader scrolls up.
It is drawn in a shadow root with the stylesheet adopted, so a page's own CSS never reaches it.

`bun run build` bundles `apps/worker/src/widget` into the gitignored `apps/worker/public/widget/v1.js`, which `apps/worker/public/_headers` serves with `Cache-Control: public, max-age=3600`.
A page therefore keeps the build it first loaded for up to an hour, and a change to the widget within `v1` reaches it after that.

## Collector

The collector requires Bun 1.4.0 or newer, which ships `node:sqlite`, and supports macOS and Linux.
Windows is unsupported.

Install it globally and create the local schedule:

```bash
bun add -g @cgaravitoq/aiusage
aiusage install --url <url> --key <key>
```

Pass `--timezone <zone>` to `install` to override the machine's IANA timezone.
Non-dry `aiusage install` refuses Bun paths containing `/install/cache/` or a `bunx-<digits>-<package>` directory segment because those paths can disappear while a schedule still points to them.
Run `aiusage collect` to report the last 14 calendar days immediately.
The rows come from ccusage for every agent it detects, plus two sources ccusage has no adapter for, which the collector decodes itself and prices from the LiteLLM table it caches for a day at `~/.config/aiusage/litellm-prices.json`: the Antigravity CLI conversations under `~/.gemini/antigravity-cli`, reported as `antigravity`, and the Devin CLI transcripts under `~/.local/share/devin/cli/transcripts`, reported as `devin` with the effort suffix of each model collapsed into its LiteLLM name.

The config holds a list of targets, each with its own url and key, and `collect` posts the same report to every one of them.
Running `aiusage install` with a new url adds a target and keeps the existing ones, and running it again with a configured url replaces that target's key, so one machine can feed a personal instance and a team board at once.

A collector release is a version bump merged to `main` followed by a `collector-v<version>` tag on that commit; the `release` workflow publishes the package to npm with provenance and creates the GitHub release.

To upgrade, reinstall the latest package and regenerate the schedule with the existing key:

```bash
bun add -g @cgaravitoq/aiusage@latest
aiusage install --url <url> --key <existing-key>
```

On macOS, run `launchctl bootout gui/<uid>/dev.aiusage.collector`, then run the printed `launchctl bootstrap` command.
On Linux, run `systemctl --user daemon-reload`, then run the printed `systemctl --user enable --now aiusage.timer` command.
