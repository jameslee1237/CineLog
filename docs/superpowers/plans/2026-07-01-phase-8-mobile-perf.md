# Phase 8: Mobile Performance Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close as much as possible of the mobile-throttled Lighthouse LCP gap (currently 4.6s vs. a 2.5s target) by isolating a dynamic-rendering bottleneck in the shared Navbar, removing unnecessary client-side motion setup on above-fold grid cards, and testing whether the browse page can go static/ISR — measuring and documenting the effect of each change independently.

**Architecture:** Three sequential code changes to `src/components/ui/Navbar.tsx`, `src/components/film/InteractiveFilmCard.tsx`, and (conditionally) `src/app/(browse)/page.tsx`, each verified with `pnpm build` and measured with Lighthouse before moving to the next. All work happens on a `develop` branch (created in Task 0) to avoid triggering a production deployment on every measurement cycle — Vercel's GitHub integration automatically creates a **Preview** deployment for non-production branches, each with its own unique URL discoverable via the GitHub Deployments API (no Vercel CLI/token needed). Final task (Task 8) opens a PR from `develop` → `main`; merging is left to the user.

**Tech Stack:** Next.js 16 (App Router, Turbopack), React 19 (Suspense/async Server Components), Framer Motion v12, Vercel (Preview deployments on branch push, Production deployment on merge to `main`), Lighthouse CLI v12, GitHub CLI (`gh`) for deployment-URL discovery.

**Deployment URL discovery (used by every "push and measure" task):** after pushing, resolve the just-created deployment's live URL via the GitHub Deployments API rather than guessing a URL pattern or polling response headers:

```bash
SHA=$(git rev-parse HEAD)
until GITHUB_TOKEN= gh api repos/jameslee1237/CineLog/deployments --jq ".[] | select(.sha==\"$SHA\") | .id" 2>/dev/null | head -1 | grep -q .; do sleep 5; done
DEPLOY_ID=$(GITHUB_TOKEN= gh api repos/jameslee1237/CineLog/deployments --jq ".[] | select(.sha==\"$SHA\") | .id" | head -1)
until GITHUB_TOKEN= gh api repos/jameslee1237/CineLog/deployments/$DEPLOY_ID/statuses --jq '.[] | select(.state=="success") | .environment_url' 2>/dev/null | head -1 | grep -q .; do sleep 5; done
DEPLOY_URL=$(GITHUB_TOKEN= gh api repos/jameslee1237/CineLog/deployments/$DEPLOY_ID/statuses --jq '.[] | select(.state=="success") | .environment_url' | head -1)
echo "Deployment URL: $DEPLOY_URL"
```

`GITHUB_TOKEN=` (empty, trailing space significant) clears a stale env var that otherwise causes `gh` to fail with 401 — confirmed necessary in this environment. This same technique works for both preview (branch push) and production (main push) deployments — it reads whichever deployment matches the current commit SHA, so every "push and measure" task below uses it uniformly and stores the result in `$DEPLOY_URL` for that task's Lighthouse commands.

