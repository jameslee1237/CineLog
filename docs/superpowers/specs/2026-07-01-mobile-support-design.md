# Phase 9: Mobile Support & Interactive Touch Design

## Goal & scope

Phase 8's brainstorming captured a narrow Phase 9 note: fix the touch-drag
affordance confusion on `InteractiveFilmCard` (`dragElastic`+`dragSnapToOrigin`
reads as "reorderable" on touch, even though nothing is). The user has since
expanded this: Phase 9 should make the app **properly support mobile view**
end-to-end, with a genuinely interactive, dynamic experience suited to both
desktop and mobile — not just disabling desktop-only affordances on touch.

One phase, two work-streams:

1. **Layout work-stream** — audit every page for mobile-viewport defects, fix
   what's actually broken.
2. **Interactive work-stream** — design and build a touch-native replacement
   for the desktop hover-tilt/glare/drag effect on `InteractiveFilmCard`,
   using the device's gyroscope so mobile gets an equally crafted "showcase"
   interaction, not a stripped-down fallback.

**Out of scope:** the touch-drag-affordance fix originally captured for Phase
9 is superseded — the interactive work-stream below replaces the drag gesture
entirely with gyroscope-driven tilt, so the "does drag look like reorder"
problem goes away by removing drag from the touch path rather than tuning it.
Extending the interactive treatment to `FilmCard` (used on `/search` and
`/profile`) is explicitly out of scope for this phase — stays exclusive to the
home grid's `InteractiveFilmCard`.

## §1 — Layout work-stream: audit findings & fixes

An audit (grepping for Tailwind responsive breakpoint classes across
`src/app` and `src/components`) found the app is not starting from zero —
most defects are specific, not systemic. `FilmCardGrid`/`FilmGrid` and
`ModalContainer` already have some mobile treatment (`grid-cols-2` at the
narrowest breakpoint, `w-[min(440px,92vw)]` modal width). The following are
the actual findings, ranked by confidence:

**Confirmed defect — film detail page poster missing on mobile.**
`src/app/films/[id]/page.tsx` wraps the poster in `hidden md:block w-48
shrink-0` — below the `md` breakpoint (768px), mobile users see the backdrop
image and text only, no poster at all. Fix: show a smaller poster on mobile.
The desktop layout (`flex gap-6 -mt-24`, poster overlapping the backdrop
alongside the title in a side-by-side row) assumes more horizontal space than
a phone has, so the mobile version should not just shrink the same layout —
it needs its own arrangement, likely a smaller poster placed above or beside
the title in a narrower flow rather than the desktop's dramatic backdrop
overlap.

**Needs verification, likely fix — Navbar + search on narrow viewports.**
`src/components/ui/Navbar.tsx` and `NavbarSearch.tsx` have zero responsive
classes. Rough width math suggests the collapsed state fits down to ~320px,
but this has never been tested on a real narrow viewport, and the *expanded*
search state (`NavbarSearch` growing to `flex-1 max-w-sm` on tap) could visibly
squeeze the Sign In / My List area on mobile — worth checking whether the
nav-auth slot should collapse or hide while search is expanded on mobile
specifically (a common pattern: expanding search takes over the header
temporarily on small screens).

**Verify only, fix if needed — home grid, search grid, profile grid.**
All three already share the same `grid-cols-2 sm:grid-cols-3 md:grid-cols-4
lg:grid-cols-5` pattern. At 2 columns on a 375px viewport, card width lands
around 170px with a 2/3 poster aspect ratio (~255px tall) — the math suggests
this is fine, but it hasn't been checked against a rendered page. No
anticipated code change here unless the visual check finds a real problem.

This work-stream is targeted fixes plus verification, not a ground-up
responsive rewrite.

## §2 — Interactive work-stream: gyroscope tilt architecture

**New component:** `src/components/film/TiltProvider.tsx` — a client
component wrapping the home grid's card area, exporting both the provider and
a `useTilt()` consumer hook.

**Single shared listener, not one per card.** `TiltProvider` owns exactly one
`deviceorientation` event listener regardless of how many cards are on
screen, and exposes shared Framer Motion values (`tiltX`, `tiltY`) via
Context. This was chosen over each card independently subscribing to its own
listener specifically because Phase 7/8 spent real, measured effort reducing
per-card CPU overhead on this exact grid — N independent listeners would cut
against that.

