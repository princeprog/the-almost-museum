# Almost Museum Tailwind and shadcn landing QA

## Comparison target

- Source visual truth: `outputs/almost-museum-landing-reference-v2.png`
- Final production captures: `outputs/tailwind-shadcn-landing-desktop.png` and `outputs/tailwind-shadcn-landing-phone.png`
- Route and state: `/`, default public landing state
- Verified CSS viewports: 375 x 812, 768 x 1024, 1440 x 900, and 1920 x 1080

## Visual comparison evidence

- The source and final desktop capture were opened together in one comparison input.
- The blue-gray hero, architectural composition, off-white exhibit gallery, quiet workflow field, pale value band, and dark doorway CTA remain aligned with the approved source.
- The requested four-chapter presentation is preserved. Every chapter has at least one small viewport of coverage and may grow when content needs more room.
- The desktop header and landing canvas use the available device width without recreating the previous nested-website frame.
- The phone capture confirms a wrapped two-row header, readable hero copy, touch-sized actions, a contained hero composition, and no page-level horizontal overflow.

## Component and responsive checks

- The landing and shared header are Tailwind-first; obsolete marketing/header selectors and the `landing.css` import were removed.
- Exhibit previews use the shadcn `Card` composition with `CardHeader`, `CardContent`, and `CardFooter`; statuses use `Badge`; benefit/value divisions use `Separator`.
- Mobile and tablet exhibit, workflow, and value tracks are horizontally scrollable while the document itself remains contained.
- Desktop uses five exhibit columns and four-column benefit, workflow, and value layouts.
- Desktop proximity snapping is enabled; mobile keeps natural document scrolling; reduced-motion disables snapping and smooth motion.
- All navigation and CTA destinations remain functional, and the skip link moves focus to the main application root.

## Verification evidence

- Lint: passed.
- Typecheck: passed.
- Production build and service-worker build: passed.
- Unit tests: 29 files and 156 tests passed.
- Focused landing browser suite: 21 tests passed across Chromium, Firefox, and WebKit.
- Browser console inspection: no warnings or errors.
- Production screenshots were inspected at desktop and phone sizes.

## Findings

- No actionable P0, P1, P2, or P3 visual findings remain.

## Result

final result: passed
