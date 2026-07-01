# Phase 9: Mobile Support & Interactive Touch Design Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make CineLog properly support mobile viewports (fixing the confirmed missing-poster defect on the film detail page, verifying Navbar/grids are actually fine) and replace the desktop-only hover-tilt/glare/drag interaction on `InteractiveFilmCard` with a gyroscope-driven touch-native equivalent, so mobile gets an equally crafted interactive experience rather than a stripped-down fallback.

**Architecture:** A new `TiltProvider` Context component wraps the home grid, running exactly one shared `deviceorientation` listener and exposing `tiltX`/`tiltY`/`permissionState`/`requestPermission`/`isTouch` to every card. `InteractiveFilmCard` gains a third render branch (priority-static / desktop-interactive / touch-interactive) alongside targeted layout fixes to `src/app/films/[id]/page.tsx`.

**Tech Stack:** Next.js 16, React 19, Framer Motion v12, the `deviceorientation`/`DeviceOrientationEvent.requestPermission` Web APIs, Lighthouse CLI (for screenshot-based mobile-viewport verification), Puppeteer (temporary, dev-only, for interaction-state screenshots — never committed as a dependency).

**No automated tests.** Consistent with every prior phase — this project has no test framework. Verification is `pnpm build` plus the visual/manual techniques in each task, and an explicit handoff to the user for real-device gyroscope testing (the one thing that cannot be verified by an agent).

**Branching (per explicit user instruction, different from Phase 8):** work happens on a new feature branch created off `develop` (not `main`), and the final task merges that branch directly into `develop` via `git merge` + push — **no GitHub PR for this merge**. Merging `develop` into `main` afterward is explicitly the user's own job, not part of this plan.

**Reference:** Full design at `docs/superpowers/specs/2026-07-01-mobile-support-design.md`.

---

### Task 0: Branch setup — sync `develop`, create feature branch

**Files:** none

- [ ] **Step 1: Confirm clean state on `main`, then sync `develop`**

```bash
cd /Users/jameslee1237/WebstormProjects/CineLog
git checkout main
git status
git pull origin main
```

Expected: clean working tree, `main` up to date (should already include the phase 8 merge, the post-merge production-verification doc, and the phase 9 design doc — 3+ commits since the phase 8 PR was created).

- [ ] **Step 2: Sync `develop` with `main`**

`develop` was created during Phase 8 and has since fallen behind `main` (main gained 2 commits after the Phase 8 PR merged: a production-verification addendum and the Phase 9 design doc, neither of which exist on `develop`).

```bash
git checkout develop
git pull origin develop
git merge main
git push origin develop
```

Expected: a fast-forward or clean merge (no conflicts expected — `develop`'s history is a subset of `main`'s at this point). If a conflict appears, STOP and report — do not resolve blindly.

- [ ] **Step 3: Create the feature branch off the synced `develop`**

```bash
git checkout -b feature/phase-9-mobile-support
git push -u origin feature/phase-9-mobile-support
```

Expected: `Switched to a new branch 'feature/phase-9-mobile-support'`, tracking set up against origin. All subsequent tasks commit here.

---

### Task 1: Verify Navbar + search on mobile viewports

**Files:** none (verification only — code change only if a real defect is found)

This re-confirms a finding already made during planning: Navbar/NavbarSearch have zero responsive Tailwind classes, but a screenshot-based check (both collapsed and search-expanded states, 375px viewport) showed no actual layout problem. This task re-derives that finding independently rather than taking it on faith.

- [ ] **Step 1: Start the dev server**

```bash
cd /Users/jameslee1237/WebstormProjects/CineLog
pnpm dev > /tmp/dev-server.log 2>&1 &
sleep 4
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/ --max-time 10
```

Expected: `200`.

- [ ] **Step 2: Screenshot the default (collapsed search) mobile state via Lighthouse**

```bash
npx --yes lighthouse "http://localhost:3000/" --output=json --output-path=/tmp/lh-navbar-collapsed.json --chrome-flags="--headless --no-sandbox" --quiet
node -e "
const r = require('/tmp/lh-navbar-collapsed.json');
const data = r.audits['final-screenshot'].details.data.replace(/^data:image\/\w+;base64,/, '');
require('fs').writeFileSync('/tmp/navbar-collapsed.png', Buffer.from(data, 'base64'));
console.log('saved');
"
```

Lighthouse's default preset uses a mobile viewport (~375px wide) and its `final-screenshot` audit captures the page's rendered state as a base64 JPEG — this is a working, already-verified technique for visually checking mobile layouts without a headless-browser script. View the resulting `/tmp/navbar-collapsed.png` with your Read tool. Expected: "CineLog" logo, search icon, and "Sign In" button (or "My List" + avatar if a test session is signed in) all visible without overlap or overflow.

