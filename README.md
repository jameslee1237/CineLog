# CineLog

A Letterboxd-style film tracker built as an **intentional learning project**. Every phase targets at least one of three deep-dive areas: Core Web Vitals, RSC/Streaming, and Animations.

> Built with Next.js 16 · React 19 · TypeScript · Tailwind CSS · Drizzle ORM · Clerk · TMDB API

---

## What This Project Is / 프로젝트 소개

**EN**
CineLog lets you browse trending films, search, view details, mark films as watched, and rate them. The feature set is deliberately scoped — the goal is not to ship a product, but to build a measurable understanding of modern Next.js patterns through a real app.

Each phase ends with a concrete checkpoint so progress is measurable, not just "it works."

**KR**
CineLog는 트렌딩 영화 탐색, 검색, 상세 보기, 시청 표시, 별점 기록이 가능한 필름 트래커입니다. 기능 범위는 의도적으로 제한되어 있습니다 — 프로덕트 출시가 목적이 아니라, 실제 앱을 통해 현대 Next.js 패턴을 측정 가능한 방식으로 학습하는 것이 목적입니다.

각 Phase는 "동작한다"가 아닌 구체적인 체크포인트로 완료를 정의합니다.

---

## Tech Stack / 기술 스택

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

## Phase Roadmap / 개발 로드맵

| Phase | Focus | Status |
|---|---|---|
| 0 | Scaffolding — Next.js 16, Clerk, Drizzle, TMDB client | ✅ Done |
| 1 | RSC + Streaming — Suspense boundaries, parallel fetch | ✅ Done |
| 2 | CWV: LCP + CLS — blur placeholder, preconnect, web-vitals | ✅ Done |
| 3 | User tracking — Server Actions, watched list, ratings, `useOptimistic` | ✅ Done |
| 4 | Search + INP — debounce, `useTransition`, RSC search page | ⏳ Planned |
| 5 | Animations — Framer Motion, View Transitions API, reduced-motion | ⏳ Planned |
| 6 | Advanced streaming — PPR, `proxy.ts`, parallel routes | ⏳ Planned |
| 7 | Perf audit — Lighthouse CI, bundle analysis, `docs/perf-baseline.md` | ⏳ Planned |

---

## Getting Started / 시작하기

### 1. Clone and install / 클론 및 설치

```bash
git clone https://github.com/jameslee1237/CineLog.git
cd CineLog
pnpm install
```

### 2. Set up environment variables / 환경 변수 설정

Copy the template and fill in the values:

```bash
cp .env.local.example .env.local
```

