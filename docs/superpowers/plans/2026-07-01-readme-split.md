# README EN/KR Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the currently inline-bilingual `README.md` into an English-only root README and a standalone, complete Korean README, cross-linked at the top of each.

**Architecture:** Mechanical content split — no code changes. `README.md` keeps every section but drops the Korean half of each bilingual pair. `README.ko.md` is a full Korean counterpart, translating the sections that were previously English-only (tech stack table, commands table, project structure comments, Lighthouse checkpoints table) so it reads as complete on its own, not as a partial mirror.

**Tech Stack:** N/A — documentation only.

**Reference spec:** `docs/superpowers/specs/2026-07-01-i18n-design.md` (section 8)

This plan is independent of `docs/superpowers/plans/2026-07-01-i18n.md` — it can run before, after, or in parallel with the i18n implementation plan. The one place they touch is the Phase Roadmap table row added for Phase 10, which is marked "🚧 In Progress" here since this plan doesn't implement the i18n feature itself.

---

### Task 1: Rewrite `README.md` as English-only

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace the full contents of `README.md`**

```markdown
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
| 10 | i18n (EN/KR) — next-intl locale routing, translated UI + Clerk auth, TMDB content localization, EN/KR README split | 🚧 In Progress |

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
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: strip Korean content from README.md, cross-link README.ko.md"
```

---

### Task 2: Create `README.ko.md`

**Files:**
- Create: `README.ko.md`

Full Korean counterpart. Sections that were previously English-only in the original bilingual README (Tech Stack values, Phase Roadmap focus text, Commands descriptions, Project Structure comments, Lighthouse Checkpoints labels) are translated here so this file is complete on its own, not a partial mirror. Established convention from the original doc (keep English technical terms — RSC, Suspense, LCP, Server Actions, etc. — inline within Korean sentences) is preserved.

- [ ] **Step 1: Create `README.ko.md`**