**Vercel Deployment Protection (discovered during Task 2 execution — read before running any Lighthouse command below):** this project's Preview deployments are gated by Vercel's Deployment Protection (SSO wall) — unauthenticated requests (including Lighthouse's) get redirected to a `vercel.com/login` page instead of reaching the app, silently producing garbage measurements if not checked. Fix: the user generated a "Protection Bypass for Automation" secret (Vercel dashboard → Project Settings → Deployment Protection). It must be passed as an **HTTP header**, not a query param — `?x-vercel-protection-bypass=<secret>` was tested and did NOT work (still redirected to login); `-H "x-vercel-protection-bypass: <secret>"` DID work (confirmed via curl reaching the real `<title>CineLog</title>` page). Every Lighthouse command against a Preview URL in this plan must include:

```bash
--extra-headers='{"x-vercel-protection-bypass":"<secret>"}'
```

The secret itself must never be committed to this repo (it's a live credential) — the controller holds it out-of-band and supplies it directly to whichever subagent runs a Lighthouse command, it does not belong in this file or in any commit message. **Always verify** a Lighthouse run actually reached the app, not a login page, by checking `finalDisplayedUrl` in the output JSON (or `finalUrl` in older Lighthouse versions) equals the deployment URL, not `vercel.com/...` — Task 2 initially produced two fully invalid measurements (Performance 50/LCP 12.1s and Performance 82/LCP 2.4s) that were measurements of the Vercel login page, caught only by checking this field. Production deployments (main branch, e.g. Task 8's post-merge check) are NOT protected this way — this header is only needed for Preview URLs.

**Cold-start variance on Preview deployments:** the first Lighthouse hit against a freshly-created Preview deployment can show a meaningfully worse TTFB than subsequent hits (observed: 1097ms on hit 1 vs. 767–787ms on hits 2–3 against the same URL) as the serverless function warms up. Run Lighthouse mobile at least twice against the same `$DEPLOY_URL` and use the later (warm) result(s), noting the cold-start outlier separately rather than discarding it silently.

**No automated tests.** This project has no test framework configured (`package.json` has no test script; no jest/vitest in devDependencies) and the approved design explicitly scopes this phase to build-verified changes + manual Lighthouse measurement, matching how every prior phase in this project (0–7) was verified. Each task's correctness gate is `pnpm build` (TypeScript + compile check) plus the Lighthouse re-measurement, not unit tests.

**Reference:** Full design at `docs/superpowers/specs/2026-07-01-mobile-perf-optimization-design.md`.

---

### Task 0: Create the `develop` branch

**Files:** none

- [ ] **Step 1: Confirm the working tree is clean and on `main`**

```bash
cd /Users/jameslee1237/WebstormProjects/CineLog
git status
git branch --show-current
```

Expected: `nothing to commit, working tree clean` and current branch is `main`. If not, stop and resolve before proceeding — do not create `develop` from a dirty or unexpected state.

- [ ] **Step 2: Create and switch to `develop`**

```bash
git checkout -b develop
git push -u origin develop
```

Expected: `Switched to a new branch 'develop'` and the push sets up tracking against `origin/develop`. This first push to `develop` will *not* trigger a build measurement — it's identical to the current `main` HEAD, so there's nothing to measure yet. Task 1 begins the actual code changes.

---

### Task 1: Isolate Navbar's `auth()` call into its own Suspense boundary

**Files:**
- Modify: `src/components/ui/Navbar.tsx`

- [ ] **Step 1: Read the current file to confirm it matches this plan's assumptions**

Run: `cat src/components/ui/Navbar.tsx`

Expected: a single `async` function `Navbar` that calls `await auth()` at its top, before any JSX is returned, then conditionally renders `SignInButton`/`UserButton` inline. If the file differs meaningfully from this, stop and re-read the design doc before proceeding — the rest of this task assumes this exact starting shape.

- [ ] **Step 2: Rewrite the file — split into a synchronous shell + an isolated async auth slice**

Replace the entire contents of `src/components/ui/Navbar.tsx` with:

```tsx
import { SignInButton, UserButton } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';
import { Suspense } from 'react';
import { NavbarSearch } from './NavbarSearch';

export const Navbar = () => (
  <header className="sticky top-0 z-50 border-b border-gray-800 bg-gray-950/90 backdrop-blur-sm">
    <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
      <Link href="/" className="text-lg font-bold tracking-tight shrink-0">
        CineLog
      </Link>

      {/*
        NavbarSearch는 useSearchParams를 사용하므로 Suspense가 필요.
        fallback으로 아이콘 버튼을 미리 보여줘서 레이아웃 이동(CLS)을 방지.
      */}
      <div className="flex flex-1">
        <Suspense fallback={<SearchIconFallback />}>
          <NavbarSearch />
        </Suspense>
      </div>

      {/*
        auth()는 동적 API — 이 슬라이스만 별도 Suspense로 감싸서
        로고/검색창 등 나머지 shell이 auth 응답을 기다리지 않고 먼저 flush되도록 함.
        이전에는 Navbar 전체가 async 함수여서 await auth()가 페이지 전체의
        첫 바이트 전송을 막고 있었음.
      */}
      <nav className="ml-auto flex items-center gap-4 shrink-0">
        <Suspense fallback={<AuthSlotFallback />}>
          <NavbarAuthSlot />
        </Suspense>
      </nav>
    </div>
  </header>
);

const NavbarAuthSlot = async () => {
  const { userId } = await auth();

  if (userId) {
    return (
      <>
        <Link href="/profile" className="text-sm text-gray-300 hover:text-white transition-colors">
          My List
        </Link>
        <UserButton />
      </>
    );
  }

  return (
    <SignInButton mode="modal">
      <button className="rounded-full bg-gray-700 px-4 py-1.5 text-sm font-medium hover:bg-gray-600 transition-colors">
        Sign In
      </button>
    </SignInButton>
  );
};

const SearchIconFallback = () => (
  <div className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400">
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <path
        d="M10 6.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Zm-.87 3.72a4.5 4.5 0 1 1 .71-.71l3.1 3.1-.71.7-3.1-3.09Z"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </svg>
  </div>
);

// UserButton 아바타(원형, h-8 w-8)와 Sign In 버튼 중간 정도 너비로 예약 —
// 어느 쪽이 최종적으로 렌더되든 레이아웃 이동을 최소화
const AuthSlotFallback = () => (
  <div className="h-8 w-20 rounded-full bg-gray-800" />
);
```

- [ ] **Step 3: Verify the build passes**

Run: `cd /Users/jameslee1237/WebstormProjects/CineLog && pnpm build`

Expected: `✓ Compiled successfully`, `Finished TypeScript` with no errors, and the route table still lists the same routes as before (all `ƒ` dynamic at this point — that's expected, Task 5 checks whether this changed).

- [ ] **Step 4: Manually sanity-check the rendered markup locally**

Run: `cd /Users/jameslee1237/WebstormProjects/CineLog && pnpm dev &` then, after ~3s, `curl -s http://localhost:3000/ | grep -o '<nav[^>]*>.*</nav>' | head -c 500`

Expected: the `<nav>` element contains either a "Sign In" button or "My List" + Clerk's user button markup — same visible content as before this change, just produced by the new `NavbarAuthSlot` component. Kill the dev server afterward: `kill %1`.

- [ ] **Step 5: Commit**

```bash
cd /Users/jameslee1237/WebstormProjects/CineLog
git add src/components/ui/Navbar.tsx
git commit -m "$(cat <<'EOF'
perf(phase-8): isolate Navbar auth() into its own Suspense boundary

Navbar was a single async component awaiting auth() before returning
any JSX, unwrapped by Suspense, inside the root layout every route
shares. That blocks the first byte flush of every page's HTML response
on auth() resolving, regardless of whether that page has any
personalization. Splitting into a sync shell + an isolated
NavbarAuthSlot (wrapped in its own Suspense) lets everything else
(logo, search) flush immediately.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Deploy and measure the effect of Task 1

**Files:** none (measurement only)

- [ ] **Step 1: Push to `develop` to trigger a Preview deployment**

```bash
cd /Users/jameslee1237/WebstormProjects/CineLog
git push origin develop
```

- [ ] **Step 2: Resolve the preview deployment's URL**

Use the deployment URL discovery technique from this plan's header (Architecture section):

```bash
SHA=$(git rev-parse HEAD)
until GITHUB_TOKEN= gh api repos/jameslee1237/CineLog/deployments --jq ".[] | select(.sha==\"$SHA\") | .id" 2>/dev/null | head -1 | grep -q .; do sleep 5; done
DEPLOY_ID=$(GITHUB_TOKEN= gh api repos/jameslee1237/CineLog/deployments --jq ".[] | select(.sha==\"$SHA\") | .id" | head -1)
until GITHUB_TOKEN= gh api repos/jameslee1237/CineLog/deployments/$DEPLOY_ID/statuses --jq '.[] | select(.state=="success") | .environment_url' 2>/dev/null | head -1 | grep -q .; do sleep 5; done
DEPLOY_URL=$(GITHUB_TOKEN= gh api repos/jameslee1237/CineLog/deployments/$DEPLOY_ID/statuses --jq '.[] | select(.state=="success") | .environment_url' | head -1)
echo "Deployment URL: $DEPLOY_URL"
```

Run this as a single `run_in_background: true` Bash call if your tool supports it — it typically takes 45–90 seconds end to end. Keep the resulting `$DEPLOY_URL` value (it won't persist across separate tool calls/shell sessions — write it down or re-derive it with the same `SHA`/`DEPLOY_ID` lookup in later steps).

- [ ] **Step 3: Run Lighthouse mobile (default/throttled) against the preview URL**

```bash
cd /Users/jameslee1237/WebstormProjects/CineLog
npx --yes lighthouse "$DEPLOY_URL" --output=json --output-path=/tmp/lh-phase8-task1-mobile.json --chrome-flags="--headless --no-sandbox" --quiet
```

- [ ] **Step 4: Run Lighthouse desktop against the preview URL**

```bash
npx --yes lighthouse "$DEPLOY_URL" --output=json --output-path=/tmp/lh-phase8-task1-desktop.json --preset=desktop --chrome-flags="--headless --no-sandbox" --quiet
```

- [ ] **Step 5: Extract and record the metrics**

```bash
node -e "
['/tmp/lh-phase8-task1-mobile.json', '/tmp/lh-phase8-task1-desktop.json'].forEach(f => {
  const r = require(f);
  console.log('===', f, '===');
  console.log('Performance:', Math.round(r.categories.performance.score*100));
  console.log('LCP:', r.audits['largest-contentful-paint'].displayValue);
  const b = r.audits['lcp-breakdown-insight'];
  if (b) b.details.items[0].items.forEach(i => console.log(' ', i.label + ':', Math.round(i.duration)+'ms'));
});
"
```

Write down both Performance scores and LCP values (and the mobile breakdown) somewhere you'll have access to in Task 8 — e.g. append them as a code comment at the bottom of this plan file, or keep the two JSON files around until Task 8 is done. Label this set of numbers **"After Task 1 (Navbar auth isolation)"**.

---

### Task 3: Skip the interactive Framer Motion wrapper on above-fold cards

**Files:**
- Modify: `src/components/film/InteractiveFilmCard.tsx`

- [ ] **Step 1: Read the current file to confirm it matches this plan's assumptions**

Run: `cat src/components/film/InteractiveFilmCard.tsx`

Expected: a single return statement rendering a `motion.div` tree (tilt/glare/drag) unconditionally, regardless of the `priority` prop — `priority` currently only affects the inner `<Image priority fetchPriority>` props, not which JSX tree is rendered.

- [ ] **Step 2: Rewrite the file — branch the returned JSX on `priority`**

Replace the entire contents of `src/components/film/InteractiveFilmCard.tsx` with:

```tsx
'use client';

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';
import { FALLBACK_BLUR } from '@/lib/blur';
import { getPosterUrl, type ITmdbMovie } from '@/lib/tmdb';

interface IInteractiveFilmCardProps {
  movie: ITmdbMovie;
  blurDataURL?: string;
  priority?: boolean;
}

const TILT_DEG = 15;
const SPRING_CONFIG = { stiffness: 260, damping: 24 };

export const InteractiveFilmCard = ({
  movie,
  blurDataURL = FALLBACK_BLUR,
  priority = false,
}: IInteractiveFilmCardProps) => {
  const router = useRouter();
  const posterUrl = getPosterUrl(movie.poster_path, 'w342');
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  // 드래그 후 click 이벤트 방지 — onDragStart에서 true, onDragEnd 후 50ms 타임아웃으로 리셋
  const hasDraggedRef = useRef(false);

  // 마우스 정규화 좌표 → 3D 틸트 + 광택 이동
  // Rules of Hooks: priority 분기와 무관하게 항상 호출. 실제 비용은 아래
  // motion.div 마운트/레이아웃 이펙트에서 발생하므로, priority 카드는
  // 이 값들을 만들어두되 렌더 트리 자체를 가볍게 만들어 비용을 없앤다.
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const tiltX = useSpring(useTransform(rawY, [-0.5, 0.5], [TILT_DEG, -TILT_DEG]), SPRING_CONFIG);
  const tiltY = useSpring(useTransform(rawX, [-0.5, 0.5], [-TILT_DEG, TILT_DEG]), SPRING_CONFIG);

  const glareX = useTransform(rawX, [-0.5, 0.5], [0, 100]);
  const glareY = useTransform(rawY, [-0.5, 0.5], [0, 100]);
  const glareOpacity = useSpring(0, { stiffness: 200, damping: 20 });
  const glareBackground = useTransform(
    [glareX, glareY],
    ([x, y]) =>
      `radial-gradient(circle at ${x as number}% ${y as number}%, rgba(255,255,255,0.24) 0%, transparent 58%)`,
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      rawX.set((e.clientX - rect.left) / rect.width - 0.5);
      rawY.set((e.clientY - rect.top) / rect.height - 0.5);
    },
    [rawX, rawY],
  );

  const onMouseEnter = useCallback(() => {
    setIsHovered(true);
    glareOpacity.set(1);
  }, [glareOpacity]);

  const onMouseLeave = useCallback(() => {
    rawX.set(0);
    rawY.set(0);
    setIsHovered(false);
    glareOpacity.set(0);
  }, [rawX, rawY, glareOpacity]);

  const handleClick = useCallback(() => {
    if (hasDraggedRef.current) return;
    router.push(`/films/${movie.id}`);
  }, [router, movie.id]);

  const posterImage = posterUrl ? (
    <Image
      src={posterUrl}
      alt={movie.title}
      fill
      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
      className="object-cover"
      priority={priority}
      // Next.js 16: priority는 preload+eager만 제어하며 fetchPriority는 별도 opt-in
      fetchPriority={priority ? 'high' : undefined}
      placeholder="blur"
      blurDataURL={blurDataURL}
    />
  ) : (
    <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
      No poster
    </div>
  );

  // above-the-fold(priority) 카드는 틸트/광택/드래그 트리를 렌더하지 않음 —
  // 이 카드들이 LCP 후보이므로, motion.div 마운트·레이아웃 이펙트 비용을
  // 완전히 제거해 mobile LCP를 단축한다. 클릭 시 동작(상세 페이지 이동)은
  // 동일하게 유지하되 드래그가 없으므로 plain Link로 충분.
  if (priority) {
    return (
      <div>
        <Link
          href={`/films/${movie.id}`}
          className="relative block aspect-[2/3] w-full rounded-xl overflow-hidden bg-gray-800 shadow-lg"
          style={{ viewTransitionName: `poster-${movie.id}` }}
        >
          {posterImage}
        </Link>
        <div className="mt-2 space-y-0.5">
          <p className="text-sm font-medium leading-tight line-clamp-2">{movie.title}</p>
          <p className="text-xs text-gray-400">{movie.release_date?.slice(0, 4)}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ perspective: '900px' }}
      onMouseMove={onMouseMove}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <motion.div
        layoutId={`card-${movie.id}`}
        drag
        dragSnapToOrigin
        dragElastic={0.18}
        dragTransition={{ bounceStiffness: 100, bounceDamping: 10 }}
        onDragStart={() => {
          hasDraggedRef.current = true;
        }}
        onDragEnd={() => {
          setTimeout(() => {
            hasDraggedRef.current = false;
          }, 50);
        }}
        whileDrag={{ scale: 1.08, zIndex: 50, cursor: 'grabbing', rotateZ: 3 }}
        whileHover={{ scale: 1.03 }}
        onClick={handleClick}
        style={{
          rotateX: tiltX,
          rotateY: tiltY,
          transformStyle: 'preserve-3d',
          cursor: 'grab',
          // view-transition-name: 상세 페이지로 직접 이동 시 포스터 모핑 (CSS View Transitions API)
          viewTransitionName: `poster-${movie.id}`,
        }}
        className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-gray-800 shadow-lg"
      >
        {/* 포스터 이미지 */}
        <motion.div layoutId={`poster-img-${movie.id}`} className="absolute inset-0">
          {posterImage}
        </motion.div>

        {/* 광택 하이라이트 */}
        <motion.div
          className="absolute inset-0 pointer-events-none rounded-xl"
          style={{ opacity: glareOpacity, background: glareBackground }}
        />

        {/* 호버 힌트 */}
        {isHovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent flex items-end p-2 pointer-events-none"
          >
            <span className="text-xs text-white/80">Click to expand ↗</span>
          </motion.div>
        )}
      </motion.div>

      {/* 카드 아래 제목 */}
      <div className="mt-2 space-y-0.5">
        <p className="text-sm font-medium leading-tight line-clamp-2">{movie.title}</p>
        <p className="text-xs text-gray-400">{movie.release_date?.slice(0, 4)}</p>
      </div>
    </div>
  );
};
```

Note: the two above-fold cards lose the tilt/glare/drag/hover-hint interactivity that other cards keep — this is the intended trade-off from the design (§3), not a bug. `posterImage` is computed once and reused by both branches to avoid duplicating the `<Image>` block.

- [ ] **Step 3: Verify the build passes**

Run: `cd /Users/jameslee1237/WebstormProjects/CineLog && pnpm build`

Expected: `✓ Compiled successfully`, `Finished TypeScript` with no errors.

- [ ] **Step 4: Manually sanity-check locally**

Run: `cd /Users/jameslee1237/WebstormProjects/CineLog && pnpm dev &` then, after ~3s: `curl -s http://localhost:3000/ | grep -c 'motion' ` and separately open `http://localhost:3000/` in a way you can visually confirm (or `curl -s http://localhost:3000/ | grep -o 'poster-[0-9]*' | head -20` to see which movie IDs get the `viewTransitionName` treatment). Confirm the page still renders a 2/3/4/5-column grid of movie cards with posters and titles — no visual regression. Kill the dev server: `kill %1`.

