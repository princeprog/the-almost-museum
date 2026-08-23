# Almost Museum landing and navigation refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh the Almost Museum root landing page and shared navbar in the approved Museum Studio — centered archive direction, while preserving routes, accessibility, local-first behavior, and the existing visual system.

**Architecture:** Keep the root page as a server-rendered App Router component and keep navigation in `MuseumShell`. Use semantic markup plus the existing shadcn `Button` primitive, then express the new pale studio canvas, centered hero, decorative archive orbit, collection metadata, and compact pill-like header entirely in `app/globals.css`. Add focused unit and Playwright assertions for copy, links, decoration semantics, keyboard order, responsive containment, and the unchanged `/museum` destination.

**Tech Stack:** Next.js App Router, React, TypeScript, shadcn/ui `Button`, Tailwind v4 imports, existing Newsreader/Inter/Geist Mono fonts, Vitest + Testing Library, Playwright.

---

### Task 1: Lock the approved landing and navbar contract with tests

**Files:**
- Modify: `tests/unit/landing-page.test.tsx`
- Modify: `tests/unit/museum-shell.test.tsx`
- Modify: `tests/e2e/smoke.spec.ts`

- [ ] **Step 1: Update the landing unit expectations before implementation**

Change the first heading expectation to `Give unfinished work a place to live.` and assert the existing product premise remains visible. Keep the named CTA assertion for `Enter the Museum` and the `/museum` href. Extend the structural test with:

```tsx
expect(container.querySelector(".landing-page__hero-content")).toBeInTheDocument();
expect(container.querySelector(".landing-page__orbit")).toHaveAttribute("aria-hidden", "true");
expect(container.querySelector(".landing-page__collection-mark")).toHaveAttribute("aria-hidden", "true");
```

- [ ] **Step 2: Add the navbar visual contract to the shell unit test**

Keep the existing tab-order assertions. Add:

```tsx
expect(museumLink).toHaveClass("navigation-link--featured");
expect(screen.getByRole("link", { name: "Almost Museum home" })).toHaveClass("wordmark");
```

This verifies that the current Museum route remains the featured navigation action without changing its accessible name.

- [ ] **Step 3: Update the landing smoke assertions**

Use the new heading in the exported landing test. Keep the narrow viewport check, then assert the hero content is visible and the decorative orbit does not create horizontal overflow:

```ts
await expect(page.locator(".landing-page__hero-content")).toBeVisible();
await expect(page.locator(".landing-page__orbit")).toHaveAttribute("aria-hidden", "true");
```

- [ ] **Step 4: Run the focused tests and verify the contract fails against the old markup**

Run:

```bash
pnpm vitest run tests/unit/landing-page.test.tsx tests/unit/museum-shell.test.tsx
pnpm exec playwright test tests/e2e/smoke.spec.ts --grep "landing"
```

Expected: the new heading, hero-content, orbit, collection-mark, and featured-link assertions fail before implementation; retain the failure output as the TDD checkpoint.

- [ ] **Step 5: Commit the contract tests**

```bash
git add tests/unit/landing-page.test.tsx tests/unit/museum-shell.test.tsx tests/e2e/smoke.spec.ts
git commit -m "test: define centered archive landing contract"
```

### Task 2: Implement the centered archive landing composition

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/globals.css` (landing selectors around the current `.landing-page` block and the narrow viewport media query)

- [ ] **Step 1: Replace the root hero markup with the approved semantic composition**

Use this structure in `app/page.tsx`:

```tsx
<main className="landing-page">
  <section className="landing-page__hero" aria-labelledby="landing-title">
    <div className="landing-page__frame">
      <div aria-hidden="true" className="landing-page__orbit">
        <span className="landing-page__orbit-ring landing-page__orbit-ring--outer" />
        <span className="landing-page__orbit-ring landing-page__orbit-ring--inner" />
      </div>
      <div className="landing-page__hero-content">
        <p className="landing-page__catalogue">A private archive for the in-between</p>
        <h1 id="landing-title">Give unfinished work a place to live.</h1>
        <p className="landing-page__lede">
          Almost is a private museum for unfinished ideas, projects, and experiments.
        </p>
        <Button asChild className="landing-page__enter">
          <Link href="/museum">
            Enter the Museum <span aria-hidden="true">→</span>
          </Link>
        </Button>
      </div>
      <p aria-hidden="true" className="landing-page__collection-mark">Collection no. 01 · open archive ↗</p>
    </div>
  </section>

  <section className="landing-page__note" aria-labelledby="landing-note-title">
    <p className="museum-eyebrow">A different kind of record</p>
    <h2 id="landing-note-title">Keep the work. Keep the context.</h2>
    <p>
      Leave a trace of what you made, what changed, and what you might want to return to—on your own terms.
    </p>
  </section>
