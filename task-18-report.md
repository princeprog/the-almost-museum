# Task 18 — Critical museum journeys

## Delivered coverage

- Onboarding begins with an empty collection and installs the Harbor Queue demo only after its explicit action.
- Exhibit capture covers identity, link and note artifacts, editing, artifact removal, persistence after reload, edited-tag retention, removed-note absence, and gallery reopening.
- Chromium and Firefox verify a local file artifact survives a browser reload.
- Gallery search and filtering cover room, type, status, tag, empty state, and a fully asserted filter reset (values, room, result count, and restored excluded result).
- Closure ceremonies cover archive, complete, release acknowledgement, revive, and both existing-Exhibit and new-Exhibit transformations.
- Backup coverage exports a version-one JSON archive, confirms destructive erase, previews a restore, restores only after confirmation, reopens restored link and note evidence, and rejects malformed input without replacing the restored collection.
- Narrow-width checks cover gallery, capture, detail, and settings routes.
- The service-worker suite verifies manifest/icon responses, the generated worker, and an offline Chromium revisit that reaches the offline fallback.

## Browser matrix

- Chromium: all critical journeys, including local file persistence, passed.
- Firefox: all critical journeys, including local file persistence, passed under six concurrent workers and two consecutive repetitions.
- WebKit: all compatible journeys passed. Only its local-file Blob test is skipped because Playwright WebKit on Windows does not settle the Dexie Blob write transaction; link and note artifact persistence remain covered in WebKit.
- Chromium offline: manifest, generated icons, service-worker activation, and offline fallback passed in the dedicated `chromium-offline` project.

## Supporting test-environment adjustments

- Added Firefox and WebKit projects, while keeping service-worker/offline coverage isolated to Chromium.
- Moved the PWA assertion into `offline.spec.ts` so non-Chromium browser journeys do not make service-worker assumptions.
- The capture route now exposes `aria-busy` until its client handlers hydrate. Browser tests wait for this semantic state rather than using a fixed delay or the default five-second URL expectation.
- Critical tests explicitly use fresh Playwright contexts with an empty storage state, so local UI preferences cannot cross parallel test runs.
- The offline test requires an active worker to control a reloaded page before network disconnection; registration alone is not treated as offline readiness.

## Verification

- `pnpm test:unit` — 129 tests passed.
- `pnpm lint` — passed.
- `pnpm typecheck` — passed.
- `pnpm build` — passed.
- `pnpm test:pwa:clean` — passed; generated `out/sw.js` precaches the static shell.
- `pnpm exec playwright test tests/e2e/critical-journeys.spec.ts --project=firefox --workers=6 --repeat-each=2` — 16 passed; this is the repeated, parallel Firefox verification.
- `pnpm exec playwright test tests/e2e/critical-journeys.spec.ts --project=chromium --project=webkit --workers=6` — 15 passed, 1 skipped. The sole skip is the WebKit-only local-Blob artifact test described above.
- `pnpm exec playwright test tests/e2e/smoke.spec.ts --project=chromium --project=firefox --project=webkit --workers=6` — 18 passed.
- `pnpm exec playwright test tests/e2e/offline.spec.ts --project=chromium-offline --workers=1` — 1 passed.