**Permission state machine.** `TiltProvider` tracks
`'unknown' | 'granted' | 'denied' | 'unsupported'`:
- On iOS 13+ (detected via `typeof DeviceOrientationEvent.requestPermission
  === 'function'`), the browser requires an explicit user-gesture-triggered
  call to `requestPermission()` before motion events are ever delivered — it
  cannot be requested automatically on page load. The first tap on any
  non-priority card triggers this request before the tap's existing job
  (navigate to the film's detail page) proceeds; the permission result does
  not block or alter navigation either way.
- On Android/other browsers (no `requestPermission` static method), skip the
  explicit request and attach the `deviceorientation` listener directly.
- If no orientation event arrives within ~1-2s of attaching the listener,
  treat the state as `'unsupported'` (covers desktop touch-emulation and
  devices genuinely lacking a gyroscope) and stop waiting.

**Ambient effect, not tap-triggered.** Once permission is `'granted'`, tilt is
**passive** — cards tilt as the user holds and moves their phone while
browsing the grid, the same way desktop cards tilt as the mouse moves over
them. Tapping a card's only jobs are (a) trigger the permission request the
first time, if applicable, and (b) navigate to the detail page, exactly as
today.

**Fallback: tap micro-interaction.** Whenever permission is
`'denied'`/`'unsupported'`/still `'unknown'` at tap time, tapping a card plays
a press-down + spring-back animation (scale to ~0.96, spring back to 1, with
a brief glare flash) as immediate tactile feedback before navigating — nobody
taps a completely inert card.

**`InteractiveFilmCard` changes.** The existing desktop mouse-driven
`tiltX`/`tiltY` computation is untouched. A new touch-path is added: on
`pointer: coarse` devices (checked via `matchMedia`), the card reads
`tiltX`/`tiltY` from `TiltProvider`'s context instead of computing its own
from mouse position, and the existing `drag`/`dragSnapToOrigin`/`dragElastic`
props are removed entirely for the touch path (this is what supersedes the
originally-captured "drag reads as reorderable" problem — solved by removing
drag from touch, not tuning its elasticity).

**Priority cards stay untouched.** The first 2 (above-the-fold, LCP-critical)
cards keep Phase 8's plain `Link`+`Image` treatment with zero Framer Motion —
no gyroscope tilt, no tap fallback, no context subscription. This preserves
the measured Phase 8 LCP win; re-introducing motion cost there for a marginal
visual gain on cards that are barely visible without scrolling wasn't judged
worth it.

## §3 — Verification plan

This project has no test framework (consistent with every prior phase);
verification is manual + build-gated, but this phase needs different manual
checks than Phase 7/8's Lighthouse-only approach, since gyroscope behavior
can't be exercised by headless Chrome at all.

- **Build gate:** `pnpm build` passes after each change, as in every prior
  phase.
- **Layout fixes:** verified visually via Chrome DevTools' device toolbar
  (iPhone SE as the narrowest realistic target, plus a mid-size Android
  width) for each touched page. This is eyeballing rendered layout at real
  breakpoints, not an automated assertion.
- **Gyroscope interaction:** DevTools device emulation cannot simulate real
  device motion. The code will be built defensively (feature-detected,
  graceful fallback at every branch), and the user will need to test the
  actual tilt sensation on a real phone against a Preview deployment — this
  is the one part of Phase 9 that cannot be verified end-to-end by the
  assistant; it can only verify the code paths are wired correctly and that
  every fallback (`'denied'`/`'unsupported'`) degrades safely.
- **Lighthouse re-check:** since `TiltProvider` adds a new listener/context to
  the home grid, re-run the same Phase 7/8 Lighthouse mobile+desktop
  measurement afterward to confirm no regression to the LCP work.

## File structure

**Create:**
- `src/components/film/TiltProvider.tsx` — Context provider + `useTilt()` hook

**Modify:**
- `src/components/film/FilmCardGrid.tsx` — wrap grid content in `<TiltProvider>`
- `src/components/film/InteractiveFilmCard.tsx` — add touch-path (context-driven
  tilt, tap-fallback micro-interaction, first-tap permission request), remove
  `drag`/`dragSnapToOrigin`/`dragElastic` from the touch path
- `src/app/films/[id]/page.tsx` — add a mobile-appropriate poster treatment
- `src/components/ui/Navbar.tsx` / `src/components/ui/NavbarSearch.tsx` —
  fix only if narrow-viewport verification finds a real defect (conditional)
- `src/app/(browse)/page.tsx`, `src/app/search/page.tsx`,
  `src/app/profile/page.tsx` grids — verify only, fix only if a real problem
  is found (conditional)
