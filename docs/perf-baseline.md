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
