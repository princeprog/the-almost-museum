# Almost Museum

Almost Museum is a private, local-first place for unfinished ideas, abandoned projects, experiments, and things that almost existed. It is deliberately a museum, not a task manager or a social feed: an Exhibit can keep its evidence, story, history, and a calm next decision without being sent to an account or service.

The MVP is a frontend-only Next.js application. There are no API routes, accounts, analytics, telemetry, cloud storage, payments, social features, or AI interpretation.

## Project material

- [Project brief (PDF)](./the-almost-museum-project-brief.pdf)
- [Approved MVP design](./docs/superpowers/specs/2026-08-23-almost-museum-mvp-design.md)
- [Implementation plan](./docs/superpowers/plans/2026-08-23-almost-museum-mvp.md)

## Production URL

No verified production URL has been recorded yet. After a Vercel production deployment has completed and its domain has been checked, replace this note with that exact HTTPS URL. Do not treat a preview URL as the production address.

## Run locally

Prerequisites:

- Node.js 22.15.0 or later in the Node 22 line (the CI workflow uses 22.15.0).
- Corepack enabled so the repository-pinned `pnpm@10.15.0` is used.
- A current desktop browser with JavaScript, IndexedDB, Blob/File APIs, and service-worker support for the full local-storage and PWA experience.

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:3000`. Development intentionally does not register the production service worker, so browser caches do not obscure local changes.

### Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the Next.js development server. |
| `pnpm lint` | Run ESLint. |
| `pnpm typecheck` | Type-check without emitting files. |
| `pnpm test` or `pnpm test:unit` | Run the Vitest unit and component suite once. |
| `pnpm test:unit:watch` | Run the Vitest suite in watch mode. |
| `pnpm build` | Create the static `out/` export and generate `out/sw.js`. |
| `pnpm test:pwa:clean` | Remove prior build artifacts, rebuild, and confirm the generated service worker precaches the required shell routes. |
| `pnpm serve:static` | Serve the already-built `out/` directory on `http://127.0.0.1:3000`. |
| `pnpm test:e2e` | Build, then run the complete Playwright suite against the static export. |
| `pnpm test:e2e:ui` | Build, then open the Playwright UI runner against the static export. |
| `pnpm generate:pwa-icons` | Regenerate the committed PWA icon assets when the icon source changes. |

Run `pnpm build` before `pnpm serve:static`. The static server is for exercising the deployed artifact; it is not a replacement for `pnpm dev` while editing.

## How the collection is stored

The application is an App Router static export (`output: "export"`). React screens use a repository boundary over Dexie, which stores the canonical collection in IndexedDB. The browser is the collection owner.

| Record | Stored in | What it preserves |
| --- | --- | --- |
| Exhibit | `exhibits` | Identity, type, current status, story, labels, tags, timestamps, and linked Exhibits. |
| Artifact | `artifacts` | Local image/PDF/audio blobs, or link and note evidence, associated with an Exhibit. |
| History event | `history` | Append-only creation, edit, artifact, status, and transformation events. |

All collection writes go through `ExhibitRepository`. It performs related record changes and their history events in IndexedDB transactions; application screens do not write directly to the tables. Closure actions (Revive, Archive, Complete, Transform, and Release) change status and preserve the Exhibit rather than deleting it. The optional Harbor Queue demo is installed only when chosen and is idempotent.

Images, PDFs, and audio are accepted up to 25 MiB per file. Links and notes do not store blobs. The Settings screen can report browser-estimated storage and request persistent storage when that browser exposes the capability.

### Privacy, scope, and retention

- Museum records and attachments remain in IndexedDB for this site in the current browser profile unless you export them or explicitly erase them.
- The deployed static files can be served by a host, but the application has no collection API or server-side database. Opening the app does not upload the collection to Almost Museum.
- Local browser data is not a guaranteed archive. Clearing site data, using a different browser or browser profile, private browsing behavior, device loss, storage eviction, or a browser reset can remove it. A granted persistent-storage request can reduce eviction risk, but it is not a substitute for a backup.
- An exported JSON file is outside the browser and may contain your Exhibit records and stored attachment data. Keep it somewhere you trust; this MVP does not encrypt backup files.

## Back up, restore, and erase

Use **Settings → Back up your museum** before clearing browser data, changing browser/profile, or moving devices.