- [ ] **Step 3: Screenshot the search-expanded mobile state (requires an interaction, so Lighthouse alone can't do it — install Puppeteer temporarily)**

```bash
cd /Users/jameslee1237/WebstormProjects/CineLog
pnpm add -D puppeteer
```

- [ ] **Step 4: Write and run the interaction screenshot script**

Create a temporary script INSIDE the project directory (Node's ESM resolution needs `node_modules` to be findable from the script's own location — a script outside the repo won't resolve the local `puppeteer` install):

```bash
cat > /Users/jameslee1237/WebstormProjects/CineLog/verify-mobile.mjs << 'EOF'
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
await page.click('button[aria-label="Search"]');
await new Promise((r) => setTimeout(r, 300));
await page.screenshot({ path: '/tmp/navbar-search-expanded.png' });
await browser.close();
console.log('done');
EOF
node /Users/jameslee1237/WebstormProjects/CineLog/verify-mobile.mjs
```

View `/tmp/navbar-search-expanded.png` with your Read tool. Expected: expanded search input box, "CineLog" logo, and "Sign In"/"My List"+avatar all fit comfortably with visible spacing — no cramping, no text/button clipped.

- [ ] **Step 5: Clean up the temporary verification tooling**

```bash
cd /Users/jameslee1237/WebstormProjects/CineLog
rm verify-mobile.mjs
pnpm remove puppeteer
git status
```

Expected: `nothing to commit, working tree clean` — the temporary script and devDependency must not leak into any commit. If `git status` shows `package.json`/`pnpm-lock.yaml` as modified, `pnpm remove puppeteer` didn't fully clean up; investigate before proceeding (check `git diff package.json pnpm-lock.yaml` for leftover entries).

- [ ] **Step 6: Record the outcome**

If both screenshots look correct (no overlap/overflow in either state): no code change needed. Note this finding for Task 7's final report. Do NOT add responsive classes to `Navbar.tsx`/`NavbarSearch.tsx` speculatively — this is a verify-only task, consistent with YAGNI. If a screenshot DOES show a real problem (text clipped, buttons overlapping, input overflowing the viewport), stop and describe exactly what's wrong before making any change — the fix should be scoped to what's actually broken, not a general rewrite.

- [ ] **Step 7: Kill the dev server**

```bash
kill %1 2>/dev/null; true
```

No commit for this task if Step 6 concluded "no code change needed" — there's nothing to commit. If a real defect was found and fixed, commit with a message describing the specific defect and fix.

---

### Task 2: Verify home/search/profile grids on mobile

**Files:** none (verification only — code change only if a real defect is found)

- [ ] **Step 1: Start the dev server (if not already running)**

```bash
cd /Users/jameslee1237/WebstormProjects/CineLog
pnpm dev > /tmp/dev-server.log 2>&1 &
sleep 4
```

- [ ] **Step 2: Screenshot the search and profile pages on mobile**

```bash
npx --yes lighthouse "http://localhost:3000/search?q=obsession" --output=json --output-path=/tmp/lh-search-mobile.json --chrome-flags="--headless --no-sandbox" --quiet
node -e "
const r = require('/tmp/lh-search-mobile.json');
const data = r.audits['final-screenshot'].details.data.replace(/^data:image\/\w+;base64,/, '');
require('fs').writeFileSync('/tmp/search-mobile.png', Buffer.from(data, 'base64'));
console.log('saved');
"
```

View `/tmp/search-mobile.png`. Expected: a 2-column grid of film cards, titles readable, no overflow. The profile page requires an authenticated session (redirects to `/sign-in` otherwise) — skip a live screenshot for it and instead read `src/app/profile/page.tsx` to confirm its grid uses the identical `grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5` pattern already visually confirmed fine for both the home page and search page (same `FilmCard` component, same CSS) — this is a reasonable inference given the pattern is byte-identical, not a full independent visual check.

- [ ] **Step 3: Record the outcome, kill the dev server**

```bash
kill %1 2>/dev/null; true
```

If the search screenshot looks correct and the profile page's grid CSS matches the confirmed-fine pattern: no code change needed, note for Task 7. If a real problem is found, stop and describe it before fixing anything.

---

### Task 3: Fix the film detail page's missing mobile poster

**Files:**
- Modify: `src/app/films/[id]/page.tsx`

- [ ] **Step 1: Screenshot the current (broken) mobile state for a before/after comparison**

```bash
cd /Users/jameslee1237/WebstormProjects/CineLog
pnpm dev > /tmp/dev-server.log 2>&1 &
sleep 4
curl -s http://localhost:3000/ | grep -oE '/films/[0-9]+' | head -1
```

Take note of the movie ID printed (e.g. `/films/1339713`) and use it below.

```bash
npx --yes lighthouse "http://localhost:3000/films/<MOVIE_ID>" --output=json --output-path=/tmp/lh-detail-before.json --chrome-flags="--headless --no-sandbox" --quiet
node -e "
const r = require('/tmp/lh-detail-before.json');
const data = r.audits['final-screenshot'].details.data.replace(/^data:image\/\w+;base64,/, '');
require('fs').writeFileSync('/tmp/detail-before.png', Buffer.from(data, 'base64'));
console.log('saved');
"
```

View `/tmp/detail-before.png`. Expected (confirming the known defect): backdrop image, then title/overview text directly below — no poster visible anywhere.

- [ ] **Step 2: Read the current file**

```bash
cat "src/app/films/[id]/page.tsx"
```

Confirm it matches: a poster wrapper with `hidden md:block w-48 shrink-0`, a `FilmMeta` component wrapper with `flex-1 pt-24 md:pt-0`, and a `FilmDetailSkeleton` with the same `hidden md:block w-48 shrink-0` / `flex-1 pt-24 md:pt-0 space-y-3` pair. If it differs meaningfully, stop and report before proceeding.

- [ ] **Step 3: Apply the fix**

The poster wrapper currently hides the poster below `md` and relies on `FilmMeta`'s `pt-24` to visually compensate for its absence on mobile. The fix shows a smaller poster at every breakpoint instead of hiding it, which means the `pt-24` compensation is no longer needed (the poster's own presence provides the visual balance, exactly as it already does on desktop with `md:pt-0`).

In the main `FilmDetail` function, change:

```tsx
{posterUrl && (
  <div className="hidden md:block w-48 shrink-0">
    {/*
      view-transition-name: FilmCard의 poster-{id}와 일치해야 브라우저가
      카드 → 상세 이동 시 포스터를 자연스럽게 모핑함
    */}
    <div
      className="relative aspect-[2/3] rounded-lg overflow-hidden shadow-2xl"
      style={{ viewTransitionName: `poster-${movieId}` }}
    >
      <Image src={posterUrl} alt={movie.title} fill sizes="192px" className="object-cover" />
    </div>
  </div>
)}
```

to:

```tsx
{posterUrl && (
  <div className="w-28 md:w-48 shrink-0">
    {/*
      view-transition-name: FilmCard의 poster-{id}와 일치해야 브라우저가
      카드 → 상세 이동 시 포스터를 자연스럽게 모핑함.
      모바일에서도 항상 표시(hidden 제거) — 데스크톱보다 작은 크기(w-28)로.
    */}
    <div
      className="relative aspect-[2/3] rounded-lg overflow-hidden shadow-2xl"
      style={{ viewTransitionName: `poster-${movieId}` }}
    >
      <Image
        src={posterUrl}
        alt={movie.title}
        fill
        sizes="(max-width: 767px) 112px, 192px"
        className="object-cover"
      />
    </div>
  </div>
)}
```

- [ ] **Step 4: Remove the now-unnecessary padding compensation on `FilmMeta`**

Change:

```tsx
const FilmMeta = ({ movie }: IFilmMetaProps) => (
  <div className="flex-1 pt-24 md:pt-0">
```

to:

```tsx
const FilmMeta = ({ movie }: IFilmMetaProps) => (
  <div className="flex-1">
```

- [ ] **Step 5: Apply the matching fix to `FilmDetailSkeleton`**

The loading skeleton must visually match the real content's layout — otherwise there's a layout shift the instant real content streams in. Change:

```tsx
const FilmDetailSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-64 md:h-96 w-full bg-gray-800" />
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex gap-6 -mt-24 relative z-10">
        <div className="hidden md:block w-48 shrink-0">
          <div className="aspect-[2/3] rounded-lg bg-gray-700" />
        </div>
        <div className="flex-1 pt-24 md:pt-0 space-y-3">
```

to:

```tsx
const FilmDetailSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-64 md:h-96 w-full bg-gray-800" />
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex gap-6 -mt-24 relative z-10">
        <div className="w-28 md:w-48 shrink-0">
          <div className="aspect-[2/3] rounded-lg bg-gray-700" />
        </div>
        <div className="flex-1 space-y-3">
```

- [ ] **Step 6: Verify the build passes**

```bash
cd /Users/jameslee1237/WebstormProjects/CineLog
pnpm build
```

Expected: `✓ Compiled successfully`, no TypeScript errors.

- [ ] **Step 7: Screenshot the fixed mobile state and compare**

```bash
pnpm dev > /tmp/dev-server.log 2>&1 &
sleep 4
npx --yes lighthouse "http://localhost:3000/films/<MOVIE_ID>" --output=json --output-path=/tmp/lh-detail-after.json --chrome-flags="--headless --no-sandbox" --quiet
node -e "
const r = require('/tmp/lh-detail-after.json');
const data = r.audits['final-screenshot'].details.data.replace(/^data:image\/\w+;base64,/, '');
require('fs').writeFileSync('/tmp/detail-after.png', Buffer.from(data, 'base64'));
console.log('saved');
"
kill %1 2>/dev/null; true
```

View `/tmp/detail-after.png` and compare against `/tmp/detail-before.png`. Expected: a small poster now visible, positioned to the left of the title (overlapping the backdrop edge slightly, matching the desktop layout's visual language at a smaller scale), no layout break, no overlap with the title text.

- [ ] **Step 8: Commit**

```bash
cd /Users/jameslee1237/WebstormProjects/CineLog
git add "src/app/films/[id]/page.tsx"
git commit -m "$(cat <<'EOF'
fix(phase-9): show film poster on mobile detail page

The poster was hidden entirely below the md breakpoint (hidden
md:block), with FilmMeta's pt-24 mobile-only padding compensating
for its absence. Screenshot-verified defect: mobile users saw only
the backdrop and text, no poster at all. Fix: show a smaller poster
(w-28) at every breakpoint instead of hiding it, removing the pt-24
compensation since the poster's own presence now provides the same
visual balance desktop already gets from md:pt-0. Matching fix
applied to FilmDetailSkeleton to avoid a layout shift on load.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Create the `TiltProvider` component

**Files:**
- Create: `src/components/film/TiltProvider.tsx`

- [ ] **Step 1: Write the file**

```tsx
'use client';

import { useMotionValue, useSpring, useTransform, type MotionValue } from 'framer-motion';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

type TPermissionState = 'unknown' | 'granted' | 'denied' | 'unsupported';

interface ITiltContextValue {
  tiltX: MotionValue<number>;
  tiltY: MotionValue<number>;
  permissionState: TPermissionState;
  requestPermission: () => Promise<void>;
  isTouch: boolean;
}

const TiltContext = createContext<ITiltContextValue | null>(null);

export const useTilt = () => {
  const ctx = useContext(TiltContext);
  if (!ctx) throw new Error('useTilt must be used within a TiltProvider');
  return ctx;
};

const TILT_DEG = 15;
const SPRING_CONFIG = { stiffness: 260, damping: 24 };
// 자연스럽게 손에 들고 있을 때 beta(앞뒤 기울기)의 기준값 — 이 각도를 "중립"으로 보고
// 그로부터의 편차만 틸트에 반영. 실기기 테스트 후 조정이 필요할 수 있는 값.
const BETA_BASELINE = 45;
const TILT_RANGE_DEG = 30;
const UNSUPPORTED_TIMEOUT_MS = 1500;

interface ITiltProviderProps {
  children: ReactNode;
}

export const TiltProvider = ({ children }: ITiltProviderProps) => {
  // gamma(좌우 기울기) → rawX, beta(앞뒤 기울기, 기준값 대비 편차) → rawY, 둘 다 -1~1 정규화
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const tiltX = useSpring(useTransform(rawY, [-1, 1], [TILT_DEG, -TILT_DEG]), SPRING_CONFIG);
  const tiltY = useSpring(useTransform(rawX, [-1, 1], [-TILT_DEG, TILT_DEG]), SPRING_CONFIG);

  const [permissionState, setPermissionState] = useState<TPermissionState>('unknown');
  const [isTouch, setIsTouch] = useState(false);
  const listenerAttachedRef = useRef(false);
  const unsupportedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setIsTouch(window.matchMedia('(pointer: coarse)').matches);
  }, []);

  const handleOrientation = useCallback(
    (event: DeviceOrientationEvent) => {
      if (unsupportedTimerRef.current) {
        clearTimeout(unsupportedTimerRef.current);
        unsupportedTimerRef.current = null;
      }
      setPermissionState('granted');
      const gamma = event.gamma ?? 0;
      const beta = event.beta ?? BETA_BASELINE;
      const normalizedX = Math.max(-1, Math.min(1, gamma / TILT_RANGE_DEG));
      const normalizedY = Math.max(-1, Math.min(1, (beta - BETA_BASELINE) / TILT_RANGE_DEG));
      rawX.set(normalizedX);
      rawY.set(normalizedY);
    },
    [rawX, rawY],
  );

  const attachListener = useCallback(() => {
    if (listenerAttachedRef.current) return;
    listenerAttachedRef.current = true;
    window.addEventListener('deviceorientation', handleOrientation);
    // 일정 시간 내 이벤트가 없으면 자이로스코프 미지원(또는 응답 없음)으로 간주
    unsupportedTimerRef.current = setTimeout(() => {
      setPermissionState((current) => (current === 'unknown' ? 'unsupported' : current));
    }, UNSUPPORTED_TIMEOUT_MS);
  }, [handleOrientation]);

  const requestPermission = useCallback(async () => {
    if (permissionState !== 'unknown') return;

    // iOS 13+ Safari는 DeviceOrientationEvent.requestPermission이라는 정적 메서드를
    // 노출하며, 반드시 사용자 제스처(탭) 안에서 호출해야만 권한 다이얼로그가 뜬다.
    // TS DOM 타입에는 이 메서드가 없어 캐스팅이 필요함 — 알려진 타입 간극.
    const OrientationEventWithPermission = window.DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };

    if (typeof OrientationEventWithPermission?.requestPermission === 'function') {
      try {
        const result = await OrientationEventWithPermission.requestPermission();
        if (result === 'granted') {
          attachListener();
        } else {
          setPermissionState('denied');
        }
      } catch {
        setPermissionState('denied');
      }
      return;
    }

    // iOS 13+ 외 브라우저(Android 등)는 명시적 권한 요청 API가 없으므로 바로 리스너 부착
    attachListener();
  }, [permissionState, attachListener]);

  useEffect(() => {
    return () => {
      if (listenerAttachedRef.current) {
        window.removeEventListener('deviceorientation', handleOrientation);
      }
      if (unsupportedTimerRef.current) clearTimeout(unsupportedTimerRef.current);
    };
  }, [handleOrientation]);

  return (
    <TiltContext.Provider value={{ tiltX, tiltY, permissionState, requestPermission, isTouch }}>
      {children}
    </TiltContext.Provider>
  );
};
```

- [ ] **Step 2: Verify the build passes**

```bash
cd /Users/jameslee1237/WebstormProjects/CineLog
pnpm build
```

Expected: `✓ Compiled successfully`, no TypeScript errors. This component isn't used anywhere yet, so this only confirms it compiles in isolation.

- [ ] **Step 3: Commit**

```bash
git add src/components/film/TiltProvider.tsx
git commit -m "$(cat <<'EOF'
feat(phase-9): add TiltProvider for gyroscope-driven mobile tilt

