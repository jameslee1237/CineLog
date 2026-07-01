# Performance Baseline

Measured against the production deployment: **https://cine-log-woad.vercel.app**

Tooling: Lighthouse CLI v12 (`npx lighthouse`), run against the live URL — not a local
build, since Vercel's CDN/edge/image-optimization behavior doesn't exist on localhost.

## Desktop (matches README §Lighthouse Checkpoints target: ≥90 overall)

| Metric | Score/Value |
| --- | --- |
| Performance | **97** |
| Accessibility | 100 |
| Best Practices | 77 (see note) |
| SEO | 100 |
| LCP | 1.0s |
| CLS | 0 |
| TBT | 0ms |
| FCP | 0.6s |
| Speed Index | 1.5s |

Desktop comfortably clears the ≥90 target.

## Mobile (Lighthouse default — simulated slow 4G + CPU throttling)

Mobile numbers are intentionally pessimistic (Lighthouse's mobile preset throttles to
roughly a mid-tier phone on a slow connection), tracked separately because most real
users are on faster hardware/networks than this preset simulates.

| Run | Performance | LCP | Notes |
| --- | --- | --- | --- |
| Before fixes | 72 | 6.3s | `priority={index < 6}` — 6 concurrent priority images competing for bandwidth; `fetchPriority` never set despite `priority` |
| After reducing priority count (6 → 2) | 75 | 4.8s | Fewer competing high-priority preloads |
| After adding explicit `fetchPriority="high"` | **80** | **4.6s** | Root cause found and fixed (see below) |

### Root cause found: `priority` ≠ `fetchPriority` in this Next.js version

Lighthouse's LCP discovery audit flagged `fetchpriority=high should be applied` even
though every LCP-candidate `<Image>` had `priority={true}`. Traced into
`next/dist/shared/lib/get-img-props.js`: `fetchPriority` is destructured as a fully
independent prop — `priority` only controls `preload` + `loading="eager"`, it never
derives `fetchPriority`. Fix: pass `fetchPriority={priority ? 'high' : undefined}`
explicitly on every image that also sets `priority`.

### Remaining mobile LCP breakdown (4.6s total)

| Subpart | Duration |
| --- | --- |
| Time to first byte | 942ms |
| Resource load delay | 586ms |
| Resource load duration | 13ms |
| Element render delay | 448ms |

The remaining gap to the 2.5s target is dominated by TTFB and load delay under
throttled network conditions — largely a function of the Vercel serverless
cold-path (RSC render + TMDB fetch + Image Optimization proxy) rather than anything
fixable at the component level. Candidate follow-ups (out of scope for this phase):
ISR/caching the trending-list RSC response, or moving image optimization closer to
the edge. Desktop — representative of most real visitors — already meets target.

## Phase 8: Mobile optimization

Two fixes landed this phase: Navbar `auth()` Suspense isolation (targets TTFB) and
above-fold card simplification (targets element render delay). Both were measured
against **Vercel Preview deployments**, not the production URL used above — the first
time this doc measures against Preview. That matters: see the methodology note below
before reading the numbers as a clean before/after story, because it isn't one.

For reference, the real-user baseline going into this phase (Vercel Speed Insights,
production, p75 mobile) was ~3.68s LCP — noted here since the lab numbers below are
all Preview/simulated and don't supersede it.

### Methodology note: Preview infra, protection bypass, and run-to-run noise

Preview deployments sit behind Vercel's Deployment Protection. The query-param bypass
method silently redirected to a login page and produced garbage Lighthouse numbers —
every number below was only accepted after confirming `finalDisplayedUrl` in the
Lighthouse JSON actually pointed at the app (not the login page). The working method
was the `x-vercel-protection-bypass` HTTP header instead.

Preview infra also shows meaningfully more TTFB variance than the Phase 7 production
baseline. Within each checkpoint below, cold-start TTFB ran 1.4-2x higher than the
warm runs measured immediately after (Checkpoint A: 1097ms → 767ms; Checkpoint B:
1893ms → 803ms). That swing is comparable in magnitude to the effect either fix is
expected to produce, so this section deliberately does **not** present a single
cherry-picked "before → after" LCP number as if it came from a controlled experiment.

### Checkpoint A — after Navbar `auth()` Suspense isolation (Preview)

| Run | Performance | LCP | TTFB |
| --- | --- | --- | --- |
| 1 (cold start) | 77 | 4.8s | 1097ms |
| 2 (warm) | 79 | 4.7s | 787ms |
| 3 (warm) | 80 | 4.6s | 767ms |

Desktop: Performance 94, LCP 1.3s.

