# Task 16: Installable Offline Use

## Delivered

- Added a static web manifest with standalone display, app identity colors, and generated 192px and 512px PNG icons.
- Added Serwist build integration that preserves `output: "export"`, precaches the static application shell (`/`, `/museum`, `/exhibit`, `/exhibit/new`, `/settings`, and `/offline`), and versions those entries from the deployment or Git revision.
- Added a production-only native service-worker registration boundary with an accessible refresh notice when a new worker is available.
- Updated the offline route and configured the worker to return it only when a document navigation cannot be fulfilled. Normal exhibit routes remain functional while the worker is active.
- Kept the generated worker ignored by ESLint and Git while retaining its source in `app/sw.ts`.

## Verification

- `pnpm lint` — passed.
- `pnpm typecheck` — passed.
- `pnpm test:unit` — passed: 22 files, 121 tests.
- `pnpm build` — passed with static export including `/manifest.webmanifest`, `/offline`, and `/sw.js`.
- `pnpm playwright test tests/e2e/smoke.spec.ts --project=chromium` — passed: 6 tests. The PWA test verifies the manifest and icon responses, service-worker activation, and an offline navigation to an unknown route rendering the fallback.
- Static output inspection confirmed a standalone manifest, valid PNG dimensions of 192x192 and 512x512, and the generated worker precaching all declared shell routes plus `/offline`.

## Notes

- Serwist logs that automatic registration is disabled because the application deliberately performs native registration in `ServiceWorkerRegistration`; this is expected and lets the application expose its update notice. Registration remains disabled outside production.
