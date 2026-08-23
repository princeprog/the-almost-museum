# Goal-mode plan: Almost Museum shadcn controls and typography

## Summary

Implement the approved controls-only refresh from clean `main` at `1a404e7`, using an isolated branch and fresh subagents for each task.

Fixed decisions:

- Use the official shadcn registry with `--base base`.
- Migrate buttons, inputs, textareas, labels, native selects, room filters, and badges.
- Use shadcn `NativeSelect`, preserving current keyboard behavior, React Hook Form registration, and `selectOptions()` tests.
- Keep the custom dialog, file inputs, radio buttons, and checkbox flows unchanged.
- Load Newsreader, Inter, and Geist Mono through `next/font/google`, with no runtime font-host requests.
- Preserve the existing ivory, charcoal, rust, brass, editorial layout, copy, persistence, and route behavior.
- Push and deploy the verified result to GitHub and Vercel.

## Implementation tasks

1. **Create the goal workspace and shadcn foundation**

   - Create `feat/almost-museum-shadcn-controls` in `.worktrees/almost-museum-shadcn-controls`.
   - Create a dedicated SDD ledger at `.superpowers/sdd/2026-08-23-almost-museum-shadcn-controls/progress.md`.
   - Initialize `components.json` with the official shadcn base registry.
   - Add and review `button`, `input`, `textarea`, `native-select`, `toggle-group`, `badge`, `label`, and `field` components through the shadcn CLI.
   - Use `--dry-run` and manual merging for existing `button.tsx` and `input.tsx`; never overwrite custom components blindly.
   - Preserve the current `primary`, `secondary`, `quiet`, and `danger` button behavior through shadcn-compatible semantic variants.
   - Map shadcn semantic tokens to the existing museum palette in `app/globals.css`, including square geometry and the current focus ring.

2. **Add bundled editorial typography**

   - Load `Newsreader`, `Inter`, and `Geist_Mono` once in `app/layout.tsx`.
   - Map them to the existing display, sans, and mono CSS variables.
   - Add Tailwind v4 `@theme inline` mappings without replacing the museum-specific CSS.
   - Verify generated font assets are emitted into the static export and precached by Serwist.

3. **Migrate gallery controls**

   - Replace room buttons in `components/museum-gallery.tsx` with a single-value shadcn `ToggleGroup`.
   - Replace search fields with shadcn `Field`, `FieldLabel`, `FieldDescription`, and `Input`.
   - Replace type, status, tag, and sort controls with `NativeSelect`.
   - Replace recovery, view-toggle, clear-filter, and CTA controls with `Button`; use `asChild` for link-based CTAs.
   - Use `Badge` for exhibit type, status, and tag metadata.
   - Preserve every existing accessible name, ID, result count, filter state, sorting state, and persisted view preference.

4. **Migrate capture, detail, and supporting actions**

   - Update `components/exhibit-capture.tsx` to use shadcn field primitives, inputs, textareas, native selects, and buttons while preserving `register`, validation, focus restoration, file previews, and cancellation protection.
   - Update `components/exhibit-detail.tsx` for edit fields, attachment fields, transform selects, action buttons, and badges.
   - Keep transform radio controls, release acknowledgement, file inputs, and the custom dialog behavior unchanged.
   - Migrate raw controls in onboarding, settings, backups, privacy, service-worker update messaging, landing, offline, and empty-state surfaces.
   - Do not change domain contracts, Dexie transactions, routes, service-worker registration, or repository behavior.

## Verification and rollout

- Run `pnpm test:unit`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test:pwa:clean`, and serialized Playwright journeys across Chromium, Firefox, WebKit, and offline Chromium.
- Check focus, reduced motion, responsive layouts, accessible names, native select behavior, and ToggleGroup state.
- Confirm local font assets exist and are referenced by the service-worker precache, with no runtime Google Fonts or other external font requests.
- Inspect `git status`, commit authors, commit history, and `git ls-remote`.
- Fast-forward the reviewed feature branch into `main`, push it, verify GitHub Actions and Vercel, then verify the production routes and offline revisit at `https://almostmuseum.vercel.app`.
- Mark the active goal complete only after every gate passes.
