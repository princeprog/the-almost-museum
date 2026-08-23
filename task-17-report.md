# Task 17 — Responsive and Accessible States Report

## Delivered

- Capture validation now moves focus to an assertive, keyboard-focusable error summary.
- Exhibit feedback distinguishes normal completion messages from validation and persistence failures, so failures are announced as alerts.
- Gallery, onboarding, and Exhibit-detail reads now distinguish a temporary local-storage failure from a truly missing record, preserve the collection, and offer a retry action.
- The offline fallback now provides a keyboard-reachable route back to the cached Museum.
- Narrow layouts now stack settings/backup dialog actions and service-worker updates, retain comfortable dialog padding, and wrap long artifact/card labels without horizontal overflow.
- The rust text token was darkened for stronger contrast against the paper palette. Existing reduced-motion, skip-link, dialog focus restoration/trapping, labels, and status semantics were retained.

## Test-first coverage

The new component tests were written and observed failing before implementation. They cover:

- capture-validation focus and assertive announcement;
- gallery and onboarding local-read failure recovery;
- Exhibit-detail failure-versus-missing-record recovery;
- assertive attachment-validation feedback; and
- offline recovery navigation.

## Verification

All commands were run in this worktree on 2026-08-23:

- `pnpm test:unit` — 23 files, 129 tests passed.
- `pnpm lint` — passed.
- `pnpm typecheck` — passed.
- `pnpm build` — static export and Serwist service worker completed.
- `pnpm test:pwa:clean` — clean PWA shell verification passed.
- `pnpm exec playwright test` — 7 Chromium browser checks passed, including offline fallback, 375 px capture/landing containment, and successful-closure focus restoration.
- `git diff --check` — passed.

No axe package is installed in the project, so the audit used semantic component assertions and the existing exported-app browser coverage rather than adding a new dependency for this focused hardening task.

## Focus restoration follow-up

Closure actions can replace the control that opened their confirmation dialog. `Dialog` now accepts an explicit stable restoration target plus a success-only restoration signal. On a successful Archive, Complete, Release, Transform, or Revive mutation, it restores focus to the surviving Exhibit heading instead of the removed trigger; Escape and Cancel continue restoring the original trigger. Component and Chromium regression tests cover both paths.
