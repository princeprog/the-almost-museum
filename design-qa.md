# Almost Museum full-screen sections design QA

## Comparison target

- Source visual truth: `outputs/almost-museum-landing-reference-v2.png`
- User-reported wide-screen regression: `C:/Users/ALPRIN~1/AppData/Local/Temp/codex-clipboard-4e4db5e6-358b-4b3f-b0e9-a64379ce1756.png`
- Final implementation captures: `outputs/almost-museum-fullscreen-desktop.png`, `outputs/almost-museum-fullscreen-section-2.png`, `outputs/almost-museum-fullscreen-section-3.png`, `outputs/almost-museum-fullscreen-section-4.png`, and `outputs/almost-museum-fullscreen-phone.png`
- Route and state: `/`, default public landing state
- Desktop CSS viewport: 1440 x 900 at device scale factor 1
- Phone CSS viewport: 375 x 812 at device scale factor 1
- Captured pixels: desktop captures are 1425 x 891 after browser scrollbar exclusion; the phone capture is 360 x 780 after browser chrome and scrollbar exclusion
- Density normalization: all implementation captures use device scale factor 1. The reference remains the source for visual language and content; the four-screen composition is an intentional layout change requested after the source was implemented.

## Screen geometry

At 1440 x 900, the landing canvas is 1383 px wide at x=21 with no horizontal document overflow.

| Screen | Top | Height |
| --- | ---: | ---: |
| Hero | 78.4 px | 821.6 px |
| Collection | 900.0 px | 900.0 px |
| Process | 1800.0 px | 900.0 px |
| Closing invitation | 2700.0 px | 900.0 px |

At 375 x 812, the first three screens are 812 px tall and the closing screen is 822.4 px tall so its footer remains readable. The document scroll width is 360 px against a 375 px viewport, with no page-level horizontal overflow.

## Full-view comparison evidence

- The source and all four final desktop captures were opened together in one comparison input.
- The original blue-gray hero, off-white gallery, quiet white process area, pale value strip, and dark doorway CTA remain visually consistent with the source.
- The requested change is visible as four deliberate device-sized chapters instead of one compressed poster-like canvas.
- Desktop proximity snapping aligns each chapter to the viewport without trapping natural scrolling.

## Focused comparison evidence

- Hero: `outputs/almost-museum-fullscreen-desktop.png` preserves the source headline hierarchy, architectural asset crop, privacy note, and primary/secondary actions while using the full device height.
- Collection: `outputs/almost-museum-fullscreen-section-2.png` combines the four benefits with the five exhibit cards into one complete viewport and keeps every card image sharp and proportionate.
- Process: `outputs/almost-museum-fullscreen-section-3.png` retains the four-step timeline and value band, with intentional negative space supporting the calm museum tone.
- Closing: `outputs/almost-museum-fullscreen-section-4.png` gives the doorway asset a full-screen cinematic treatment while keeping the CTA readable against the dark field.
- Phone: `outputs/almost-museum-fullscreen-phone.png` confirms readable hero copy, visible actions, contained artwork, and no horizontal page overflow. Collection, workflow, and value content use touch-friendly horizontal tracks with hidden native scrollbars and visible next-card peeking.

## Comparison history

### Pass 1 - full-width correction

- Earlier P2: a 76rem maximum width created the reported website-inside-a-website frame on wide displays.
- Fix: removed the outer maximum width and retained the intended 20 px desktop edge margin.
- Evidence: the landing canvas uses the available width at 1920 x 1080 with no horizontal overflow.

### Pass 2 - screen-sized chapter structure

- P2: the source composition used several short bands, so expanding them independently to 100vh would have produced oversized utility strips and weak hierarchy.
- Fix: grouped the page into four narrative chapters: hero, collection, process, and closing invitation. Each desktop chapter measures one viewport, with the first accounting for the header.
- Evidence: measured desktop chapter heights are 821.6, 900, 900, and 900 px at a 900 px viewport.

### Pass 3 - responsive scale and mobile polish

- P2: the original fixed small type became undersized when sections expanded across large monitors; phone horizontal content initially exposed native scrollbars.
- Fix: added restrained large-screen fluid typography, bounded card heights, compact phone benefit tiles, horizontal workflow/value tracks, touch containment, and hidden native scrollbars.
- Evidence: desktop hierarchy remains balanced at 1440 x 900, while all four phone chapters are at least 812 px tall and the document remains overflow-free.

## Required fidelity surfaces

- Fonts and typography: the Inter-based hierarchy, weights, wrapping, and letter spacing remain source-aligned; large screens receive fluid scaling while phone sizes remain compact and readable.
- Spacing and layout rhythm: every chapter occupies the device height, major content is vertically composed rather than stretched, and mobile tracks preserve clear gutters and partial-card affordances.
- Colors and visual tokens: blue-gray hero, warm gallery, white process field, pale value strip, and navy closing treatment remain unchanged from the supplied art direction.
- Image quality and asset fidelity: all supplied raster assets use Next Image, preserve their intended subject and crop, and remain sharp at the larger section sizes.
- Copy and content: all source headlines, descriptions, dates, statuses, labels, navigation items, and calls to action remain present.

## Interaction and accessibility checks

- Header navigation and both Enter the Museum actions retain their destinations.
- Learn more still targets the process section and benefits from smooth scrolling.
- Desktop uses proximity scroll snapping; mobile disables page snapping so longer content never traps the user.
- Phone gallery, workflow, and values remain horizontally swipeable without creating document overflow.
- Browser console inspection returned no errors.
- Focused browser coverage passed in Chromium, Firefox, and WebKit.

## Findings

- No actionable P0, P1, or P2 findings remain.
- P3: the process chapter intentionally uses generous negative space. This supports the product's quiet positioning and can be tightened later if a denser presentation is preferred.

## Result

final result: passed
