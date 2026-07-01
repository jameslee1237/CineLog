# Phase 8: Mobile Performance Optimization — Design

## Goal & scope

Phase 7's baseline (`docs/perf-baseline.md`) found desktop Lighthouse comfortably
clears the README's `< 2.5s` LCP target (1.0s measured), but mobile-throttled
Lighthouse showed 4.6s after the Phase 7 `fetchPriority` fix — still well above
target. Real-user data via Vercel Speed Insights confirms this isn't purely a
synthetic-throttling artifact: actual mobile visitors see a p75 LCP of ~3.68s,
also above the 2.5s target, just less severely than Lighthouse's pessimistic
profile.

This phase targets closing that gap with a best-effort-and-document approach
(same pattern as Phase 7): apply the highest-leverage fixes we can identify,
re-measure after each, and honestly document what remains and why if we don't
fully close the gap. No hard pass/fail number gate.

**Explicitly out of scope**: redesigning touch-device interactions (tilt/glare/drag
on `InteractiveFilmCard` for touch/coarse-pointer devices). That's reserved for
Phase 9 — this phase's above-fold fix (§3) is scoped by vertical position, not
input type, so it doesn't preempt that later work.

**Captured problem for Phase 9** (not addressed here): on touch devices, the
`dragElastic={0.18}` + `dragSnapToOrigin` gesture reads as "this card is
draggable/reorderable" because touch is direct-manipulation — a finger physically
moving the element implies it can be relocated, unlike the same elastic wobble
under a mouse cursor, which reads as decorative feedback. Nothing is actually
reorderable; the card always springs back. Phase 9 should address this, likely by
shrinking or disabling `drag` under a `pointer: coarse` media query rather than
tuning the elastic constant further — the affordance itself doesn't earn its
keep on touch.

## §2 — Isolate the Navbar's `auth()` call

**Problem**: `src/components/ui/Navbar.tsx`'s top-level `Navbar` component is
`async` and does `await auth()` directly, then returns JSX. It's rendered
unwrapped (no `Suspense`) inside `src/app/layout.tsx`, the root layout shared by
every route. In Next.js's streaming SSR model, an un-suspended dynamic API call
blocks the *first flush* of the HTML response — the server can't send any bytes,
including the static header/logo/shell, until that `auth()` promise resolves.
This is a plausible concrete contributor to the 942ms TTFB Lighthouse measured on
every route, personalized or not.

**Fix**: split `Navbar` into a static shell plus an isolated async slice for just
the auth-dependent UI (Sign In button vs. My List link + UserButton):

```tsx
export const Navbar = () => (
  <header className="...">
    <Link href="/">CineLog</Link>
    <Suspense fallback={<SearchIconFallback />}>
      <NavbarSearch />
    </Suspense>
    <nav>
      <Suspense fallback={<AuthSlotFallback />}>
        <NavbarAuthSlot />
      </Suspense>
    </nav>
  </header>
);

async function NavbarAuthSlot() {
  const { userId } = await auth();
  return userId ? (
    <>
      <Link href="/profile">My List</Link>
      <UserButton />
    </>
  ) : (
    <SignInButton mode="modal">...</SignInButton>
  );
}
```

This mirrors the existing pattern already used for `NavbarSearch` (suspended for
a different reason — client-side `useSearchParams()` requirement). `Navbar`
itself becomes a plain, synchronous component; nothing above the auth slice
blocks the initial flush.

**Mechanism, precisely**: this is not "avoid awaiting" — it's "scope the await's
blast radius to the smallest UI slice that actually needs it." Everything that
doesn't need `auth()` (logo, header shell, search) renders and flushes
immediately; only the small nav slice streams in after `auth()` resolves.

**Expected effect**: standalone win regardless of §4 — should reduce TTFB purely
from unblocking the stream, with no caching-model change required.

**CLS note**: `AuthSlotFallback` must reserve the same width/height as the
resolved UI (Sign In button or UserButton avatar) to avoid a layout shift when
the slice streams in — same reasoning as the existing `SearchIconFallback`.

## §3 — Above-the-fold cards skip the interactive wrapper

**Problem**: `InteractiveFilmCard` receives a `priority` boolean (`true` for
`index < 2`, from the Phase 7 fix). Regardless of `priority`, every card mounts
the full tilt/glare/drag Framer Motion tree: `useMotionValue`, two `useSpring`s,
three `useTransform`s, mousemove listeners, and a `layoutId`-bearing
`motion.div`. That's CPU work competing directly with LCP paint on a throttled
device — spent on the exact cards most likely to *be* the LCP element.

**Fix**: reuse the existing `priority` prop to branch the *returned JSX*, not to
skip hooks (Rules of Hooks still requires calling them unconditionally regardless
of branch). When `priority` is `true`, render a plain `<Link><Image /></Link>` —
no `motion.div`, no mouse listeners, no glare gradient, no drag. When `priority`
is `false` (every card below the first two), render the full interactive tree as
today. Both branches share the same poster `<Image>` props (`sizes`, `blurDataURL`,
`fetchPriority`) so there's no visual difference between branches — only less JS
execution for the top 2 cards.

**Scope note**: this branches on vertical position (above/below fold), not input
type (mouse/touch) — orthogonal to Phase 9's planned touch-device redesign.

## §4 — Escalation: static/ISR conversion of the browse page

**Gated on §2.** Once Navbar's `auth()` is isolated, verify via `pnpm build`
whether `src/app/(browse)/page.tsx` becomes static-eligible — check the route
table for `/` flipping from `ƒ` (dynamic) to a static/ISR indicator.

**If it flips**: add `export const revalidate = 3600` at the page level. Vercel
can then serve `/` from its edge cache instead of computing it per-request —
near-zero TTFB for that route specifically.

**If it doesn't flip**: something else in the tree still forces dynamic
rendering (candidates to check: `WebVitals`/`SpeedInsights` in the shared
layout, or `FilmGrid`'s data fetching). Stop, document what's still blocking it,
and leave full static conversion as a future phase. Do **not** re-attempt
`cacheComponents`/PPR in this phase — Phase 6 already shelved that path due to a
`generateMetadata` conflict; §4 tests whether plain ISR (`revalidate`) achieves
the same effect without touching that flag at all.

**Explicitly out of scope for §4**: any change to `generateMetadata` or the film
detail page (`src/app/films/[id]/page.tsx`).

## §5 — Verification & measurement

Same before/after methodology as Phase 7: run Lighthouse (mobile + desktop
presets) against the live production URL at three checkpoints —

1. Before any change (already captured in Phase 7's baseline: mobile 80/LCP
   4.6s, desktop 97/LCP 1.0s)
2. After §2 (Navbar auth isolation) ships and redeploys
3. After §3 (above-fold card simplification) ships and redeploys

— so improvement can be attributed to each fix independently rather than one
lump before/after. §4 (static/ISR) gets its own before/after checkpoint only if
it actually ships, gated by the §4 build-output check.

**Deliverable**: extend `docs/perf-baseline.md` with a "Phase 8" section
following the existing table format (mirroring the Phase 7 `fetchPriority`
root-cause writeup style), including the real Speed Insights p75 mobile LCP
(3.68s baseline) as the field-data anchor alongside Lighthouse lab numbers.
Update README's Lighthouse Checkpoints table and phase roadmap same as every
prior phase.

**No new automated tests** — this is a performance-instrumentation task,
verified the same way Phase 7 was (build passes + Lighthouse re-runs against
production, no unit tests added).