```markdown
# CineLog

**의도적인 학습 프로젝트**로 만든 Letterboxd 스타일 영화 트래커입니다. 모든 Phase는 Core Web Vitals, RSC/스트리밍, 애니메이션 중 최소 하나의 심화 영역을 목표로 합니다.

> Next.js 16 · React 19 · TypeScript · Tailwind CSS · Drizzle ORM · Clerk · TMDB API 기반

Read this in English → [README.md](README.md)

---

## 프로젝트 소개

CineLog는 트렌딩 영화 탐색, 검색, 상세 보기, 시청 표시, 별점 기록이 가능한 필름 트래커입니다. 기능 범위는 의도적으로 제한되어 있습니다 — 프로덕트 출시가 목적이 아니라, 실제 앱을 통해 현대 Next.js 패턴을 측정 가능한 방식으로 학습하는 것이 목적입니다.

각 Phase는 "동작한다"가 아닌 구체적인 체크포인트로 완료를 정의합니다.

---

## 기술 스택

| 영역 | 선택 |
|---|---|
| 프레임워크 | Next.js 16 (App Router, Turbopack) |
| 언어 | TypeScript |
| 스타일링 | Tailwind CSS v4 |
| 애니메이션 | Framer Motion + View Transitions API |
| 외부 데이터 | TMDB API |
| 인증 | Clerk |
| 데이터베이스 | Neon PostgreSQL + Drizzle ORM |
| 성능 도구 | `@next/bundle-analyzer`, `web-vitals` |
| 배포 | Vercel |

---

## 개발 로드맵

| Phase | 초점 | 상태 |
|---|---|---|
| 0 | 스캐폴딩 — Next.js 16, Clerk, Drizzle, TMDB 클라이언트 | ✅ 완료 |
| 1 | RSC + 스트리밍 — Suspense 경계, 병렬 fetch | ✅ 완료 |
| 2 | CWV: LCP + CLS — blur placeholder, preconnect, web-vitals | ✅ 완료 |
| 3 | 사용자 트래킹 — Server Actions, 시청 목록, 별점, `useOptimistic` | ✅ 완료 |
| 4 | 검색 + INP — 디바운스, `useTransition`, RSC 검색 페이지 | ✅ 완료 |
| 5 | 애니메이션 — Framer Motion, View Transitions API, reduced-motion | ✅ 완료 |
| 6 | 고급 스트리밍 — `proxy.ts`, 병렬 라우트 + 인터셉트 모달 (`@modal` 슬롯) | ✅ 완료 |
| 7 | 성능 감사 — Lighthouse CI, 번들 분석, Speed Insights, `docs/perf-baseline.md` | ✅ 완료 |
| 8 | 모바일 성능 — Navbar 인증 분리, above-fold 카드 단순화, static/ISR 검토(아직 적용 불가) | ✅ 완료 |
| 9 | 모바일 UX — 레이아웃 점검(영화 상세 포스터 수정), 자이로스코프 터치 틸트(`TiltProvider`), priority 카드 LCP-safe 모션 업그레이드, backdrop 비율 수정 | ✅ 완료 |
| 10 | i18n (EN/KR) — next-intl 로케일 라우팅, UI·Clerk 인증 번역, TMDB 콘텐츠 현지화, EN/KR README 분리 | 🚧 진행 중 |

---

## 시작하기

### 1. 클론 및 설치

```bash
git clone https://github.com/jameslee1237/CineLog.git
cd CineLog
pnpm install
```

### 2. 환경 변수 설정

템플릿을 복사하고 값을 채워넣습니다:

```bash
cp .env.local.example .env.local
```

| 변수 | 발급 위치 |
|---|---|
| `TMDB_API_READ_ACCESS_TOKEN` | [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api) — **Read Access Token (v4)** |
| `DATABASE_URL` | [console.neon.tech](https://console.neon.tech) — `postgresql://`로 시작하는 연결 문자열 |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | [dashboard.clerk.com](https://dashboard.clerk.com) |
| `CLERK_SECRET_KEY` | [dashboard.clerk.com](https://dashboard.clerk.com) |

### 3. DB 스키마 푸시

```bash
pnpm db:push
```

### 4. 개발 서버 실행

```bash
pnpm dev
```

[http://localhost:3000](http://localhost:3000) 접속.

---

## 명령어

| 명령어 | 설명 |
|---|---|
| `pnpm dev` | 로컬 개발 서버 시작 (Turbopack) |
| `pnpm build` | 프로덕션 빌드 |
| `pnpm start` | 프로덕션 빌드 로컬 실행 |
| `pnpm lint` | ESLint |
| `pnpm analyze` | 빌드 + 번들 분석기 열기 |
| `pnpm db:push` | Drizzle 스키마를 Neon에 푸시 (마이그레이션 파일 없음) |

---

## 프로젝트 구조

```
src/
  app/
    (browse)/page.tsx          # 트렌딩 그리드 — RSC + Suspense 스트리밍
    films/[id]/page.tsx        # 영화 상세 — 병렬 fetch, skeleton fallback
    films/[id]/actions.ts      # Server Actions — toggleWatched, setRating
    profile/page.tsx           # 사용자 컬렉션 — 별점이 포함된 시청 목록
    sign-in/[[...sign-in]]/    # Clerk 로그인 페이지
    sign-up/[[...sign-up]]/    # Clerk 회원가입 페이지
    layout.tsx                 # 루트 레이아웃 — Clerk, Navbar, preconnect, WebVitals
  components/
    film/
      FilmCard.tsx             # 카드 + blur placeholder + 시청 배지
      FilmGrid.tsx             # 비동기 RSC 그리드, 병렬 blur 생성
      FilmGridSkeleton.tsx     # CLS-safe 로딩 fallback
      WatchedButton.tsx        # useOptimistic 시청 토글 (client)
      RatingWidget.tsx         # useOptimistic 별점 1-5 (client)
    ui/
      Navbar.tsx               # 고정 헤더 — Clerk UserButton + 내비게이션 링크
      WebVitals.tsx            # 클라이언트 컴포넌트 — 개발 모드에서 LCP/CLS/INP 로깅
  lib/
    tmdb.ts                    # 타입 세이프 TMDB fetch 클라이언트 (ITmdb* 인터페이스)
    blur.ts                    # 서버사이드 blur placeholder 생성기
    db/
      schema.ts                # Drizzle 스키마: watched_films + ratings
      index.ts                 # Neon 연결
      queries.ts               # DB 쿼리 헬퍼 — getWatchedStatus, getRating 등
  middleware.ts                # Clerk 미들웨어 — 라우트 보호
```

---

## 설계 결정

**`use cache` 대신 `next: { revalidate: 3600 }`을 쓰는 이유는?**

`use cache`는 `cacheComponents` 플래그가 필요한데, 현재 `generateMetadata`가 Suspense 외부에서 async 호출을 하는 구조와 충돌합니다. `revalidate`로 동일한 1시간 캐싱을 빌드 에러 없이 안정적으로 구현합니다. API가 안정화되면 다시 검토할 예정입니다.

---

**`(browse)` 라우트 그룹을 쓰는 이유는?**

괄호 표기법은 URL에 영향 없이 파일을 그룹화합니다. `app/page.tsx`와 `app/(browse)/page.tsx` 모두 `/`로 해석됩니다. 브라우즈 전용 레이아웃·로딩 상태를 루트 레이아웃과 분리하기 위해 사용합니다.

---

**blur placeholder를 서버사이드에서 생성하는 이유는?**

`next/image`의 `placeholder="blur"`는 base64 문자열인 `blurDataURL`이 필요합니다. 클라이언트에서 생성하면 추가 JS를 배포해야 합니다. RSC 레이어에서 생성하면 클라이언트 오버헤드가 전혀 없습니다 — 작은 w45 TMDB 이미지를 서버에서 fetch해 HTML이 전송되기 전에 base64로 변환합니다.

---

**시청/별점에 `useOptimistic`을 쓰는 이유는?**

`useOptimistic`(React 19)은 Server Action이 완료되기 전에 사용자 액션을 UI에 즉시 반영합니다. 버튼·별점이 즉시 반응하고, 이후 서버가 확정하거나(또는 오류 시 롤백) 처리합니다. DB 왕복이 200ms 이상 걸려도 사용자는 16ms 이내에 피드백을 받으므로 INP가 낮게 유지됩니다.

---

**above-the-fold 카드가 마운트 이후에 모션으로 "업그레이드"되는 이유는? 왜 항상 정적이거나 항상 애니메이션이지 않은가?**

그리드의 첫 2장은 LCP 후보이므로, phase 7/8에서는 이 지표를 보호하기 위해 애니메이션이 없는 순수 정적 엘리먼트로 렌더했습니다. 나머지 카드와 영구히 다르게 두지 않기 위해, `PerformanceObserver`로 실제 `largest-contentful-paint` 이벤트를 관찰하다가 이벤트가 발생하는 즉시 완전한 인터랙티브 버전(데스크톱 틸트/광택/드래그, 모바일 자이로스코프 틸트)으로 전환합니다. 이 시점엔 포스터 이미지가 이미 페인트·캐시되어 있으므로 래퍼를 교체해도 지표에 영향을 주지 않습니다. 고정 딜레이 방식은 검토했지만 배제했습니다 — 느린 네트워크에서는 LCP보다 먼저 발동해 비용이 재도입되고, 빠른 네트워크에서는 불필요하게 늦게 발동하기 때문입니다.

---

## 라이트하우스 체크포인트

각 Phase 이후 프로덕션(Vercel)에서 측정. `preconnect`와 이미지 CDN 지연이 적용되지 않아 로컬 측정값은 대표성이 없습니다.

| Phase | 지표 | 목표 | 측정값 (desktop, production) |
|---|---|---|---|
| 2 | LCP | < 2.5s | ✅ 1.0s |
| 2 | CLS | < 0.1 | ✅ 0 |
| 4 | INP | < 200ms | ✅ TBT 0ms (lab proxy) — 실측 데이터는 Speed Insights 참조 |
| 7 | 종합 | ≥ 90 (desktop) | ✅ 97 |
| 8 | 모바일 LCP | < 2.5s를 향한 best-effort | 일부 개선, 편차 있음 — `docs/perf-baseline.md` §Phase 8 참조 |
| 9 | 실사용자 점수 (Vercel Speed Insights) | 양쪽 모두 ≥ 90 유지 | ✅ 모바일 98, 데스크톱 96 (LCP 2.78s) |

전체 방법론, 모바일 스로틀링 측정값, 모바일 LCP 격차 대부분을 해소한 `fetchPriority` 수정 내용: [`docs/perf-baseline.md`](docs/perf-baseline.md) 참조.

---

## 학습 목표

- **RSC + 스트리밍** — 서버/클라이언트 경계, Suspense 스트리밍, 병렬 데이터 fetch 이해
- **Core Web Vitals** — 실제 이미지·인터랙션이 있는 앱에서 LCP, CLS, INP 최적화
- **애니메이션** — 페이지 전환에는 View Transitions API, 컴포넌트 레벨 스프링 물리는 Framer Motion
```

- [ ] **Step 2: Commit**

```bash
git add README.ko.md
git commit -m "docs: add standalone Korean README"
```

---

### Task 3: Verify

**Files:** none (verification only)

- [ ] **Step 1: Confirm `README.md` has no Korean text**

Run: `grep -n '[가-힣]' README.md`

(Uses a literal Hangul syllable range, not PCRE — works with both BSD `grep` on macOS and GNU `grep`, unlike a `\x{...}`-style Unicode escape which requires `-P` and isn't available on macOS's default `grep`.)

Expected: no output (no Hangul characters remain).

- [ ] **Step 2: Confirm `README.ko.md` renders correctly**

Open `README.ko.md` in a markdown previewer (or GitHub's web UI after pushing) and check tables render correctly and the cross-link to `README.md` works.

- [ ] **Step 3: Confirm the cross-links resolve**

Run: `test -f README.md && test -f README.ko.md && echo "both files exist"`
Expected: `both files exist`. Also manually click both links (`README.md` → `README.ko.md` and back) in a markdown previewer to confirm they resolve to sibling files in the repo root.