- [ ] **Step 5: Commit**

```bash
cd /Users/jameslee1237/WebstormProjects/CineLog
git add src/components/film/InteractiveFilmCard.tsx
git commit -m "$(cat <<'EOF'
perf(phase-8): skip interactive motion tree on above-fold cards

Every InteractiveFilmCard mounted the full tilt/glare/drag Framer
Motion tree regardless of priority, spending CPU on layoutId
reconciliation, mousemove listeners, and multiple motion.div layers
for cards that are themselves the LCP candidate. Branch the returned
JSX on the existing priority prop: priority cards render a plain
Link+Image, non-priority cards keep the full interactive tree.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Deploy and measure the effect of Task 3

**Files:** none (measurement only)

- [ ] **Step 1: Push to `develop` to trigger a Preview deployment**

```bash
cd /Users/jameslee1237/WebstormProjects/CineLog
git push origin develop
```

- [ ] **Step 2: Resolve the new preview deployment's URL**

Same technique as Task 2 Step 2 — a fresh push produces a new deployment with a new SHA, so re-run the full lookup (don't reuse Task 2's `$DEPLOY_URL`, it points at the old commit):

```bash
SHA=$(git rev-parse HEAD)
until GITHUB_TOKEN= gh api repos/jameslee1237/CineLog/deployments --jq ".[] | select(.sha==\"$SHA\") | .id" 2>/dev/null | head -1 | grep -q .; do sleep 5; done
DEPLOY_ID=$(GITHUB_TOKEN= gh api repos/jameslee1237/CineLog/deployments --jq ".[] | select(.sha==\"$SHA\") | .id" | head -1)
until GITHUB_TOKEN= gh api repos/jameslee1237/CineLog/deployments/$DEPLOY_ID/statuses --jq '.[] | select(.state=="success") | .environment_url' 2>/dev/null | head -1 | grep -q .; do sleep 5; done
DEPLOY_URL=$(GITHUB_TOKEN= gh api repos/jameslee1237/CineLog/deployments/$DEPLOY_ID/statuses --jq '.[] | select(.state=="success") | .environment_url' | head -1)
echo "Deployment URL: $DEPLOY_URL"
```

- [ ] **Step 3: Run Lighthouse mobile against the preview URL (twice — see cold-start note in the plan header)**

The controller supplies the bypass secret directly (never commit it). Run at least twice; use the warmer (second) result as the primary number, note the first as the cold-start data point:

```bash
cd /Users/jameslee1237/WebstormProjects/CineLog
npx --yes lighthouse "$DEPLOY_URL" --output=json --output-path=/tmp/lh-phase8-task3-mobile-1.json --extra-headers='{"x-vercel-protection-bypass":"<secret from controller>"}' --chrome-flags="--headless --no-sandbox" --quiet
npx --yes lighthouse "$DEPLOY_URL" --output=json --output-path=/tmp/lh-phase8-task3-mobile-2.json --extra-headers='{"x-vercel-protection-bypass":"<secret from controller>"}' --chrome-flags="--headless --no-sandbox" --quiet
```

After each run, verify `finalDisplayedUrl` in the output JSON matches `$DEPLOY_URL` (not a `vercel.com` login page) before trusting the numbers.

- [ ] **Step 4: Run Lighthouse desktop against the preview URL**

```bash
npx --yes lighthouse "$DEPLOY_URL" --output=json --output-path=/tmp/lh-phase8-task3-desktop.json --preset=desktop --extra-headers='{"x-vercel-protection-bypass":"<secret from controller>"}' --chrome-flags="--headless --no-sandbox" --quiet
```

- [ ] **Step 5: Extract and record the metrics**

```bash
node -e "
['/tmp/lh-phase8-task3-mobile.json', '/tmp/lh-phase8-task3-desktop.json'].forEach(f => {
  const r = require(f);
  console.log('===', f, '===');
  console.log('Performance:', Math.round(r.categories.performance.score*100));
  console.log('LCP:', r.audits['largest-contentful-paint'].displayValue);
  const b = r.audits['lcp-breakdown-insight'];
  if (b) b.details.items[0].items.forEach(i => console.log(' ', i.label + ':', Math.round(i.duration)+'ms'));
});
"
```

Label this set of numbers **"After Task 3 (above-fold card simplification)"** and keep it for Task 8.

---

### Task 5: Check whether the browse page can go static/ISR

**Files:** none (investigation only — no code changes in this task)

- [ ] **Step 1: Run a clean production build and capture the full output**

```bash
cd /Users/jameslee1237/WebstormProjects/CineLog
pnpm build 2>&1 | tee /tmp/phase8-build-check.txt
```

- [ ] **Step 2: Compare the route table and legend against the known-dynamic baseline**

Run: `cat /tmp/phase8-build-check.txt`

Every build so far in this project's history has shown `/` marked with `ƒ` in the "Route (app)" table, and the legend below it has only ever printed one line: `ƒ  (Dynamic)  server-rendered on demand`. Check specifically for either of these changes:

- The `/` line's leading symbol is no longer `ƒ` (e.g. `○` or `●`), **or**
- The legend below the route table now prints an additional line (e.g. `○  (Static)  prerendered as static content` or similar)

- [ ] **Step 3a: If nothing changed (route is still fully dynamic)**

Do not modify `src/app/(browse)/page.tsx`. This means something else in the shared tree (candidates per the design: `WebVitals`, `SpeedInsights` in `src/app/layout.tsx`, or a dynamic API used inside `FilmGrid`/`getTrending`) still forces the whole route dynamic even with Navbar's auth isolated. Record this finding — you'll write it into `docs/perf-baseline.md` in Task 8 as "static/ISR escalation attempted, not eligible: route table still shows `ƒ` after isolating Navbar auth; further investigation into [name what you found, if anything] out of scope for this phase." Skip to Task 6.

- [ ] **Step 3b: If the route table changed (route is now static/ISR-eligible)**

Add a `revalidate` export to `src/app/(browse)/page.tsx`. Read the current file first:

Run: `cat "src/app/(browse)/page.tsx"`

Then add this line right after the existing imports (before `export default async function BrowsePage`):

```tsx
export const revalidate = 3600; // 1시간마다 재생성 — TMDB trending 데이터도 동일한 revalidate 윈도우 사용
```

- [ ] **Step 4 (only if 3b applied): Verify the build reflects the static/ISR change**

Run: `cd /Users/jameslee1237/WebstormProjects/CineLog && pnpm build`

Expected: `/` now shows the static/ISR indicator identified in Step 2, and the legend includes the corresponding line.

- [ ] **Step 5 (only if 3b applied): Commit**

```bash
cd /Users/jameslee1237/WebstormProjects/CineLog
git add "src/app/(browse)/page.tsx"
git commit -m "$(cat <<'EOF'
perf(phase-8): make browse page static/ISR now that Navbar auth is isolated