</main>
```

- [ ] **Step 2: Style the studio canvas and hero hierarchy**

Replace the current landing block in `app/globals.css` with styles that keep `.landing-page__frame` for existing selectors but make it a centered, pale, rounded studio canvas:

```css
.landing-page { display: grid; gap: clamp(var(--space-7), 12vw, 9rem); padding-bottom: var(--space-7); }
.landing-page__hero { display: grid; }
.landing-page__frame {
  align-items: center;
  background: color-mix(in srgb, var(--paper) 88%, white 12%);
  border: 1px solid color-mix(in srgb, var(--border) 70%, white 30%);
  border-radius: clamp(1.25rem, 4vw, 2rem);
  box-shadow: 0 1.5rem 3.5rem color-mix(in srgb, var(--charcoal) 10%, transparent);
  display: grid;
  isolation: isolate;
  min-height: clamp(32rem, 70vw, 42rem);
  overflow: hidden;
  padding: clamp(3.5rem, 10vw, 7rem) clamp(1.5rem, 7vw, 6rem);
  position: relative;
  text-align: center;
}
.landing-page__hero-content { align-items: center; display: grid; justify-items: center; position: relative; z-index: 1; }
.landing-page__catalogue { color: var(--sage); font-family: var(--font-mono); font-size: .68rem; font-weight: 700; letter-spacing: .14em; margin-bottom: var(--space-5); text-transform: uppercase; }
.landing-page__hero h1 { font-size: clamp(3.2rem, 8vw, 6.4rem); margin-bottom: var(--space-5); max-width: 11ch; }
.landing-page__lede { font-size: clamp(1.05rem, 2vw, 1.3rem); line-height: 1.5; margin-bottom: var(--space-6); max-width: 34rem; }
.landing-page__enter { justify-self: center; text-decoration: none; }
.landing-page__collection-mark { bottom: clamp(1rem, 4vw, 2rem); color: var(--charcoal-muted); font-family: var(--font-mono); font-size: .62rem; letter-spacing: .08em; margin: 0; position: absolute; right: clamp(1rem, 4vw, 2rem); text-transform: uppercase; z-index: 1; }
```

- [ ] **Step 3: Add the non-interactive archive orbit**

Add these selectors directly after `.landing-page__hero-content`:

```css
.landing-page__orbit { inset: 7% 8%; pointer-events: none; position: absolute; z-index: 0; }
.landing-page__orbit-ring { border: 1px solid color-mix(in srgb, var(--sage) 24%, transparent); border-radius: 50%; inset: 50% auto auto 50%; position: absolute; transform: translate(-50%, -50%); }
.landing-page__orbit-ring--outer { height: min(42rem, 92vw); width: min(42rem, 92vw); }
.landing-page__orbit-ring--inner { border-color: color-mix(in srgb, var(--faded-blue) 18%, transparent); height: min(25rem, 58vw); width: min(25rem, 58vw); }
```

Keep `pointer-events: none`, `z-index: 0`, and no animation; this makes the motif safe for reduced motion and keyboard interaction.

- [ ] **Step 4: Keep the supporting note compatible with the new rhythm**

Retain the existing note copy and selector names, then add:

```css
.landing-page__note { border-left: 2px solid var(--brass); margin-inline: auto; max-width: 38rem; padding-left: clamp(var(--space-4), 5vw, var(--space-6)); width: min(100%, 38rem); }
```

This centers the note within the landing grid while keeping the existing brass rule as the transition from the hero to the record section.

- [ ] **Step 5: Update the narrow viewport rules**

Inside `@media (max-width: 38rem)`, keep the existing single-column header behavior, set `.landing-page__frame` to `min-height: 34rem`, reduce its padding, hide `.landing-page__orbit-ring--outer`, and set `.landing-page__collection-mark` to `bottom: 1rem; left: 1rem; right: 1rem; text-align: center;` so the page remains contained at 375px.

- [ ] **Step 6: Run the focused unit tests**

Run:

```bash
pnpm vitest run tests/unit/landing-page.test.tsx tests/unit/museum-shell.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit the landing implementation**