New Context component: a single shared deviceorientation listener
(not one per card) exposing tiltX/tiltY/permissionState/
requestPermission/isTouch. iOS 13+'s explicit requestPermission()
static method is handled (must be called from a user gesture);
other browsers attach the listener directly. Not yet wired into any
component — that's the next task.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Wire `TiltProvider` into `FilmCardGrid`

**Files:**
- Modify: `src/components/film/FilmCardGrid.tsx`

- [ ] **Step 1: Read the current file**

```bash
cat src/components/film/FilmCardGrid.tsx
```

- [ ] **Step 2: Wrap the grid in `TiltProvider`**

Replace the entire contents of `src/components/film/FilmCardGrid.tsx` with:

```tsx
'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { FALLBACK_BLUR } from '@/lib/blur';
import type { ITmdbMovie } from '@/lib/tmdb';
import { InteractiveFilmCard } from './InteractiveFilmCard';
import { TiltProvider } from './TiltProvider';

interface IFilmCardGridProps {
  movies: ITmdbMovie[];
  blurUrls?: (string | null)[];
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

export const FilmCardGrid = ({ movies, blurUrls = [] }: IFilmCardGridProps) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <TiltProvider>
      <motion.div
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
        variants={containerVariants}
        // 모션 감소 설정 시 즉시 최종 상태로 렌더 (애니메이션 완전 생략)
        initial={prefersReducedMotion ? false : 'hidden'}
        animate={prefersReducedMotion ? false : 'visible'}
      >
        {movies.map((movie, index) => (
          <motion.div
            key={movie.id}
            variants={cardVariants}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {/*
              priority는 첫 2장만 — 모바일(2열)의 첫 행과 LCP 후보에 해당.
              6장을 동시에 priority로 걸면 preload 요청이 서로 대역폭을 경쟁해
              실제 LCP 이미지의 로딩이 오히려 늦어짐 (모바일 스로틀링에서 특히 뚜렷)
            */}
            <InteractiveFilmCard
              movie={movie}
              blurDataURL={blurUrls[index] ?? FALLBACK_BLUR}
              priority={index < 2}
            />
          </motion.div>
        ))}
      </motion.div>
    </TiltProvider>
  );
};
```

