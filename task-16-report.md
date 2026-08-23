# Task 16: Installable Offline Use

## Delivered

- Added a static web manifest with standalone display, app identity colors, and generated 192px and 512px PNG icons.
- Added Serwist 9.5 configurator-mode integration. It runs after Next's static export, remains compatible with Turbopack or webpack, and writes the generated worker directly to `out/sw.js` without relying on an ignored `public/sw.js`.
- The generated worker precaches the static application shell (`/`, `/museum`, `/exhibit`, `/exhibit/new`, `/settings`, and `/offline`) together with the exported assets. The explicit `esnext` worker target avoids Serwist 9.5's incompatible downlevel transform against Next 15's browser baseline.
- Added a production-only native service-worker registration boundary with an accessible refresh notice when a new worker is available.
- Updated the offline route and configured the worker to return it only when a document navigation cannot be fulfilled. Normal exhibit routes remain functional while the worker is active.
- Updated the static server to serve `.webmanifest` as `application/manifest+json` and `.png` as `image/png`.

## Build contract

- `pnpm build` first runs `next build`, which performs the static export to `out/`; it then runs the supported Serwist configurator command, `serwist build serwist.config.mjs`.
- `serwist.config.mjs` uses `@serwist/next/config` to derive Next's precache inputs and compiles `app/sw.ts` to `out/sw.js`. `public/sw.js` is neither a source nor a build output.
- `pnpm test:pwa:clean` removes `.next/`, `out/`, and any legacy `public/sw.js` before invoking `pnpm build`, then verifies the newly emitted worker and its shell-route precache entries. This is the clean-checkout guard for the export contract.

## Verification

- `pnpm lint` — passed.
- `pnpm typecheck` — passed.
- `pnpm test:unit` — passed: 22 files, 121 tests.
- `pnpm build` — passed with static export including `/manifest.webmanifest`, `/offline`, and `/sw.js`.
- `pnpm test:pwa:clean` — removes `.next`, `out`, and any stale `public/sw.js` before rebuilding; passed with a newly generated `out/sw.js` that precaches the application shell.
- `pnpm playwright test tests/e2e/smoke.spec.ts --project=chromium` — passed: 6 tests. The PWA test verifies the manifest and icon responses, service-worker activation, and an offline navigation to an unknown route rendering the fallback.
- Static output inspection confirmed a standalone manifest, valid PNG dimensions of 192x192 and 512x512, and the generated worker precaching all declared shell routes plus `/offline`.

## Notes

- `ServiceWorkerRegistration` still performs native registration only in production, which keeps development free of service-worker registration while retaining the accessible update notice.
