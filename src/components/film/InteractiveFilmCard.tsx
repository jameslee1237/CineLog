'use client';

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FALLBACK_BLUR } from '@/lib/blur';
import { getPosterUrl, type ITmdbMovie } from '@/lib/tmdb';
import { Link, useRouter } from '@/i18n/navigation';
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
  const t = useTranslations('film');
  const router = useRouter();
  const posterUrl = getPosterUrl(movie.poster_path, 'w342');
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  // priority 카드가 LCP 이후 완전한 인터랙티브 버전으로 전환됐는지 여부
  const [isUpgraded, setIsUpgraded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  // 드래그 후 click 이벤트 방지 — onDragStart에서 true, onDragEnd 후 50ms 타임아웃으로 리셋
  const hasDraggedRef = useRef(false);

  // priority 카드: 실제 LCP 이벤트가 관측된 직후에만 업그레이드 — 고정 딜레이 대신
  // PerformanceObserver로 정확한 시점을 잡는다. 이 시점엔 포스터 이미지가 이미
  // 페인트·캐시되어 있어, 이후 motion.div로 감싸는 리마운트가 눈에 보이는 재요청/
  // 재디코드를 유발하지 않는다.
  useEffect(() => {
    if (!priority) return;
    if (typeof PerformanceObserver === 'undefined') {
      // react-hooks/set-state-in-effect: setState는 콜백에서만 호출해야 하므로
      // 폴백 경로도 동기 호출을 피하고 매크로태스크로 미룸
      const timer = setTimeout(() => setIsUpgraded(true), 0);
      return () => clearTimeout(timer);
    }
    const observer = new PerformanceObserver(() => {
      setIsUpgraded(true);
      observer.disconnect();
    });
    observer.observe({ type: 'largest-contentful-paint', buffered: true });
    return () => observer.disconnect();
  }, [priority]);

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
  const handleTouchTap = useCallback(() => {
    void requestPermission();
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
      {t('noPoster')}
    </div>
  );

  // above-the-fold(priority) 카드는 LCP가 관측되기 전까지만 틸트/광택/드래그
  // 트리를 렌더하지 않음 — motion.div 마운트·layoutId reconciliation·drag
  // 리스너·glare/hover-hint 렌더 등 JSX 트리 비용을 제거해 mobile LCP를 단축한다.
  // isUpgraded가 true가 되면(위 useEffect, LCP 관측 직후) 아래 분기로 흘러가
  // 다른 카드와 동일한 인터랙티브 버전이 된다 — 이미지가 이미 페인트·캐시된
  // 이후이므로 이 전환은 LCP 지표에 영향을 주지 않는다.
  if (priority && !isUpgraded) {
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
            <span className="text-xs text-white/80">{t('clickToExpand')}</span>
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
