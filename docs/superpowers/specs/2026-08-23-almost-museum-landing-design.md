# Almost Museum landing and navigation refresh

## Status

Approved visual direction: **Museum Studio — centered archive** (B1).

## Intent

Refresh the root landing page and shared museum navigation so the first visit feels airy, composed, and intentional. The experience should borrow the references’ compact navigation, generous hero canvas, centered message, and restrained floating detail without turning Almost into a generic SaaS dashboard.

The landing page must communicate the premise quickly: Almost is a private place to keep unfinished ideas, projects, and experiments. The primary action remains entering the museum.

## Visual direction

- Keep the existing ivory, charcoal, rust, brass, and muted teal palette; use pale studio surfaces and dark teal accents to create the selected “Museum Studio” mood.
- Use the existing bundled Newsreader, Inter, and Geist Mono typography. Do not add runtime font-host requests or new image dependencies.
- Use a compact, calm navbar with the Almost Museum wordmark, a short set of useful links, and a visually distinct Enter action. Preserve the skip link, primary navigation label, keyboard focus styles, and home link.
- Build the hero as a centered composition inside a spacious pale canvas. Include a small all-caps/mono eyebrow, a concise headline, supporting copy, and a single primary CTA to `/museum`.
- Add a subtle orbit/archive motif with CSS layout treatment and small collection metadata. The motif is decorative and must be hidden from assistive technology.
- Keep the content responsive: the navigation may collapse/wrap naturally on small screens, the hero remains readable, and no decorative element may create horizontal overflow.

## Functional boundaries

- Modify only the root landing composition, shared museum-shell navigation, and their related styles/tests.
- Keep routes, query-addressed exhibit behavior, Dexie persistence, service-worker behavior, and all museum workflows unchanged.
- Keep `Button` as the shared CTA primitive. Do not replace the custom dialog, forms, or domain components as part of this refresh.
- Do not push to GitHub or deploy from this task. The implementation and commits remain local for review.

## Acceptance criteria

1. A first-time visitor can identify Almost as a private museum for unfinished work from the root page without opening another route.
2. The root page has one clear primary action that navigates to `/museum` and remains keyboard accessible.
3. The navbar is compact, readable, responsive, and keeps accessible names for home, navigation, and the Enter action.
4. The centered archive hero preserves the existing copy intent while improving hierarchy, whitespace, and visual rhythm based on the selected direction.
5. Decorative orbit/metadata treatments do not interfere with reading order, focus order, reduced-motion behavior, or responsive layout.
6. Existing landing/navigation tests, lint, typecheck, and static build continue to pass.

## Verification notes

Review the root route at desktop and narrow mobile widths, test keyboard navigation and reduced-motion preferences, verify `/museum` navigation, and inspect for horizontal overflow before considering the implementation complete.