The only change from the current file is the `TiltProvider` import and wrapping `<TiltProvider>...</TiltProvider>` around the existing `motion.div` grid — nothing else differs.

- [ ] **Step 3: Verify the build passes**

```bash
cd /Users/jameslee1237/WebstormProjects/CineLog
pnpm build
```

Expected: `✓ Compiled successfully`. `InteractiveFilmCard` doesn't call `useTilt()` yet (next task), so this just confirms the wrapping compiles.

- [ ] **Step 4: Commit**

```bash
git add src/components/film/FilmCardGrid.tsx
git commit -m "$(cat <<'EOF'
feat(phase-9): wrap home grid in TiltProvider

InteractiveFilmCard doesn't consume the shared tilt context yet —
that's the next task. This just establishes the provider boundary.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Add the touch-native interaction path to `InteractiveFilmCard`

**Files:**
- Modify: `src/components/film/InteractiveFilmCard.tsx`

- [ ] **Step 1: Read the current file**

```bash
cat src/components/film/InteractiveFilmCard.tsx
```

Confirm it has the 2-way branch from Phase 8 (`if (priority) return <plain Link+Image>; return <desktop motion.div tree>;`). This task adds a third branch for touch, without changing the existing two.

- [ ] **Step 2: Rewrite the file**

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
import { useTilt } from './TiltProvider';

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
  const [isPressed, setIsPressed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  // 드래그 후 click 이벤트 방지 — onDragStart에서 true, onDragEnd 후 50ms 타임아웃으로 리셋
  const hasDraggedRef = useRef(false);

  // 데스크톱 마우스 기반 틸트 + 광택 — 터치 카드는 이 값을 쓰지 않고
  // TiltProvider의 공유 값을 쓰지만, Rules of Hooks 때문에 항상 호출해야 함
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

  const { tiltX: sharedTiltX, tiltY: sharedTiltY, permissionState, requestPermission, isTouch } =
    useTilt();

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

  // 터치 카드 탭: 첫 탭에서 권한 요청(이미 결정된 상태면 내부적으로 즉시 반환) 후 이동.
  // 권한 결과와 무관하게 항상 이동 — 권한은 다음번 카드들의 앰비언트 틸트 여부만 결정.
  const handleTouchTap = useCallback(async () => {
    await requestPermission();
    router.push(`/films/${movie.id}`);
  }, [requestPermission, router, movie.id]);

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
  // 이 카드들이 LCP 후보이므로, motion.div 마운트·layoutId reconciliation·
  // drag 리스너·glare/hover-hint 렌더 등 JSX 트리 비용을 제거해 mobile LCP를
  // 단축한다. 데스크톱/터치 여부와 무관하게 항상 이 정적 버전 — phase 8에서
  // 측정한 LCP 개선을 유지하기 위해 자이로스코프 틸트도 여기엔 적용하지 않음.
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

  // 터치 기기: 자이로스코프 틸트(권한 허용 시 앰비언트 효과) + 탭 피드백(미허용 시
  // scale + 광택 플래시). drag 관련 prop은 전혀 없음 — "드래그가 재배치처럼
  // 보인다"는 원래 phase 9 문제를 드래그 자체를 없애서 해결.
  if (isTouch) {
    return (
      <div>
        <motion.div
          style={{
            rotateX: sharedTiltX,
            rotateY: sharedTiltY,
            transformStyle: 'preserve-3d',
            viewTransitionName: `poster-${movie.id}`,
          }}
          animate={{ scale: isPressed && permissionState !== 'granted' ? 0.96 : 1 }}
          transition={SPRING_CONFIG}
          onTapStart={() => setIsPressed(true)}
          onTap={() => setIsPressed(false)}
          onTapCancel={() => setIsPressed(false)}
          onClick={handleTouchTap}
          className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-gray-800 shadow-lg"
        >
          {posterImage}
          {permissionState !== 'granted' && (
            <motion.div
              className="absolute inset-0 pointer-events-none rounded-xl bg-gradient-to-br from-white/25 via-transparent to-transparent"
              animate={{ opacity: isPressed ? 1 : 0 }}
              transition={{ duration: 0.15 }}
            />
          )}
        </motion.div>
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

Note the desktop branch (final `return`) is byte-for-byte unchanged from before this task — only the `priority` branch's comment was extended (still describes the same behavior) and two new things were added: the `useTilt()` call and the `isTouch` branch between the `priority` check and the desktop return.

- [ ] **Step 3: Verify the build passes**

```bash
cd /Users/jameslee1237/WebstormProjects/CineLog
pnpm build
```

Expected: `✓ Compiled successfully`, no TypeScript errors. Pay particular attention to any error about `DeviceOrientationEvent` or `requestPermission` typing — if TypeScript complains here, the cast in `TiltProvider.tsx` (Task 4) may need adjusting, not this file.

- [ ] **Step 4: Manual sanity check with Chrome DevTools touch emulation**

```bash
pnpm dev > /tmp/dev-server.log 2>&1 &
sleep 4
```

Use the Lighthouse-screenshot technique from Task 1 (mobile preset, `final-screenshot` audit) against `http://localhost:3000/` to confirm: the grid still renders correctly, priority cards (first 2) still show without any motion-related attributes, and non-priority cards render without crashing (DevTools emulation doesn't fire real `deviceorientation` events, so cards will render in their `permissionState !== 'granted'` fallback shape — that's expected and fine to see here; the *ambient tilt itself* cannot be verified this way, only the code paths compiling and rendering without errors).