With Navbar's auth() call isolated to its own Suspense boundary (see
prior commit), the browse route no longer has an unsuspended dynamic
API call blocking it from static generation. Add revalidate = 3600
so Vercel can serve this route from edge cache instead of computing
it per-request.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

If 3a applied instead (no code change), skip directly to Task 6 — there is nothing to commit for this task.

---

### Task 6: Deploy and measure the effect of Task 5 (only if a commit was made in Task 5)

**Files:** none (measurement only)

Skip this entire task if Task 5 concluded with 3a (no eligibility, no commit). Proceed to Task 7 instead.

- [ ] **Step 1: Push to `develop` to trigger a Preview deployment**

```bash
cd /Users/jameslee1237/WebstormProjects/CineLog
git push origin develop
```

- [ ] **Step 2: Resolve the new preview deployment's URL**

```bash
SHA=$(git rev-parse HEAD)
until GITHUB_TOKEN= gh api repos/jameslee1237/CineLog/deployments --jq ".[] | select(.sha==\"$SHA\") | .id" 2>/dev/null | head -1 | grep -q .; do sleep 5; done
DEPLOY_ID=$(GITHUB_TOKEN= gh api repos/jameslee1237/CineLog/deployments --jq ".[] | select(.sha==\"$SHA\") | .id" | head -1)
until GITHUB_TOKEN= gh api repos/jameslee1237/CineLog/deployments/$DEPLOY_ID/statuses --jq '.[] | select(.state=="success") | .environment_url' 2>/dev/null | head -1 | grep -q .; do sleep 5; done
DEPLOY_URL=$(GITHUB_TOKEN= gh api repos/jameslee1237/CineLog/deployments/$DEPLOY_ID/statuses --jq '.[] | select(.state=="success") | .environment_url' | head -1)
echo "Deployment URL: $DEPLOY_URL"
```

