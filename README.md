# CineLog

A Letterboxd-style film tracker built as an **intentional learning project**. Every phase targets at least one of three deep-dive areas: Core Web Vitals, RSC/Streaming, and Animations.

> Built with Next.js 16 · React 19 · TypeScript · Tailwind CSS · Drizzle ORM · Clerk · TMDB API

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
| 3 | User tracking — Server Actions, watched list, ratings, `useOptimistic` | ⏳ Next |
| 4 | Search + INP — debounce, `useTransition`, RSC search page | ⏳ Planned |
| 5 | Animations — Framer Motion, View Transitions API, reduced-motion | ⏳ Planned |
| 6 | Advanced streaming — PPR, `proxy.ts`, parallel routes | ⏳ Planned |
| 7 | Perf audit — Lighthouse CI, bundle analysis, `docs/perf-baseline.md` | ⏳ Planned |

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
| `TMDB_API_READ_ACCESS_TOKEN` | [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api) — use the **Read Access Token (v4)** |
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
    (browse)/page.tsx          # Trending grid — RSC + Suspense streamed
    films/[id]/page.tsx        # Film detail — parallel fetch, skeleton fallback
    profile/page.tsx           # User collection (Phase 3)
    layout.tsx                 # Root layout — Clerk, preconnect, WebVitals
  components/
    film/
      FilmCard.tsx             # Card + blur placeholder + next/image
      FilmGrid.tsx             # Async RSC grid, parallel blur generation
      FilmGridSkeleton.tsx     # CLS-safe loading fallback
    ui/
      WebVitals.tsx            # Client component — logs LCP/CLS/INP in dev
  lib/
    tmdb.ts                    # Type-safe TMDB fetch client (ITmdb* interfaces)
    blur.ts                    # Server-side blur placeholder generator
    db/
      schema.ts                # Drizzle schema: watched_films + ratings
      index.ts                 # Neon connection
  hooks/                       # (Phase 3+)
```

---

## Key Decisions

**Why `next: { revalidate: 3600 }` instead of `use cache`?**
`use cache` (Next.js 16's new explicit caching model) requires the `cacheComponents` flag, which currently conflicts with `generateMetadata` making async calls outside Suspense. Using `revalidate` achieves the same 1-hour caching behavior with no build errors. Will revisit when the API stabilises.

**Why `(browse)` route group?**
The parentheses notation groups files without affecting the URL path — both `app/page.tsx` and `app/(browse)/page.tsx` resolve to `/`. Used here to co-locate browse-specific layouts and loading states separately from the root layout.

**Why blur placeholders generated server-side?**
`placeholder="blur"` in `next/image` requires a `blurDataURL` — a base64 string. Generating it client-side would require shipping extra JS. Doing it in the RSC layer means zero client overhead; the tiny w45 TMDB image is fetched and converted to base64 before the HTML is sent.

---

## Lighthouse Checkpoints

Measured after each phase on production (Vercel). Local measurements are not representative because `preconnect` and image CDN latency don't apply.

| Phase | Metric | Target |
|---|---|---|
| 2 | LCP | < 2.5s |
| 2 | CLS | < 0.1 |
| 4 | INP | < 200ms |
| 7 | Overall | ≥ 90 (desktop) |

> Local Lighthouse scores will not reflect Phase 2 optimisations. Run measurements on the Vercel deployment after Phase 7.

---

## Learning Goals

- **RSC + Streaming** — understand the server/client boundary, Suspense streaming, parallel data fetching
- **Core Web Vitals** — LCP, CLS, INP in a real app with real images and real interactions
- **Animations** — View Transitions API for page-level transitions, Framer Motion for component-level spring physics