```bash
git add app/page.tsx app/globals.css
git commit -m "feat: refresh Almost Museum landing experience"
```

### Task 3: Update the shared navbar for the Museum Studio direction

**Files:**
- Modify: `components/museum-shell.tsx`
- Modify: `app/globals.css` (header and navigation selectors)
- Modify: `tests/unit/museum-shell.test.tsx` if the final link structure needs an assertion adjustment

- [ ] **Step 1: Mark the Museum route as the featured entry action**

Extend the first `navigationItems` object with `featured: true`, then compose the class without changing its href or accessible name:

```tsx
const navigationItems = [
  { href: "/museum", label: "Museum", featured: true },
  { href: "/exhibit/new", label: "New exhibit" },
  { href: "/settings", label: "Settings" },
];

<Link className={cn("navigation-link", item.featured && "navigation-link--featured")} ...>
```

Import the existing `cn` helper from `@/lib/utils`; the only behavior change is the featured visual treatment.

- [ ] **Step 2: Style the compact header surface**

Update `.site-header` to use a pale paper surface, a subtle border, a large responsive radius, a small top margin, and a contained width. Keep `skip-link`, `wordmark`, `primary-navigation`, and focus styles intact. Add:

```css
.site-header { background: color-mix(in srgb, var(--paper) 92%, white 8%); border: 1px solid color-mix(in srgb, var(--border) 68%, white 32%); border-radius: 999px; margin: clamp(1rem, 3vw, 2rem) auto 0; padding: .7rem var(--page-gutter); }
.navigation-link--featured { background: var(--charcoal); border-radius: 999px; color: var(--paper); padding: .65rem .9rem; }
.navigation-link--featured::after { content: "↗"; margin-left: .35rem; }
.navigation-link--featured:hover, .navigation-link--featured:focus-visible { background: var(--rust-deep); color: var(--paper); text-decoration-color: transparent; }
```

Use a smaller radius and left-aligned wrap in the existing 38rem media query so the header never overflows.

- [ ] **Step 3: Run shell and landing tests**

Run:

```bash
pnpm vitest run tests/unit/museum-shell.test.tsx tests/unit/landing-page.test.tsx
pnpm exec playwright test tests/e2e/smoke.spec.ts --grep "landing|exported museum"
```

Expected: PASS, with the featured Museum link retaining `/museum` and the compact navbar visible at desktop and mobile widths.

- [ ] **Step 4: Commit the navbar implementation**

```bash
git add components/museum-shell.tsx app/globals.css tests/unit/museum-shell.test.tsx
git commit -m "feat: refine Almost Museum navigation"
```

### Task 4: Verify the complete local refresh

**Files:**
- Inspect only: `app/page.tsx`, `components/museum-shell.tsx`, `app/globals.css`, `tests/unit/landing-page.test.tsx`, `tests/unit/museum-shell.test.tsx`, `tests/e2e/smoke.spec.ts`

- [ ] **Step 1: Run project quality gates**

Run:

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm build
```

Expected: all commands exit with code 0 and the static export completes.

- [ ] **Step 2: Run responsive browser checks**

With the local production server, run:

```bash
pnpm exec playwright test tests/e2e/smoke.spec.ts --grep "landing|exported museum"
```

Check at 1440px and 375px that the header, hero canvas, CTA, supporting note, and `/museum` link are visible; confirm `document.documentElement.scrollWidth <= window.innerWidth` at both widths.

- [ ] **Step 3: Perform the accessibility pass**

Use keyboard navigation from the skip link through the home link, featured Museum link, remaining nav links, hero CTA, and note content. Confirm the orbit and collection mark are `aria-hidden`, decorative elements have no focusable descendants, and the static page has no external font requests.

- [ ] **Step 4: Review the diff and local history**

Run:

```bash
git diff origin/main...HEAD --stat
git status --short --branch
git log --oneline --decorate -5
```

Expected: only the approved spec, plan, focused tests, root page, shell, and related CSS are changed; the branch is ahead locally and no push is performed.