- [ ] **Step 3: Run Lighthouse mobile against the preview URL (twice — see cold-start note in the plan header)**

```bash
cd /Users/jameslee1237/WebstormProjects/CineLog
npx --yes lighthouse "$DEPLOY_URL" --output=json --output-path=/tmp/lh-phase8-task5-mobile-1.json --extra-headers='{"x-vercel-protection-bypass":"<secret from controller>"}' --chrome-flags="--headless --no-sandbox" --quiet
npx --yes lighthouse "$DEPLOY_URL" --output=json --output-path=/tmp/lh-phase8-task5-mobile-2.json --extra-headers='{"x-vercel-protection-bypass":"<secret from controller>"}' --chrome-flags="--headless --no-sandbox" --quiet
```

After each run, verify `finalDisplayedUrl` in the output JSON matches `$DEPLOY_URL`, not a login page.

- [ ] **Step 4: Run Lighthouse desktop against the preview URL**

```bash
npx --yes lighthouse "$DEPLOY_URL" --output=json --output-path=/tmp/lh-phase8-task5-desktop.json --preset=desktop --extra-headers='{"x-vercel-protection-bypass":"<secret from controller>"}' --chrome-flags="--headless --no-sandbox" --quiet
```

- [ ] **Step 5: Extract and record the metrics**