This fix targets TTFB specifically. Comparing warm-run TTFB (767-787ms) against the
Phase 7 production baseline's 942ms, Checkpoint A is meaningfully lower — a real,
plausible signal that isolating Navbar's `auth()` call behind Suspense helps. It is
not a perfect apples-to-apples comparison, though, since the baseline was measured on
production and this checkpoint on Preview infra with its own added variance.

### Checkpoint B — after above-fold card simplification (cumulative with Checkpoint A, Preview)

| Run | Performance | LCP | TTFB | Element render delay |
| --- | --- | --- | --- | --- |
| 1 (cold start) | 74 | 4.7s | 1893ms | 230ms |
| 2 (warm) | 79 | 4.6s | 803ms | 159ms |
| 3 (warm) | 77 | 4.9s | 1139ms | 286ms |

Desktop: Performance 93, LCP 1.4s.

This fix targets element render delay specifically (per the code-quality review that
approved the change — see below). Checkpoint B's warm-run element render delay
(159-286ms, average ~222ms) is somewhat lower than what Checkpoint A implies as a
comparison point, but the 159ms-to-286ms swing *within Checkpoint B's own two warm
runs* is nearly as large as any before/after difference. This is a plausible small
improvement, not a clean, statistically confident win.

### Why the card-simplification win is small: a partial optimization