1. Select **Export collection**. The browser downloads a dated JSON file named like `almost-museum-backup-YYYY-MM-DD.json`.
2. Store that file safely. It contains the complete collection: Exhibits, artifacts (including stored file data), and timeline history.
3. To restore, choose the JSON file in **Settings → Restore**. Almost Museum validates the version-1 `almost-museum` envelope and every record, then shows a count preview. No data is changed at preview time.
4. Select **Restore collection**, review the replacement warning, then select **Replace collection**. Restore replaces the current collection atomically; merge import is not part of this MVP. Export the current collection first if it matters.
5. To remove the browser-held collection, select **Settings → Erase all local data** and confirm **Erase all data**. This deletes every Exhibit, attachment, and history event from this browser. It cannot be undone here; only a prior export can restore it.

Malformed, unsupported, or newer-than-supported backups are rejected before they can replace a collection. A failed restore leaves the current collection unchanged.

## Browser, static-export, and PWA behavior

Almost Museum builds to portable HTML, CSS, JavaScript, and assets in `out/`. A static host must serve those generated files and preserve same-origin browser storage. The full experience requires JavaScript and IndexedDB; it is not designed for no-JavaScript browsing.

- The service worker is generated into `out/sw.js` during production builds and registers only in production. After an initial online visit, Chromium offline coverage confirms the precached shell can show the `/offline` fallback for an unavailable document.
- Browser install prompts, storage quotas, persistent-storage grants, and service-worker lifecycle behavior are controlled by the browser and platform. Installability and offline use therefore cannot be guaranteed on every device.
- Static export does not provide a Next.js runtime. Do not add server-dependent features such as Server Actions, a server-side database, authentication callbacks, telemetry endpoints, rewrites, redirects, headers, or ISR without changing the architecture and deployment model.
- The app uses direct static routes (`/`, `/museum`, `/exhibit/new`, `/exhibit`, `/settings`, and `/offline`). Exhibit selection is a client-side query parameter (`/exhibit?id=...`), so it does not require a dynamically generated page per Exhibit.

For the current framework constraints, see the official [Next.js static export guide](https://nextjs.org/docs/app/guides/static-exports).

## Testing and CI

GitHub Actions runs on pushes and pull requests with read-only repository permissions. It uses Node 22.15.0, Corepack, and `pnpm install --frozen-lockfile`, then runs linting, type-checking, Vitest, a static build, and the clean PWA verification.

The browser matrix runs the critical journeys and smoke suite in Chromium, Firefox, and WebKit. The Chromium-only `chromium-offline` project verifies the manifest, icons, production service worker, and offline fallback. Local file-blob persistence is intentionally skipped in Playwright WebKit on Windows because that engine does not settle the Dexie Blob write transaction; link and note persistence remain covered there. This matrix is a tested baseline, not a promise of identical storage or PWA behavior in every browser version and platform.

Before a release, run:

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:pwa:clean
pnpm test:e2e
```

## Deploy to Vercel

Vercel can deploy this as a static Next.js export. Deployment does not move browser-held museum records to Vercel.

1. Import the repository in Vercel, or authenticate with the Vercel CLI from this repository.
2. Keep the project root at the repository root. Use the locked pnpm install and build this project already defines: `pnpm install --frozen-lockfile` and `pnpm build`.
3. Let the Next.js project build complete and verify that the static export and `sw.js` are present in its deployment output. Do not substitute `next start`; this project has `output: "export"` and ships static files.
4. Check a preview deployment in a fresh browser profile: load `/museum`, create a test Exhibit, reload it, visit `/settings`, and confirm the manifest and service worker are available. Preview-site IndexedDB is isolated from production because browser storage is origin-specific.
5. Promote only the verified deployment to production, then test the final HTTPS production domain in a fresh browser profile. Record that exact URL in the **Production URL** section above.

For CLI-driven deploys, use `pnpm dlx vercel` for a preview and `pnpm dlx vercel --prod` for production after authentication and the checks above. Vercel's [deployment CLI guide](https://vercel.com/docs/cli/deploy) has current account, project-linking, and deployment-output details.

## Intentionally outside this MVP

- Museum maps and walkable/immersive 3D rooms.
- Poster, HTML, or other visual exports.
- Encrypted vaults and optional cloud sync.
- Accounts, collaboration, payments, and social features.
- AI interpretation, automatic categorization, or productivity scoring.
- Backup merge/import and any server-managed collection.

## Portfolio positioning

Almost Museum is a portfolio case study in restrained, privacy-conscious product design: a reflective alternative to productivity software, implemented as a local-first, static, installable web application. It demonstrates explicit ownership boundaries, transactional browser persistence, portable backups, offline-shell verification, accessible responsive workflows, and a calm editorial interface. It should be presented as an MVP with local data and browser-dependent PWA capabilities, not as a hosted collaboration platform or encrypted archival service.