```bash
node -e "
['/tmp/lh-phase8-task5-mobile.json', '/tmp/lh-phase8-task5-desktop.json'].forEach(f => {
  const r = require(f);
  console.log('===', f, '===');
  console.log('Performance:', Math.round(r.categories.performance.score*100));
  console.log('LCP:', r.audits['largest-contentful-paint'].displayValue);
  const b = r.audits['lcp-breakdown-insight'];
  if (b) b.details.items[0].items.forEach(i => console.log(' ', i.label + ':', Math.round(i.duration)+'ms'));
});
"
```

Label this set of numbers **"After Task 5 (static/ISR)"** and keep it for Task 8.

---

### Task 7: Write up results in `docs/perf-baseline.md` and `README.md`

**Files:**
- Modify: `docs/perf-baseline.md`
- Modify: `README.md`

- [ ] **Step 1: Gather the numbers recorded in Tasks 2, 4, and (if it ran) 6**

You need, for mobile and desktop each: Performance score, LCP value, and the mobile LCP breakdown (TTFB / resource load delay / resource load duration / element render delay) from each checkpoint. If Task 6 was skipped (Task 5 concluded 3a), you'll only have two checkpoints (Task 2, Task 4) plus the note about why static/ISR wasn't eligible.

- [ ] **Step 2: Read the current `docs/perf-baseline.md` to find the insertion point**

