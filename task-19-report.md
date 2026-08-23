# Task 19 — Static MVP quality gates

## Delivered CI workflow

- Added `.github/workflows/ci.yml`, triggered for pull requests and pushes with read-only repository permissions and per-ref cancellation for superseded runs.
- The `quality` job pins Node 22.15.0, uses the pnpm cache and Corepack, and runs `pnpm install --frozen-lockfile` before linting, typechecking, unit/component tests, a static export build, and the clean PWA verifier.
- The `browser` job waits for static quality gates and repeats the frozen install before building `out/` and running a deterministic two-worker Playwright project matrix.
- Chromium, Firefox, and WebKit each run the critical journeys plus smoke suite. The service-worker/offline suite is deliberately isolated in the existing `chromium-offline` project, so it does not make unsupported service-worker assumptions in the other browsers.
- Failed browser jobs upload `test-results/` and `playwright-report/` for seven days. The workflow has no secret, account, API, or remote-service dependency.

## Configuration validation

- The initial workflow-contract check failed because `.github/workflows/ci.yml` did not exist, then passed after the workflow was added.
- The passing contract check asserts frozen installation, linting, typechecking, unit tests, static and clean-PWA builds, browser matrix coverage, Chromium-only offline coverage, diagnostic artifacts, and read-only permissions.
- `git diff --check` passed.

## Local verification

- `pnpm install --frozen-lockfile` — passed.
- `pnpm lint` — passed.
- `pnpm typecheck` — passed.
- `pnpm test:unit` — 23 files and 130 tests passed.
- `pnpm test:pwa:clean` — passed; it rebuilt the static export and emitted `out/sw.js` with the expected static shell precache.
- `pnpm exec playwright test tests/e2e/critical-journeys.spec.ts tests/e2e/smoke.spec.ts --project=chromium --workers=2` — 14 passed.
- `pnpm exec playwright test tests/e2e/critical-journeys.spec.ts tests/e2e/smoke.spec.ts --project=firefox --workers=2` — 14 passed.
- `pnpm exec playwright test tests/e2e/critical-journeys.spec.ts tests/e2e/smoke.spec.ts --project=webkit --workers=2` — 13 passed, 1 expected skip for the existing Windows WebKit local-Blob persistence limitation.
- `pnpm exec playwright test tests/e2e/offline.spec.ts --project=chromium-offline --workers=1` — 1 passed.
- The CI reporter form was run through a comma-preserving shell with the Chromium smoke suite; 6 tests passed and `playwright-report/index.html` was emitted for artifact upload on failures.
