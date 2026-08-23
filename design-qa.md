# Almost Museum landing design QA

## Comparison target

- Source visual truth: `outputs/almost-museum-landing-reference-v2.png`
- Large-screen regression evidence: `C:/Users/ALPRIN~1/AppData/Local/Temp/codex-clipboard-4e4db5e6-358b-4b3f-b0e9-a64379ce1756.png`
- Browser-rendered implementation captures: `outputs/almost-museum-final-mobile-share.png`, `outputs/almost-museum-responsive-wide.png`, and `outputs/almost-museum-responsive-phone.png`
- Route and state: `/`, default desktop state
- Reference and implementation viewport: 968 x 1625 CSS px
- Responsive verification viewports: 1920 x 1080 and 375 x 812 CSS px at device scale factor 1
- Pixel evidence: source and implementation are 968 x 1625 for the fidelity check; the wide regression source is 1920 x 1080 including Brave chrome, while the app-owned in-browser capture is 1862 x 1072 from a 1920 x 1080 CSS viewport; the phone capture is 360 x 780 from a 375 x 812 CSS viewport after browser-scrollbar exclusion
- Density normalization: all browser captures use device scale factor 1; wide comparison ignores browser chrome and judges the app-owned content region plus measured DOM geometry
- Comparison method: reference and live in-app-browser capture were inspected together at identical dimensions after every pass
- Final document geometry: 968 x 1625, with no horizontal or vertical overflow at the reference viewport

## Final geometry

| Section | Top | Height |
| --- | ---: | ---: |
| Header | 20.0 px | 58.4 px |
| Hero | 78.4 px | 444.0 px |
| Benefit strip | 522.4 px | 120.8 px |
| Exhibit gallery | 643.2 px | 390.6 px |
| How it works | 1033.8 px | 261.6 px |
| Value strip | 1295.3 px | 99.2 px |
| Closing CTA | 1406.5 px | 166.8 px |
| Footer | 1573.4 px | 50.4 px |

## Comparison history

### Pass 1 - structure

- The header, hero, and benefit strip already aligned with the source, but the first implementation extended to 1695 px.
- Measured excess: gallery 26 px, workflow 28 px, and closing CTA 16 px.
- Corrected the gallery bottom rhythm, workflow content footprint, and CTA bottom padding without changing the aligned card and text baselines.

### Pass 2 - typography and spacing

- Shifted the hero eyebrow and headline to the source baselines while retaining the aligned supporting copy and privacy note.
- Corrected gallery media proportions from a shallow 1.24 ratio to the taller source treatment and increased metadata-to-media spacing.
- Tightened the workflow heading and description spacing so the illustration and step timeline align with the source.

### Pass 3 - visual polish

- Repositioned and resized the glowing doorway composition for the source CTA balance while keeping the left copy field dark and uncluttered.
- Confirmed generated hero, gallery, workflow, and doorway assets are sharp, intentional, and correctly cropped in their measured slots.
- Final capture matches the 968 x 1625 reference canvas exactly, with section boundaries within approximately 0-2 px of the source.

### Pass 4 - full-width responsiveness

- Earlier P2 finding: at 1920 x 1080, a `76rem` media-query cap held the header and landing canvas to 1216 px, leaving approximately 350 px of empty space on both sides and creating the reported website-inside-a-website effect.
- Fix: removed the large-screen max-width override while preserving the original 20 px desktop edge margin and the existing phone breakpoint behavior.
- Post-fix evidence: at 1920 x 1080, the header and landing canvas now start at x=20 and measure 1865 px wide; the document has no horizontal overflow. At 968 x 1625, the original reference geometry remains 928 px wide at x=20 and the full document remains exactly 1625 px tall.

## Full-view and focused comparison evidence

- Full-view: the original 968 x 1625 reference and revised implementation were compared together after the responsive change. Typography, section boundaries, imagery, colors, and copy remain unchanged at the source viewport.
- Large-screen focus: the user-provided 1920 x 1080 regression screenshot and the revised 1920 x 1080 implementation were inspected together. The centered 1216 px frame is removed and both primary surfaces now use the available device width.
- Phone focus: the 375 x 812 header, hero copy, CTA, and hero artwork were inspected at readable scale. The app canvas measures 336 px at x=12 with no horizontal overflow.
- No additional focused asset crops were needed because this iteration changes only the outer responsive constraint; existing asset crops and typography were not modified.

## Content and interaction checks

- All supplied landing copy, dates, statuses, exhibit labels, value statements, and footer language are present.
- Header navigation retains working routes for Museum, New exhibit, and Settings.
- Both Enter the Museum actions navigate to `/museum`.
- Learn more updates the URL to `#how-it-works`; View all exhibits navigates to `/museum`.
- The skip link remains the first keyboard focus target and the page has one accessible main landmark.
- Desktop renders without overflow at both 968 and 1920 px; the 375 x 812 responsive check also has no horizontal overflow and keeps the full navigation and CTA visible.

## React quality review

- Landing sections are static server components with module-level data; no unnecessary client boundary, effects, or state were introduced.
- Next Image is used for every raster asset, with explicit responsive sizing and meaningful alt text where the visual carries content.
- Repeated benefits, exhibits, workflow steps, and values use stable keys and focused component boundaries.
- Existing shared Button and MuseumShell primitives are retained.

## Remaining differences

- P3 only: minute font rasterization, noise, and icon-stroke differences remain because the source is a compressed screenshot while the implementation uses live type and the project icon system.

## Result

final result: passed