Run: `cat docs/perf-baseline.md`

Insert the new content as a new `## Phase 8: Mobile optimization` section, placed after the existing `## Mobile (Lighthouse default — simulated slow 4G + CPU throttling)` section and its `### Root cause found` / `### Remaining mobile LCP breakdown` subsections (i.e., right before `## Best Practices: 77/100 (not actionable)`).

- [ ] **Step 3: Insert the Phase 8 section**

Using the Edit tool, insert this block (filling in the `<RECORDED: ...>` markers with the actual numbers from Step 1 — do not leave any `<RECORDED: ...>` marker in the final file):

```markdown
## Phase 8: Mobile optimization

Real-user field data (Vercel Speed Insights) showed mobile p75 LCP of ~3.68s —
confirming the Lighthouse mobile-throttled gap wasn't purely synthetic. This
phase targeted the two biggest levers found in the Phase 7 breakdown: TTFB
(blocked by an unsuspended dynamic API in the shared Navbar) and CPU cost from
mounting full interactive motion trees on the LCP-candidate cards themselves.

| Checkpoint | Mobile Performance | Mobile LCP | Desktop Performance | Desktop LCP |
| --- | --- | --- | --- | --- |
| Phase 7 baseline | 80 | 4.6s | 97 | 1.0s |
| After Navbar auth isolation | <RECORDED: Task 2 mobile perf> | <RECORDED: Task 2 mobile LCP> | <RECORDED: Task 2 desktop perf> | <RECORDED: Task 2 desktop LCP> |
| After above-fold card simplification | <RECORDED: Task 4 mobile perf> | <RECORDED: Task 4 mobile LCP> | <RECORDED: Task 4 desktop perf> | <RECORDED: Task 4 desktop LCP> |
<RECORDED: if Task 6 ran, add a row "| After static/ISR | ... |" here; otherwise omit>

### Navbar `auth()` isolation

`src/components/ui/Navbar.tsx` was a single `async` component awaiting `auth()`
before returning any JSX, unwrapped by Suspense, inside the root layout every
route shares — this blocked the first-byte flush of every page's HTML response
on `auth()` resolving, whether or not that page needed personalization. Split
into a synchronous shell plus an isolated `NavbarAuthSlot` (its own Suspense
boundary), mirroring the existing pattern already used for `NavbarSearch`.

### Above-fold card simplification

`InteractiveFilmCard` mounted the full tilt/glare/drag Framer Motion tree
(motion values, springs, transforms, a `layoutId`-bearing `motion.div`)
regardless of the `priority` prop — spending CPU on cards that are themselves
the LCP candidate. Branched the returned JSX on `priority`: above-fold cards
now render a plain `Link`+`Image`, everything else keeps the full interactive
tree.

### Static/ISR escalation

<RECORDED: if Task 6 ran — "Isolating Navbar's auth() made `/` eligible for
static generation (confirmed via the build output route table). Added
`export const revalidate = 3600` to `src/app/(browse)/page.tsx`.">

<RECORDED: if Task 6 did NOT run — "Checked after the Navbar fix: the browse
route's build output still showed `ƒ` (fully dynamic) — something else in the
shared tree still forces dynamic rendering (candidates: WebVitals/SpeedInsights
in the root layout, or a dynamic API inside FilmGrid's data fetching). Not
pursued further this phase; left for a future investigation.">

### Out of scope (deferred to Phase 9)

Touch-device interaction redesign — see
`docs/superpowers/specs/2026-07-01-mobile-perf-optimization-design.md` for the
captured problem (drag-elastic affordance reads as "reorderable" on touch even
though nothing is).
```

- [ ] **Step 4: Update the Korean summary at the bottom of `docs/perf-baseline.md`**

Find the `## 한국어 요약` section and add one bullet after the existing "모바일 (스로틀링)" bullet, filling in the actual recorded numbers:

