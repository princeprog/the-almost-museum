# Almost Museum repo-wide shadcn and typography QA

## Scope

- Routes: `/`, `/museum`, `/exhibit/new`, `/exhibit`, `/settings`, and `/offline`.
- Shared surfaces: sticky responsive navigation, skip link, and service-worker update notice.
- Typography: Inter for interface headings, body copy, forms, and controls; Geist Mono only for intentional metadata.
- Component baseline: official Base Nova shadcn primitives and composition without custom visual skins.
- Verified CSS viewports: 375 x 812, 768 x 1024, 1440 x 900, and 1920 x 1080.

## Visual evidence

- Landing reference: `outputs/almost-museum-landing-reference-v2.png`.
- Fresh production captures:
  - `outputs/shadcn-landing-desktop-2026-08-24.png`
  - `outputs/shadcn-landing-phone-2026-08-24.png`
  - `outputs/shadcn-capture-phone-2026-08-24.png`
  - `outputs/shadcn-settings-desktop-2026-08-24.png`
- The approved four-chapter landing composition, imagery, copy, and local-first positioning remain intact.
- The phone and desktop captures confirm responsive full-device layouts, consistent typography, visible sticky navigation, contained forms, and no nested-website frame.

## Component and interaction checks

- Museum gallery: Card, Badge, ToggleGroup, Select, Field, Alert, Skeleton, and Empty states verified.
- New Exhibit: Field/Input/Select anatomy, progress, evidence cards, validation alerts, and cancellation AlertDialog verified.
- Exhibit detail: story editing, artifact maintenance, timeline, loading/error/empty states, closure ceremonies, RadioGroup, Checkbox, Dialog, and AlertDialog verified.
- Settings: storage, export, restore preview, invalid backup protection, file Input, Badges, Alerts, and destructive AlertDialogs verified.
- Offline and shared states: recovery Card/Alert, generated service worker, update Alert action, skip-link focus, and sticky navigation verified.
- Local-first workflows remain functional: onboarding, gallery filtering, capture, editing, artifacts, transformations, closure ceremonies, backup/restore/erase, and offline recovery.
- Narrow-screen controls retain 44 px touch targets, media remains contained, and no page-level horizontal overflow was detected.
- Reduced-motion behavior disables landing snapping and smooth motion.

## Verification evidence

- Lint: passed.
- Typecheck: passed.
- Production export and service-worker build: passed; 64 URLs precached.
- Unit tests: 32 files and 163 tests passed.
- Playwright: 88 passed and 1 intentional WebKit file-persistence skip across Chromium, Firefox, WebKit, and the Chromium offline project.
- Production screenshots were inspected at desktop and phone sizes.

## Findings

- No actionable P0, P1, P2, or P3 visual or interaction findings remain.

## Result

final result: passed
