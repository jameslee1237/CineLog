# CineLog

A Letterboxd-style film tracker built as an **intentional learning project**. Every phase targets at least one of three deep-dive areas: Core Web Vitals, RSC/Streaming, and Animations.

> Built with Next.js 16 · React 19 · TypeScript · Tailwind CSS · Drizzle ORM · Clerk · TMDB API

Read this in 한국어 → [README.ko.md](README.ko.md)

---

## What This Project Is

CineLog lets you browse trending films, search, view details, mark films as watched, and rate them. The feature set is deliberately scoped — the goal is not to ship a product, but to build a measurable understanding of modern Next.js patterns through a real app.

Each phase ends with a concrete checkpoint so progress is measurable, not just "it works."

---

## Tech Stack

| Area | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Animations | Framer Motion + View Transitions API |
| Data (external) | TMDB API |
| Auth | Clerk |
| Database | Neon PostgreSQL + Drizzle ORM |
| Perf tooling | `@next/bundle-analyzer`, `web-vitals` |
| Deployment | Vercel |

---

## Phase Roadmap

| Phase | Focus | Status |
|---|---|---|
| 0 | Scaffolding — Next.js 16, Clerk, Drizzle, TMDB client | ✅ Done |
| 1 | RSC + Streaming — Suspense boundaries, parallel fetch | ✅ Done |
| 2 | CWV: LCP + CLS — blur placeholder, preconnect, web-vitals | ✅ Done |
| 3 | User tracking — Server Actions, watched list, ratings, `useOptimistic` | ✅ Done |
| 4 | Search + INP — debounce, `useTransition`, RSC search page | ✅ Done |
| 5 | Animations — Framer Motion, View Transitions API, reduced-motion | ✅ Done |
| 6 | Advanced streaming — `proxy.ts`, parallel routes + intercepting modal (`@modal` slot) | ✅ Done |
| 7 | Perf audit — Lighthouse CI, bundle analysis, Speed Insights, `docs/perf-baseline.md` | ✅ Done |
| 8 | Mobile perf — Navbar auth isolation, above-fold card simplification, static/ISR investigated (not yet eligible) | ✅ Done |
| 9 | Mobile UX — layout audit (film detail poster fix), gyroscope-driven touch tilt (`TiltProvider`), priority-card LCP-safe motion upgrade, backdrop aspect-ratio fix | ✅ Done |
| 10 | i18n (EN/KR) — next-intl locale routing, translated UI + Clerk auth, TMDB content localization, EN/KR README split | ✅ Done |

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/jameslee1237/CineLog.git
cd CineLog
pnpm install
```

### 2. Set up environment variables

Copy the template and fill in the values:

```bash
cp .env.local.example .env.local
```

| Variable | Where to get it |
|---|---|
| `TMDB_API_READ_ACCESS_TOKEN` | [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api) — **Read Access Token (v4)** |
| `DATABASE_URL` | [console.neon.tech](https://console.neon.tech) — connection string starting with `postgresql://` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | [dashboard.clerk.com](https://dashboard.clerk.com) |
| `CLERK_SECRET_KEY` | [dashboard.clerk.com](https://dashboard.clerk.com) |

### 3. Push the database schema

```bash
pnpm db:push
```

### 4. Run the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Start local dev server (Turbopack) |
| `pnpm build` | Production build |
| `pnpm start` | Run production build locally |
| `pnpm lint` | ESLint |
| `pnpm analyze` | Build + open bundle analyzer |
| `pnpm db:push` | Push Drizzle schema to Neon (no migration files) |

---

## Project Structure

```
src/
  app/
    [locale]/
      layout.tsx                  # Root layout — Clerk, Navbar, next-intl provider, preconnect, WebVitals
      (browse)/
        page.tsx                  # Trending grid — RSC + Suspense streamed
        @modal/                   # Parallel route slot — film detail intercepting modal
      films/[id]/
        page.tsx                  # Film detail — parallel fetch, skeleton fallback
        actions.ts                # Server Actions — toggleWatched, setRating
      profile/page.tsx            # User collection — watched list with ratings
      search/page.tsx             # Search results page
      sign-in/[[...sign-in]]/     # Clerk sign-in page
      sign-up/[[...sign-up]]/     # Clerk sign-up page
  components/
    film/
      FilmCard.tsx                # Card + blur placeholder + watched badge
      FilmGrid.tsx                # Async RSC grid, parallel blur generation
      FilmGridSkeleton.tsx        # CLS-safe loading fallback
      WatchedButton.tsx           # useOptimistic watched toggle (client)
      RatingWidget.tsx            # useOptimistic star rating 1-5 (client)
    ui/
      Navbar.tsx                  # Sticky header — Clerk UserButton + nav links + LocaleSwitcher
      LocaleSwitcher.tsx          # EN/KR toggle (client)
      WebVitals.tsx               # Client component — logs LCP/CLS/INP in dev
  i18n/
    locales.ts                    # Locale constants — isValidLocale, getNextLocale
    routing.ts                    # next-intl routing config (locales, localePrefix)
    navigation.ts                 # Locale-aware Link/useRouter/usePathname wrappers
    request.ts                    # next-intl request config — resolves locale + loads messages
  lib/
    tmdb.ts                       # Type-safe TMDB fetch client (ITmdb* interfaces, getCurrentTmdbLanguage)
    blur.ts                       # Server-side blur placeholder generator
    db/
      schema.ts                   # Drizzle schema: watched_films + ratings
      index.ts                    # Neon connection
      queries.ts                  # DB query helpers — getWatchedStatus, getRating, etc.
  proxy.ts                        # Clerk + next-intl middleware — route protection + locale routing
messages/
  en.json                         # English message catalog
  kr.json                         # Korean message catalog
```

---

## Key Decisions

**Why `next: { revalidate: 3600 }` instead of `use cache`?**

`use cache` (Next.js 16's new explicit caching model) requires the `cacheComponents` flag, which currently conflicts with `generateMetadata` making async calls outside Suspense. Using `revalidate` achieves the same 1-hour caching behavior with no build errors. Will revisit when the API stabilises.

---

**Why `(browse)` route group?**

The parentheses notation groups files without affecting the URL path — both `app/page.tsx` and `app/(browse)/page.tsx` resolve to `/`. Used here to co-locate browse-specific layouts and loading states separately from the root layout.

---

**Why blur placeholders generated server-side?**

`placeholder="blur"` in `next/image` requires a `blurDataURL` — a base64 string. Generating it client-side would require shipping extra JS. Doing it in the RSC layer means zero client overhead; the tiny w45 TMDB image is fetched and converted to base64 before the HTML is sent.

---

**Why `useOptimistic` for watch/rating?**

`useOptimistic` (React 19) immediately reflects user actions in the UI before the Server Action completes. The button/star updates instantly, then the server confirms (or reverts on error). This keeps INP low — the user sees feedback in under 16ms even when the DB round-trip takes 200ms+.

---

**Why do above-the-fold cards "upgrade" to motion after mount instead of always being static or always animated?**

The first 2 grid cards are the LCP candidates, so phase 7/8 rendered them as plain, motion-free elements to protect that metric. Rather than leaving them permanently inconsistent with the rest of the grid, a `PerformanceObserver` watches for the actual `largest-contentful-paint` entry and flips them to the full interactive treatment (desktop tilt/glare/drag, or mobile's gyroscope tilt) the instant it fires — by then the poster image is already painted and cached, so swapping its wrapper doesn't affect the metric. A fixed delay was considered and rejected: it would either fire before LCP on a slow connection (reintroducing the cost) or unnecessarily late on a fast one.

---

## Lighthouse Checkpoints

Measured after each phase on production (Vercel). Local measurements are not representative because `preconnect` and image CDN latency don't apply.

| Phase | Metric | Target | Measured (desktop, production) |
|---|---|---|---|
| 2 | LCP | < 2.5s | ✅ 1.0s |
| 2 | CLS | < 0.1 | ✅ 0 |
| 4 | INP | < 200ms | ✅ TBT 0ms (lab proxy) — field data via Speed Insights |
| 7 | Overall | ≥ 90 (desktop) | ✅ 97 |
| 8 | Mobile LCP | best-effort toward < 2.5s | partial improvement, noisy — see `docs/perf-baseline.md` §Phase 8 |
| 9 | Real-user score (Vercel Speed Insights) | maintain ≥ 90 both | ✅ mobile 98, desktop 96 (LCP 2.78s) |

Full methodology, mobile-throttled numbers, and the `fetchPriority` fix that closed most of the mobile LCP gap: see [`docs/perf-baseline.md`](docs/perf-baseline.md).

---

## Learning Goals

- **RSC + Streaming** — understand the server/client boundary, Suspense streaming, parallel data fetching
- **Core Web Vitals** — LCP, CLS, INP in a real app with real images and real interactions
- **Animations** — View Transitions API for page-level transitions, Framer Motion for component-level spring physics
