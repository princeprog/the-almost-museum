# Almost Museum landing design QA

## Comparison target

- Source visual truth: `outputs/almost-museum-landing-full.png`
- Final implementation capture: `outputs/landing-production-reference-viewport.png`
- Side-by-side evidence: `outputs/landing-production-comparison.png`
- Route and state: `/`, default desktop state, exported production build
- Viewport: 903 x 1216 CSS px
- Source pixels: 903 x 1216
- Implementation pixels: 903 x 1216
- Density normalization: 1 CSS px to 1 image px; no scaling or crop was applied

## Findings

No actionable P0, P1, or P2 differences remain.

- Fonts and typography: Newsreader, Inter, and Geist Mono match the approved project font system and the reference hierarchy. The headline keeps the exact four-line wrap, optical weight, and vertical progression; the eyebrow, body copy, catalogue metadata, and lower record typography align at the reference viewport.
- Spacing and layout rhythm: the pill header, 831 x 684 hero frame, concentric archive motif, CTA, metadata, 108 px section gap, and lower note align with the reference. The document remains 903 x 1216 with no horizontal overflow.
- Colors and visual tokens: the ivory page, warm studio surface, charcoal controls, muted sage eyebrow, aged-brass record rule, restrained borders, and soft hero shadow visually match the source palette.
- Image quality and asset fidelity: the reference contains no photographic, illustrative, logo, or thumbnail assets. Its decorative orbit is reproduced as the approved responsive CSS layout treatment, so it remains sharp at every viewport without substituting for missing imagery.
- Copy and content: all app-specific copy shown in the source is present, including the headline, supporting sentence, CTA, collection metadata, and lower record note.
- Behavior and accessibility: the CTA navigates to `/museum`; navigation links retain their intended routes; the skip link and visible focus treatment remain; the heading has the exact accessible name; all three navigation links remain usable at phone width.
- Responsiveness: the mobile capture at `outputs/landing-mobile-final.png` has no horizontal overflow, keeps the intended four-line hero hierarchy, and preserves the complete navigation at a phone breakpoint.

## Focused comparison evidence

- Hero typography rows were compared directly between the source and implementation after matching dimensions. The final line starts and text bounds are within approximately 1-3 px of the raster reference, with equivalent wrapping and optical balance.
- The lower record label, title, and body rows were compared independently; their baseline positions, widths, and two-line body wrap align with the source.
- Surface color samples were checked at the page background, header, hero center, hero edge, border, CTA, and lower-note rule. The final surface treatment preserves the source's warm center and restrained edge contrast.

## Comparison history

### Pass 1 - structure

- Earlier finding: the browser scrollbar reduced the captured content width by 15 px and extended the page to 1243 px, shifting the hero width away from the reference.
- Fix: moved the header's top spacing into the museum shell so the margin no longer collapsed beyond the 100dvh layout.
- Post-fix evidence: `outputs/landing-implementation-pass-2.png` measures 903 x 1216, with the header at y=27 and the hero at x=36, y=162, width=831, height=684.

### Pass 2 - typography and spacing

- Earlier finding: the eyebrow was too narrow, headline lines were too tightly stacked, supporting copy was slightly wide, and the lower note sat 4-8 px below the source.
- Fix: tuned hero-specific mono tracking, headline line height and margins, body scale, catalogue tracking, note title scale, and note padding.
- Post-fix evidence: `outputs/landing-implementation-pass-3.png` preserves the source line breaks and aligns the lower note's label, heading, and body rows.

### Pass 3 - visual polish

- Earlier finding: the studio surface was too flat and dark, the hero lacked the source's subtle bottom shadow, and the featured Museum pill was approximately 5 px too wide.
- Fix: matched the warm radial surface, border color, restrained shadow, featured-link padding, and final hero baseline rhythm.
- Post-fix evidence: `outputs/landing-production-comparison.png` shows the source and exported production build side by side at equal size.

## Primary interactions and runtime checks

- `Enter the Museum` navigated from `/` to `/museum` in the in-app browser.
- Desktop and phone layouts were inspected with no horizontal overflow.
- Exported production preview reported no console errors or warnings.
- Focused landing-page browser tests passed in Chromium, Firefox, and WebKit.

## Follow-up polish

- P3: minute antialiasing and paper-noise differences remain because the source is a compressed raster image while the implementation renders live type and responsive CSS. These do not change geometry, hierarchy, color intent, or usability.

## Implementation checklist

- [x] Match source frame, navigation, copy, type hierarchy, orbit geometry, CTA, metadata, and lower note.
- [x] Preserve existing Museum routes and shared Button primitive.
- [x] Verify desktop and mobile containment.
- [x] Verify primary navigation and CTA behavior.
- [x] Compare source and implementation at the same viewport.
- [x] Complete structure, typography/spacing, and visual-polish refinement passes.

final result: passed