A code-quality review of the card-simplification commit found the fix is **partial**.
For above-the-fold (`priority`) cards, the JSX tree that renders `motion.div`,
`layoutId` reconciliation, drag listeners, and the glare/hover-hint elements is
correctly skipped. But the underlying `useSpring`/`useTransform` hook subscriptions
(Framer Motion's `useInsertionEffect`-driven `attachFollow`) still fire on every
priority-card mount regardless of branch — Rules of Hooks requires calling them
unconditionally, so they can't be conditionally skipped inside the same component.
This is documented directly in code comments in
`src/components/film/InteractiveFilmCard.tsx`. It's a plausible explanation for why
the measured improvement is small and noisy rather than dramatic.

A fuller fix — splitting the component in two (a plain card and a
tilt/glare/drag-enabled card), with the parent grid choosing which one to instantiate
per card — would let the hook-bearing component never mount for priority cards at
all. That's out of scope for this phase; tracked as a follow-up.

### Static/ISR escalation: investigated, not eligible

After isolating Navbar's `auth()`, `pnpm build`'s route table still marks `/` as `ƒ`
(fully dynamic) — the legend is unchanged, with only the one dynamic-rendering line,
no new static/ISR indicator. The likely remaining cause: `ClerkProvider` wraps the
entire tree in `src/app/layout.tsx` (above the `<html>` tag) and is documented to read
the incoming request's auth cookies to bootstrap client-side auth state. That can
force the whole route tree dynamic independent of any individual component's own
`auth()` Suspense isolation. Not pursued further this phase — whether `ClerkProvider`
has an opt-out, or can be scoped more narrowly than the full root layout, is a
candidate for a future phase.

### Deferred to Phase 9

Touch-device interaction redesign is deferred to Phase 9 and already documented in
`docs/superpowers/specs/2026-07-01-mobile-perf-optimization-design.md`.

### Post-merge production verification

Checkpoints A and B above were measured against Vercel Preview deployments. After
merging Phase 8's PR to `main`, re-measured directly against the stable production
alias (`https://cine-log-woad.vercel.app`) — 3 mobile runs, 1 desktop run:

| Run | Performance | LCP | TTFB | Resource load delay | Element render delay |
| --- | --- | --- | --- | --- | --- |
| 1 (cold start) | 71 | 6.1s | 1695ms | 832ms | 535ms |
| 2 (warm) | 74 | 6.0s | 717ms | 867ms | 186ms |
| 3 (warm) | 80 | 4.7s | 707ms | 485ms | 323ms |

Desktop: Performance 95, LCP 1.4s.

Same pattern as the Preview measurements: warm-run TTFB (707-717ms) is consistently
better than the Phase 7 baseline's 942ms — confirms the Navbar fix's effect holds on
real production infra, not just Preview. But the **total LCP metric itself swings far
more than its own breakdown components would suggest** (6.0s → 4.7s between runs 2
and 3, despite nearly identical TTFB in both) — this is Lighthouse's Lantern network
simulation amplifying whatever it samples from the trace, not a real regression. The
breakdown sub-metrics (TTFB, element render delay) are the more trustworthy
signal here than the single "LCP" number, and by that measure the fixes hold up on
production. Desktop remains comfortably at target.

## Best Practices: 77/100 (not actionable)

Both point deductions (`third-party-cookies`, `inspector-issues`) trace entirely to
Clerk's hosted auth domain (`*.clerk.accounts.dev`) setting Cloudflare bot-management
cookies (`__cf_bm`, `_cfuvid`). This is Clerk's infrastructure, not app code — nothing
in this repo can address it without dropping Clerk's hosted UI.

## Bundle size (production, from Lighthouse resource-summary against live deploy)

| Resource type | Requests | Transfer size |
| --- | --- | --- |
| Script | 19 | 615 KB |
| Image | 20 | 453 KB |
| Font | 2 | 52 KB |
| Document (HTML) | 1 | 45 KB |
| Stylesheet | 1 | 7 KB |
| Other | 9 | 18 KB |
| **Total** | **52** | **1,189 KB** |
| — of which third-party (Clerk) | 11 | 357 KB |

`.next/static/chunks` locally totals ~1.2MB uncompressed pre-gzip, consistent with the
~615KB gzipped script transfer above. Clerk's SDK accounts for ~30% of total transfer
— the single biggest lever for further bundle reduction, but replacing a managed auth
provider is out of scope here.

For a deeper per-chunk breakdown: `pnpm analyze` opens an interactive treemap
(`next experimental-analyze`, Turbopack-native — requires a local browser, not
CI-automatable).

## Ongoing monitoring

- **Lighthouse CI** (`.github/workflows/lighthouse.yml`) — runs automatically on every
  successful production deploy, `warn`s (does not fail the build) if Performance,
  Accessibility, or SEO drop below 90 on desktop. Manual trigger via
  `workflow_dispatch` in the Actions tab.
- **Vercel Speed Insights** (`@vercel/speed-insights`) — collects real-user field data
  (actual visitor LCP/CLS/INP) in production, complementing this lab-data snapshot.
  Requires enabling Speed Insights in the Vercel dashboard (Project → Analytics →
  Speed Insights) — data appears there after the package ships to production and
  real traffic accumulates.

## 한국어 요약

프로덕션(Vercel) 배포본을 대상으로 Lighthouse 측정:

- **데스크톱**: Performance 97, LCP 1.0s — README 목표(≥90) 충분히 달성
- **모바일 (스로틀링)**: Performance 72 → 80, LCP 6.3s → 4.6s 로 개선. 원인은 `priority`
  prop이 `fetchPriority`를 자동으로 설정하지 않는 Next.js 동작 — `fetchPriority="high"`
  명시적 추가로 해결. 남은 격차는 서버리스 콜드 패스(TTFB)에 기인하며 이번 phase 범위
  밖 (ISR/캐싱 후속 과제)
- **Best Practices 77/100**: Clerk 호스팅 인증 도메인의 서드파티 쿠키 — 앱 코드로
  해결 불가
- **번들**: 총 1.19MB 전송 (script 615KB, image 453KB) — Clerk SDK가 전체 전송량의
  약 30% 차지
- **상시 모니터링**: Lighthouse CI(배포마다 자동 실행) + Vercel Speed Insights(실사용자
  실측 데이터)
- **Phase 8 (모바일 최적화)**: Navbar `auth()` Suspense 격리 + above-fold 카드 단순화
  적용. Vercel Preview 배포본 대상 측정(프로덕션 대비 TTFB 편차가 크고, 같은 체크포인트
  안에서도 cold-start TTFB가 warm-run 대비 1.4~2배 — 예: Checkpoint A 1097ms→767ms,
  Checkpoint B 1893ms→803ms) — 이 노이즈가 각 수정으로 기대되는 효과 크기와 비슷해서
  단일 before/after 숫자로 "깨끗한" 개선을 주장하지 않음. Navbar 수정은 warm TTFB
  (767~787ms)가 Phase 7 프로덕션 베이스라인(942ms)보다 낮아 실제 개선 가능성이 있는
  신호로 판단. 카드 단순화는 element render delay 타겟이지만 Checkpoint B 자체의 warm
  run 편차(159~286ms)가 개선 폭만큼 커서 "작고 불확실한 개선"으로만 평가 — 코드 리뷰
  결과 `useSpring`/`useTransform` 구독이 Rules of Hooks 때문에 priority 분기와 무관하게
  항상 실행되는 부분적 최적화임이 확인됨(완전한 fix는 컴포넌트 분리, 이번 phase 범위 밖).
  Static/ISR 전환은 조사했으나 아직 불가 — `ClerkProvider`가 루트 레이아웃 전체를
  감싸며 요청 쿠키를 읽어 라우트를 dynamic으로 강제하는 것이 원인으로 추정(후속 phase
  과제). 터치 인터랙션 재설계는 Phase 9로 연기.