```bash
kill %1 2>/dev/null; true
```

- [ ] **Step 5: Commit**

```bash
cd /Users/jameslee1237/WebstormProjects/CineLog
git add src/components/film/InteractiveFilmCard.tsx
git commit -m "$(cat <<'EOF'
feat(phase-9): gyroscope tilt + tap fallback on touch devices

Adds a third render branch to InteractiveFilmCard: touch devices
(pointer: coarse) read tiltX/tiltY from TiltProvider's shared
context instead of computing their own from mouse position, with no
drag props at all (drag is fully removed on the touch path, rather
than tuned — this supersedes the originally-captured "drag reads as
reorderable" problem by removing the gesture entirely). When
gyroscope permission isn't granted, tapping plays a scale + brief
glare-flash micro-interaction instead of showing no feedback.
Priority cards are untouched — no gyroscope tilt there, preserving
phase 8's measured LCP win. Desktop's mouse-driven branch is
unchanged.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Full verification pass

**Files:** none

- [ ] **Step 1: Final build check**

```bash
cd /Users/jameslee1237/WebstormProjects/CineLog
pnpm build
```

Expected: `✓ Compiled successfully`, no errors, same route table as before (this phase doesn't change any route's rendering mode).

- [ ] **Step 2: Push the feature branch and get a Preview deployment**

```bash
git push origin feature/phase-9-mobile-support
SHA=$(git rev-parse HEAD)
until GITHUB_TOKEN= gh api repos/jameslee1237/CineLog/deployments --jq ".[] | select(.sha==\"$SHA\") | .id" 2>/dev/null | head -1 | grep -q .; do sleep 5; done
DEPLOY_ID=$(GITHUB_TOKEN= gh api repos/jameslee1237/CineLog/deployments --jq ".[] | select(.sha==\"$SHA\") | .id" | head -1)
until GITHUB_TOKEN= gh api repos/jameslee1237/CineLog/deployments/$DEPLOY_ID/statuses --jq '.[] | select(.state=="success") | .environment_url' 2>/dev/null | head -1 | grep -q .; do sleep 5; done
DEPLOY_URL=$(GITHUB_TOKEN= gh api repos/jameslee1237/CineLog/deployments/$DEPLOY_ID/statuses --jq '.[] | select(.state=="success") | .environment_url' | head -1)
echo "Preview URL: $DEPLOY_URL"
```

(Same deployment-URL-discovery technique established in Phase 8's plan — `GITHUB_TOKEN=` clears a stale env var that otherwise causes 401s.)

- [ ] **Step 3: Check the Preview deployment isn't behind Vercel's Deployment Protection**

```bash
curl -s -o /dev/null -w "%{http_code}\n" "$DEPLOY_URL" --max-time 15
```

If this returns something other than `200` (e.g. a redirect to a Vercel login page), Deployment Protection is active again — the user previously provided a bypass secret for Phase 8 (`x-vercel-protection-bypass` HTTP header, NOT a query param, per Phase 8's plan notes); ask the user for it again if needed, do not guess or hardcode a secret value into any file.

- [ ] **Step 4: Lighthouse regression check (mobile + desktop) against the Preview URL**

```bash
npx --yes lighthouse "$DEPLOY_URL" --output=json --output-path=/tmp/lh-phase9-mobile.json --chrome-flags="--headless --no-sandbox" --quiet
npx --yes lighthouse "$DEPLOY_URL" --output=json --output-path=/tmp/lh-phase9-desktop.json --preset=desktop --chrome-flags="--headless --no-sandbox" --quiet
node -e "
['/tmp/lh-phase9-mobile.json', '/tmp/lh-phase9-desktop.json'].forEach(f => {
  const r = require(f);
  console.log('===', f, '===');
  console.log('Performance:', Math.round(r.categories.performance.score*100));
  console.log('LCP:', r.audits['largest-contentful-paint'].displayValue);
});
"
```

Compare against Phase 8's final production numbers (desktop: Performance 95, LCP 1.4s; mobile warm-run: Performance ~74-80, LCP ~4.6-4.9s). `TiltProvider`'s listener only attaches after a tap, and priority cards are untouched, so this phase should not meaningfully regress either number — but confirm rather than assume, given `useTilt()` is now called by every non-priority card (a new context read on every card, even though its actual cost is negligible — a plain `useContext` call).

- [ ] **Step 5: Report the real-device testing handoff to the user**

This is the one thing that cannot be verified by an agent: the actual feel of the gyroscope tilt. In your final report to the user (not a code change), state clearly: "The gyroscope tilt code is deployed to `$DEPLOY_URL` and built defensively (feature-detected, falls back safely if denied/unsupported), but I cannot test the actual tilt sensation myself — please open this URL on your phone, grant motion permission when prompted (iOS) or just browse (Android), and tell me if the tilt feels good or needs recalibration. Two constants in `TiltProvider.tsx` are the likely tuning knobs if it feels off: `BETA_BASELINE` (45, the assumed 'neutral' holding angle) and `TILT_RANGE_DEG` (30, how much tilt maps to the full ±15° range)."

No commit for this task — it's verification + a handoff note, not a code change.

---

### Task 8: Merge the feature branch into `develop`

**Files:** none

- [ ] **Step 1: Confirm the feature branch is clean and pushed**

```bash
cd /Users/jameslee1237/WebstormProjects/CineLog
git status
git log develop..feature/phase-9-mobile-support --oneline
```

Expected: clean working tree, and the log shows every commit from Tasks 0-6 (branch setup has no commit; any Task 1/2 fixes only if a real defect was found; the poster fix; TiltProvider creation; FilmCardGrid wiring; InteractiveFilmCard touch path).

- [ ] **Step 2: Merge into `develop` directly — no PR**

Per explicit user instruction, this merge does NOT go through a GitHub PR (unlike Phase 8's `develop` → `main` merge, which did and which the user handles personally). This is a direct `git merge` + push:

```bash
git checkout develop
git pull origin develop
git merge feature/phase-9-mobile-support
git push origin develop
```

Expected: a clean merge (no conflicts expected, `develop` hasn't diverged since Task 0 synced it). If a conflict appears, STOP and report — do not resolve blindly.

- [ ] **Step 3: Confirm and stop**

```bash
git log origin/develop -1 --oneline
git status
```

Report the final state to the user. Do **not** merge `develop` into `main`, do not open a PR targeting `main`, do not push to `main` — that is explicitly the user's own job per their instruction at the start of this phase.

---

## Self-Review Notes

**Spec coverage:** §1 (layout audit/fixes) → Tasks 1 (Navbar, verified fine), 2 (grids, verified fine), 3 (film detail poster, confirmed defect + fixed). §2 (gyroscope tilt architecture) → Tasks 4 (TiltProvider), 5 (wiring), 6 (touch path + drag removal + tap fallback + priority-card exclusion). §3 (verification plan) → Task 7, including the explicit real-device-testing handoff the design called for. Branching instruction → Task 0 (sync + branch) and Task 8 (merge to develop only, no PR, no main).

**Placeholder scan:** no TBD/TODO. `<MOVIE_ID>` in Task 3's commands is a real placeholder the implementer fills in from Step 1's own `curl` output within the same task — not a spec gap, since the actual ID is discovered at runtime and can't be hardcoded in the plan.

**Type/name consistency:** `TiltProvider`/`useTilt` names, the `ITiltContextValue` shape (`tiltX`, `tiltY`, `permissionState`, `requestPermission`, `isTouch`), and `InteractiveFilmCard`'s three-branch structure (`priority` / `isTouch` / desktop) are used identically across Tasks 4-6. `BETA_BASELINE`/`TILT_RANGE_DEG` constants introduced in Task 4 are referenced by name (not redefined) in Task 7's handoff note.

**Findings baked in from pre-planning verification:** Tasks 1 and 2 already reflect real screenshot-based findings (Navbar/grids confirmed fine) rather than speculative "audit and see" instructions — the implementer re-derives these findings quickly using the exact same proven technique, rather than starting from zero or blindly trusting the plan's narrative.
