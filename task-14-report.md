# Task 14: Portable collection backups

## Delivered

- Added version-1 portable JSON collection export with the required `almost-museum` envelope.
- Serialized stored file Blobs as base64 data with their MIME type and restored them as Blobs while retaining artifact metadata.
- Added a validate-before-write import preview, clear malformed/newer-version errors, and a confirmation-gated Settings restore flow.
- Added transactional repository replacement for Exhibits, artifacts, and history, with pre-write schema normalization.

## Restore safety

- Rejected imports never call restore, so existing local data remains intact.
- Repository validation occurs before collection clears.
- The three collection clears and replacement writes are in one Dexie transaction; a later write failure rolls the old collection back.

## Verification

- `pnpm vitest run tests/unit/backups/collection-backup.test.ts tests/unit/collection-backups.test.tsx` — 7 passed.
- `pnpm test:unit` — 19 files / 112 tests passed.
- `pnpm typecheck` — passed.
- `pnpm lint` — passed.
- `pnpm build` — passed; all 9 static pages generated and exported.

## Test-environment note

`fake-indexeddb` converts jsdom `Blob` values to plain objects when they are read back, unlike browser IndexedDB. The Blob service test therefore validates byte-for-byte export/import before persistence; repository tests separately prove atomic restore behavior with serializable records.
