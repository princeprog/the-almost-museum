# Almost Museum MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task with a fresh implementer and reviewer for each task.

**Goal:** Build, verify, publish, and deploy the complete frontend-only Almost Museum MVP using local-first browser storage and multiple meaningful commits.

**Architecture:** A static Next.js App Router application renders the museum shell and client workflows. Dexie owns canonical Exhibits, artifacts, and history in IndexedDB; a repository boundary makes mutations transactional and portable; Zustand owns only UI state. Serwist provides the installable offline shell.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, shadcn/ui, Motion, Dexie, Zustand, React Hook Form, Zod, Vitest, Testing Library, Playwright, pnpm, Serwist, Vercel.

**Spec:** `docs/superpowers/specs/2026-08-23-almost-museum-mvp-design.md`

## Global Constraints

- Frontend-only: no API routes, Server Actions, authentication, telemetry, cloud storage, or AI.
- Static export: `output: "export"`; browser APIs stay in client-only code.
- Canonical storage: separate Dexie tables for `exhibits`, `artifacts`, and append-only `history`.
- Backup envelope: `format: "almost-museum"`, `version: 1`, `exportedAt`, and all three collections.
- Artifact limit: images, PDFs, and audio up to 25 MiB per file; links and notes contain no blobs.
- Closure actions: Revive, Archive, Complete, Transform, and Release; closure never deletes records.
- First launch: empty collection with an explicit idempotent Harbor Queue demo installation.
- Language: reflective and non-judgmental; no guilt-driven task terminology.
- Testing: unit, repository, component, multi-browser, responsive, backup/restore, and Chromium service-worker/offline coverage.
- Git: focused commits, targeted staging, feature work in `.worktrees/almost-museum-mvp`, and parent-agent-controlled integration/pushes.

## Interfaces

The domain layer exports `ExhibitType`, `ExhibitStatus`, `ArtifactKind`, `Exhibit`, `Artifact`, and `HistoryEvent`. The persistence layer exports an `ExhibitRepository` with transactional methods for create, update, artifact mutation, closure transitions, transform linking, demo installation, backup export, backup restore, and erase-all. The UI consumes repository queries through client hooks and never writes directly to Dexie.

## Task 1: Scaffold the static Next.js application

**Commit:** `chore: scaffold the static Next.js application`

Create the App Router project with strict TypeScript, pnpm scripts, Tailwind, ESLint, `@/*` imports, static export configuration, and route placeholders. Verify install, lint, typecheck, and `pnpm build`.

## Task 2: Establish the application test harness

**Commit:** `test: establish the application test harness`

Add Vitest, Testing Library, fake IndexedDB, Playwright, shared fixtures, and a production static-server configuration. Add one passing smoke test for each runner.

## Task 3: Establish the museum design system

**Commit:** `feat: establish the museum design system`

Add palette tokens, typography, texture, spacing, responsive primitives, navigation, accessible button/input/dialog primitives, and reduced-motion handling. Verify a shell render and keyboard navigation.

## Task 4: Build the Almost landing experience

**Commit:** `feat: build the Almost landing experience`

Render the premise, “Not everything unfinished is a failure,” and the Enter Museum action. Add tests for copy, route navigation, and mobile layout.

## Task 5: Define the Exhibit domain contracts

**Commit:** `feat: define the Exhibit domain contracts`

Implement the exact union types, Zod schemas, normalization, closure eligibility, room mapping, history event factory, and version-one backup validator. Add failing-first unit tests for every boundary and transition.

## Task 6: Add transactional local persistence

**Commit:** `feat: add transactional local persistence`

Implement Dexie schema version 1 and `ExhibitRepository`. Prove atomic create/update/status/relationship writes, history emission, rollback behavior, reopen persistence, and recovery errors with fake IndexedDB tests.

## Task 7: Add private first-run onboarding

**Commit:** `feat: add private first-run onboarding`

Implement empty-state queries, Create Exhibit actions, and idempotent Harbor Queue demo installation. Verify no data appears without explicit user action.

## Task 8: Build the three-step Exhibit capture flow

**Commit:** `feat: build the three-step Exhibit capture flow`

Implement identity, evidence, and story steps with required validation, preserved navigation state, save/cancel behavior, and repository integration. Test keyboard and mobile flows.

## Task 9: Add local artifact handling

**Commit:** `feat: add local artifact handling`

Implement image/PDF/audio file validation, 25 MiB rejection, links, notes, previews, downloads, object-URL cleanup, quota warnings, and removal.

## Task 10: Build the responsive museum gallery

**Commit:** `feat: build the responsive museum gallery`

Implement Lobby, room filters, cards, type/status/tag filters, text search, sorting, counts, empty states, and persisted view preferences.

## Task 11: Build Exhibit detail and editing

**Commit:** `feat: build Exhibit detail and editing`

Resolve `?id=...`, handle missing IDs, render framed artifacts/story, edit fields, and manage attachments without bypassing the repository.

## Task 12: Add the Almost timeline

**Commit:** `feat: add the Almost timeline`

Render creation, edit, artifact, transformation, and closure events chronologically with museum-language summaries.

## Task 13: Add closure ceremonies

**Commit:** `feat: add closure ceremonies`

Implement Revive, Move to Archive, Complete, Transform, and Release dialogs, eligibility rules, confirmation behavior, atomic relationship updates, and status history.

## Task 14: Add portable collection backups

**Commit:** `feat: add portable collection backups`

Implement version-one JSON export, blob serialization, import validation/preview, malformed/newer-version rejection, atomic restore, and backup round-trip tests.

## Task 15: Add archive and privacy settings

**Commit:** `feat: add archive and privacy settings`

Show storage estimates, persistent-storage status/request, export/import controls, and a separately confirmed erase-all operation.

## Task 16: Enable installable offline use

**Commit:** `feat: enable installable offline use`

Add manifest, icons, Serwist service worker, registration, offline fallback, app-shell precaching, update state, and production-only service-worker verification.

## Task 17: Harden responsive and accessible states

**Commit:** `fix: harden responsive and accessible states`

Audit focus restoration, keyboard paths, labels, contrast, status redundancy, reduced motion, mobile layouts, missing-record states, quota failures, and offline recovery.

## Task 18: Verify critical museum journeys

**Commit:** `test: verify critical museum journeys`

Add Playwright coverage for onboarding, CRUD, filters, all closure actions, transformations, reload persistence, export/erase/restore, responsive layouts, and Chromium offline revisits with service workers enabled.

## Task 19: Enforce static MVP quality gates

**Commit:** `ci: enforce static MVP quality gates`

Add GitHub Actions for frozen install, lint, typecheck, unit/component tests, static build, and Playwright against `out/`.

## Task 20: Finalize privacy, deployment, and usage guides

**Commit:** `docs: finalize privacy deployment and usage guides`

Document setup, architecture, local-data guarantees, backup behavior, browser constraints, testing, Vercel deployment, roadmap exclusions, and portfolio positioning.

## Orchestration checkpoints

- Before Task 1, run the SDD preflight scan and record task/interface conflict rows in the ledger.
- Record each implementer base commit before dispatch and generate task briefs/review packages as files.
- Close a task only after reviewer spec and quality verdicts are clean or all capped findings have explicit ledger rulings.
- Push the feature branch after Tasks 4, 8, 12, 16, and 20.
- Run final whole-branch review before integration.
- Fast-forward `main`, push it, verify remote refs, deploy Vercel, and only then complete the goal.
