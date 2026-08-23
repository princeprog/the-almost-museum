# Task 15: Archive and privacy settings

## Delivered

- Added the Settings archive/privacy surface with browser-provided storage usage and quota estimates.
- Reports persistent-storage availability/status and lets supported browsers receive a persistence request without reading or writing collection records.
- Retained Task 14's existing portable JSON export/import/preview/restore controls in the Settings route.
- Added a separately confirmed destructive action that calls only the canonical `ExhibitRepository.eraseAll()` method.

## Privacy and recovery behavior

- The page makes the local-only browser storage boundary explicit: the Museum does not send the collection to a server.
- Erasure removes Exhibits, attachments, and timeline events only after the confirmation dialog's danger action.
- A successful erase directs the visitor to restore an exported backup; failed persistence/erase operations state the recovery implication without claiming data was removed.
- Repository coverage proves `eraseAll()` is safe to call again after the collection is already empty.

## Verification

- `pnpm vitest run tests/unit/persistence/exhibit-repository.test.ts tests/unit/archive-privacy-settings.test.tsx tests/unit/browser/storage-status.test.ts tests/unit/collection-backups.test.tsx` — 27 tests passed.
- `pnpm test:unit` — 21 files / 118 tests passed.
- `pnpm typecheck` — passed.
- `pnpm lint` — passed.
- `pnpm build` — passed; all 9 static pages generated and exported, including `/settings`.

## Fix round 1

- Corrected the backup-control heading hierarchy: `Back up your museum` remains the section `h2`, while its Export and Restore subsections are `h3` headings.
- Added a focused accessibility regression assertion for all three heading levels.