| Variable | Where to get it / 발급 위치 |
|---|---|
| `TMDB_API_READ_ACCESS_TOKEN` | [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api) — **Read Access Token (v4)** |
| `DATABASE_URL` | [console.neon.tech](https://console.neon.tech) — `postgresql://`로 시작하는 연결 문자열 |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | [dashboard.clerk.com](https://dashboard.clerk.com) |
| `CLERK_SECRET_KEY` | [dashboard.clerk.com](https://dashboard.clerk.com) |

### 3. Push the database schema / DB 스키마 푸시

```bash
pnpm db:push
```

### 4. Run the dev server / 개발 서버 실행

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Commands / 명령어

| Command | What it does / 설명 |
|---|---|
| `pnpm dev` | Start local dev server (Turbopack) |
| `pnpm build` | Production build / 프로덕션 빌드 |
| `pnpm start` | Run production build locally |
| `pnpm lint` | ESLint |
| `pnpm analyze` | Build + open bundle analyzer |
| `pnpm db:push` | Push Drizzle schema to Neon (no migration files) |

---

## Project Structure / 프로젝트 구조

```
src/
  app/
    (browse)/page.tsx          # Trending grid — RSC + Suspense streamed
    films/[id]/page.tsx        # Film detail — parallel fetch, skeleton fallback
    films/[id]/actions.ts      # Server Actions — toggleWatched, setRating
    profile/page.tsx           # User collection — watched list with ratings
    sign-in/[[...sign-in]]/    # Clerk sign-in page
    sign-up/[[...sign-up]]/    # Clerk sign-up page
    layout.tsx                 # Root layout — Clerk, Navbar, preconnect, WebVitals
  components/
    film/
      FilmCard.tsx             # Card + blur placeholder + watched badge
      FilmGrid.tsx             # Async RSC grid, parallel blur generation
      FilmGridSkeleton.tsx     # CLS-safe loading fallback
      WatchedButton.tsx        # useOptimistic watched toggle (client)
      RatingWidget.tsx         # useOptimistic star rating 1-5 (client)
    ui/
      Navbar.tsx               # Sticky header — Clerk UserButton + nav links
      WebVitals.tsx            # Client component — logs LCP/CLS/INP in dev
  lib/
    tmdb.ts                    # Type-safe TMDB fetch client (ITmdb* interfaces)
    blur.ts                    # Server-side blur placeholder generator
    db/
      schema.ts                # Drizzle schema: watched_films + ratings
      index.ts                 # Neon connection
      queries.ts               # DB query helpers — getWatchedStatus, getRating, etc.
  middleware.ts                # Clerk middleware — route protection
```

---

## Key Decisions / 설계 결정

**Why `next: { revalidate: 3600 }` instead of `use cache`?**

EN: `use cache` (Next.js 16's new explicit caching model) requires the `cacheComponents` flag, which currently conflicts with `generateMetadata` making async calls outside Suspense. Using `revalidate` achieves the same 1-hour caching behavior with no build errors. Will revisit when the API stabilises.

KR: `use cache`는 `cacheComponents` 플래그가 필요한데, 현재 `generateMetadata`가 Suspense 외부에서 async 호출을 하는 구조와 충돌합니다. `revalidate`로 동일한 1시간 캐싱을 안정적으로 구현합니다.

---

**Why `(browse)` route group?**

EN: The parentheses notation groups files without affecting the URL path — both `app/page.tsx` and `app/(browse)/page.tsx` resolve to `/`. Used here to co-locate browse-specific layouts and loading states separately from the root layout.

KR: 괄호 표기법은 URL에 영향 없이 파일을 그룹화합니다. 브라우즈 전용 레이아웃·로딩 상태를 루트 레이아웃과 분리하기 위해 사용합니다.

---

**Why blur placeholders generated server-side?**

EN: `placeholder="blur"` in `next/image` requires a `blurDataURL` — a base64 string. Generating it client-side would require shipping extra JS. Doing it in the RSC layer means zero client overhead; the tiny w45 TMDB image is fetched and converted to base64 before the HTML is sent.

KR: `next/image`의 `placeholder="blur"`는 base64 `blurDataURL`이 필요합니다. RSC 레이어에서 생성하면 클라이언트 JS 번들에 추가 비용이 없습니다. w45 TMDB 이미지를 서버에서 base64로 변환해 HTML에 인라인합니다.

---

**Why `useOptimistic` for watch/rating?**

EN: `useOptimistic` (React 19) immediately reflects user actions in the UI before the Server Action completes. The button/star updates instantly, then the server confirms (or reverts on error). This keeps INP low — the user sees feedback in under 16ms even when the DB round-trip takes 200ms+.

KR: `useOptimistic`(React 19)은 Server Action 완료 전에 UI를 즉시 업데이트합니다. 버튼·별점이 즉시 반응하고 서버가 이후 확정(또는 오류 시 롤백)합니다. DB 왕복이 200ms 이상 걸려도 사용자는 16ms 이내에 피드백을 받습니다.

---

## Lighthouse Checkpoints / 라이트하우스 체크포인트

Measured after each phase on production (Vercel). Local measurements are not representative because `preconnect` and image CDN latency don't apply.

| Phase | Metric | Target |
|---|---|---|
| 2 | LCP | < 2.5s |
| 2 | CLS | < 0.1 |
| 4 | INP | < 200ms |
| 7 | Overall | ≥ 90 (desktop) |

> Local Lighthouse scores will not reflect Phase 2 optimisations. Run measurements on the Vercel deployment after Phase 7.

---

## Learning Goals / 학습 목표

**EN**
- **RSC + Streaming** — understand the server/client boundary, Suspense streaming, parallel data fetching
- **Core Web Vitals** — LCP, CLS, INP in a real app with real images and real interactions
- **Animations** — View Transitions API for page-level transitions, Framer Motion for component-level spring physics

**KR**
- **RSC + 스트리밍** — 서버/클라이언트 경계, Suspense 스트리밍, 병렬 데이터 fetch 이해
- **Core Web Vitals** — 실제 이미지·인터랙션이 있는 앱에서 LCP, CLS, INP 최적화
- **애니메이션** — 페이지 전환에는 View Transitions API, 컴포넌트 레벨 스프링 물리는 Framer Motion
