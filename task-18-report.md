# Task 18 — Critical museum journeys

## Delivered coverage

- Onboarding begins with an empty collection and installs the Harbor Queue demo only after its explicit action.
- Exhibit capture covers identity, link and note artifacts, editing, artifact removal, persistence after reload, and gallery reopening.
- Chromium additionally verifies a local file artifact survives a browser reload.
- Gallery search and filtering cover room, type, status, tag, empty state, and clearing filters.
- Closure ceremonies cover archive, complete, release acknowledgement, revive, and both existing-Exhibit and new-Exhibit transformations.
- Backup coverage exports a version-one JSON archive, confirms destructive erase, previews a restore, restores only after confirmation, and rejects malformed input without replacing the restored collection.
- Narrow-width checks cover gallery, capture, detail, and settings routes.
- The service-worker suite verifies manifest/icon responses, the generated worker, and an offline Chromium revisit that reaches the offline fallback.

## Browser matrix

- Chromium: all critical journeys, including local file persistence, passed.
- Firefox: all cross-browser critical journeys passed; the Chromium-only local file test is intentionally skipped.
- WebKit: all compatible journeys passed; the Chromium-only local file test is intentionally skipped because Playwright WebKit on Windows does not settle the Dexie Blob write transaction. Link and note artifact persistence remain covered in WebKit.
- Chromium offline: manifest, generated icons, service-worker activation, and offline fallback passed in the dedicated `chromium-offline` project.

## Supporting test-environment adjustments

- Added Firefox and WebKit projects, while keeping service-worker/offline coverage isolated to Chromium.
- Moved the PWA assertion into `offline.spec.ts` so non-Chromium browser journeys do not make service-worker assumptions.
- Waited for the client-side capture form to settle after navigating to the exported static route. This prevents WebKit from writing into pre-hydration markup and then losing the first field value when React takes ownership.

## Verification

- `pnpm test:unit` — 129 tests passed.
- `pnpm lint` — passed.
- `pnpm typecheck` — passed.
- `pnpm build` — passed.
- `pnpm test:pwa:clean` — passed; generated `out/sw.js` precaches the static shell.
- Critical Playwright suite passed in Chromium and Firefox; WebKit passed all compatible tests with the one documented platform limitation.
- `offline.spec.ts` passed in the dedicated Chromium offline project.
