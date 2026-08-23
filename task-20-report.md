# Task 20 — Privacy, deployment, and usage guides

## Delivered documentation

- Rewrote `README.md` as the production-facing usage guide, preserving the supplied project-brief PDF link and the approved design/plan links.
- Documented pinned setup prerequisites and every actual `package.json` script, including the static-export/PWA verification flow.
- Described the implemented App Router static export, Dexie repository boundary, IndexedDB data model, transactional history, artifact limits, optional demo, and local-data privacy guarantees.
- Added precise export, validation/preview, atomic replacement restore, and confirmed erase instructions. The guide distinguishes browser-held data from a user-downloaded JSON backup and does not promise encryption or automatic retention.
- Documented browser/API dependencies, static-export and service-worker limits, Chromium-only offline verification, the CI browser matrix, and the configured Playwright WebKit local-Blob test skip.
- Added Vercel deployment and verification instructions without deploying or inventing a production URL. The README retains an explicit verified-URL placeholder to be replaced only after production checks.
- Recorded MVP exclusions and portfolio framing without asserting unimplemented services or features.

## Source audit

- Reviewed the Task 20 brief (`task-20-brief.md`), the approved implementation plan, and the checked-in implementation as the source of truth.
- Command names were checked against `package.json`; CI claims were checked against `.github/workflows/ci.yml`; PWA/static claims were checked against `next.config.ts`, `serwist.config.mjs`, `app/sw.ts`, and `scripts/verify-pwa-build.mjs`.
- Backup, restore, erase, artifact, and storage claims were checked against the repository, backup, Settings, and artifact modules plus their tests.
- Static-export and deployment constraints are linked to current official Next.js and Vercel documentation from the README.

## Verification

- Command-reference audit against `package.json` — passed; every documented `pnpm` command is a defined script or documented CLI invocation.
- Documentation contract audit — passed; README contains the required privacy, usage, PWA/static-export, CI, Vercel, roadmap, and portfolio sections, retains the PDF link, has no invented license, and does not present a production URL.
- `git diff --check` — passed.
- `pnpm lint` — passed.
- `pnpm typecheck` — passed.
- `pnpm test:unit` — passed: 23 files and 130 tests.
- `pnpm test:pwa:clean` — passed; rebuilt the static export and emitted `out/sw.js` with the expected application-shell precache.
- Fix round 1 documentation contract audit and `git diff --check` — passed; corrected the Task 20 brief source-audit statement and described the local-Blob skip as applying to the configured WebKit project rather than Windows only.

## Scope

- Changed only `README.md` and this task report.
- No production deployment, URL recording, license addition, secrets, ledger change, or application-code change was made.