```markdown
- **Phase 8 모바일 최적화**: Navbar의 auth() 호출을 분리하고 above-fold 카드의
  인터랙션 트리를 제거해 모바일 LCP를 <RECORDED: Task 2 or Task 4 mobile LCP,
  whichever is the final number> 로 개선 (Phase 7 기준 4.6s 대비)
```

- [ ] **Step 5: Update `README.md`'s Phase Roadmap table**

Run: `grep -n '| 7 | Perf audit' README.md` to find the line, then use Edit to add a new row directly after it:

```markdown
| 8 | Mobile perf — Navbar auth isolation, above-fold card simplification, static/ISR escalation | ✅ Done |
```

- [ ] **Step 6: Update `README.md`'s Lighthouse Checkpoints table**

Run: `grep -n '| 7 | Overall' README.md` to find the line, then use Edit to add a new row directly after it:

```markdown
| 8 | Mobile LCP | best-effort toward < 2.5s | <RECORDED: final mobile LCP from Task 4 or Task 6> — see `docs/perf-baseline.md` §Phase 8 |
```

- [ ] **Step 7: Verify the build still passes**

Run: `cd /Users/jameslee1237/WebstormProjects/CineLog && pnpm build`

Expected: `✓ Compiled successfully`, no errors (these are docs-only changes but this project's convention, established in Phases 1–7, is to always re-verify the build before the final commit of a phase).

- [ ] **Step 8: Commit and push**

```bash
cd /Users/jameslee1237/WebstormProjects/CineLog
git add docs/perf-baseline.md README.md
git commit -m "$(cat <<'EOF'
docs(phase-8): document mobile perf optimization results

Records the before/after Lighthouse numbers for Navbar auth
isolation, above-fold card simplification, and (if it shipped) the
static/ISR escalation. Updates README's phase roadmap and Lighthouse
Checkpoints table to match the pattern established in phase 7.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
git push origin develop
```

---

### Task 8: Open a PR from `develop` to `main`

**Files:** none

- [ ] **Step 1: Confirm `develop` is pushed and up to date**

```bash
cd /Users/jameslee1237/WebstormProjects/CineLog
git status
git log origin/main..develop --oneline
```

Expected: clean working tree, and the log shows every commit made across Tasks 1–7 (Navbar isolation, card simplification, possibly the static/ISR change, and the docs write-up) — this is the full diff the PR will contain.

- [ ] **Step 2: Open the PR**

```bash
GITHUB_TOKEN= gh pr create \
  --base main \
  --head develop \
  --title "Phase 8: Mobile performance optimization" \
  --body "$(cat <<'EOF'
## Summary
- Isolate Navbar's `auth()` call into its own Suspense boundary so it no longer blocks the first-byte flush of every page
- Skip the interactive Framer Motion tilt/glare/drag tree on above-fold grid cards (the LCP candidates)
- (If applicable) make the browse page static/ISR now that Navbar auth is isolated
- Document before/after Lighthouse numbers in `docs/perf-baseline.md`, update `README.md`

See `docs/superpowers/specs/2026-07-01-mobile-perf-optimization-design.md` for the full design and `docs/superpowers/plans/2026-07-01-phase-8-mobile-perf.md` for the implementation plan.

## Test plan
- [x] `pnpm build` passes after every task
- [x] Lighthouse (mobile + desktop) measured against Preview deployments after each change — see `docs/perf-baseline.md` §Phase 8 for the numbers
- [ ] Final production Lighthouse check recommended after merge (Preview and Production run on the same Vercel infra, so numbers should hold, but not yet confirmed against the actual production URL)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 3: Report the PR URL and stop**

`gh pr create` prints the PR URL on success. Report it back and stop here — merging `develop` into `main` is a decision for the human, not something this task automates (per this session's git-safety norms: merges/pushes to `main` need explicit human action or prior explicit consent, and the consent already given for this phase covered `develop`-branch work, not the final merge). After the user merges, a follow-up production Lighthouse check (same commands as Task 2/4/6 but against `https://cine-log-woad.vercel.app` directly) is recommended to confirm the numbers hold — this can be a quick follow-up request rather than part of this plan.

---

## Self-Review Notes

**Spec coverage:** §2 (Navbar isolation) → Tasks 1–2. §3 (above-fold cards) → Tasks 3–4. §4 (gated static/ISR) → Tasks 5–6, with the gate implemented as a build-output check rather than assumed. §5 (verification/documentation) → Task 7, including the Speed Insights p75 anchor and the Phase 9 out-of-scope note captured during brainstorming.

**Placeholder scan:** The `<RECORDED: ...>` markers in Task 7 are not spec/plan placeholders in the forbidden sense — they mark empirically-measured values that don't exist until Tasks 2/4/6 run, with explicit instructions for where each value comes from and an explicit instruction not to leave any marker unfilled in the final committed file.

**Type/name consistency:** `InteractiveFilmCard`'s prop name (`priority`), the `NavbarAuthSlot`/`AuthSlotFallback` names, and the `revalidate` export name are used consistently across every task that references them.

**Branch/PR workflow (added after initial plan draft, per user request):** Task 0 creates `develop`; Tasks 1–7 commit and push to `develop` (never `main`) so every measurement targets a Preview deployment instead of triggering a production deploy per commit; Task 8 opens (but does not merge) a PR from `develop` → `main`, leaving the merge decision and any post-merge production re-verification to the user.
