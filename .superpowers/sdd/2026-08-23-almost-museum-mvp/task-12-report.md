# Task 12 Report: The Almost timeline

## Delivered

- Added a read-only `AlmostTimeline` component that projects append-only `HistoryEvent` records in chronological order.
- Rendered creation, edits, artifact additions/removals, transformations, and closure/status changes in museum-language summaries with the useful event details available in the existing record.
- Integrated the timeline into Exhibit detail through `ExhibitRepository.getHistory`; no component writes directly to persistence or changes existing history records.
- Kept timeline load failures scoped to the timeline, so the Exhibit remains readable, and supplied distinct loading, empty, and unavailable states.
- Refreshed the timeline after repository-backed Exhibit edits and artifact changes.

## TDD evidence

- `tests/unit/almost-timeline.test.tsx` was added first and failed because `@/components/almost-timeline` did not yet exist.
- `tests/unit/exhibit-detail.test.tsx` then added the repository integration expectation and failed because Exhibit detail did not render the timeline.
- The minimal timeline component and repository-backed detail integration were added only after those red runs.

## Verification

- `pnpm vitest run tests/unit/almost-timeline.test.tsx tests/unit/exhibit-detail.test.tsx` — 2 files, 12 tests passed.
- `pnpm test:unit` — 17 files, 100 tests passed.
- `pnpm lint` — passed.
- `pnpm typecheck` — passed.
- `pnpm build` — passed; Next.js statically prerendered `/exhibit`.
- `git diff --check` — passed.

## Scope

- No ledger edits, pushes, merges, rebases, deployments, or goal changes were made.
