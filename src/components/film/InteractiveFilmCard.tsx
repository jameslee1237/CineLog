'use client';

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import Image from 'next/image';
import { useCallback, useRef, useState } from 'react';
import { FALLBACK_BLUR } from '@/lib/blur';
import { getPosterUrl, type ITmdbMovie } from '@/lib/tmdb';

interface IInteractiveFilmCardProps {
  movie: ITmdbMovie;
  blurDataURL?: string;
  priority?: boolean;
  isSelected: boolean;
  onSelect: (id: number) => void;
}

const TILT_DEG = 15;
const SPRING_CONFIG = { stiffness: 260, damping: 24 };

export const InteractiveFilmCard = ({
  movie,
  blurDataURL = FALLBACK_BLUR,
  priority = false,
  isSelected,
  onSelect,
}: IInteractiveFilmCardProps) => {
  const posterUrl = getPosterUrl(movie.poster_path, 'w342');
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 마우스 정규화 좌표 → 3D 틸트 + 광택 이동
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const tiltX = useSpring(useTransform(rawY, [-0.5, 0.5], [TILT_DEG, -TILT_DEG]), SPRING_CONFIG);
  const tiltY = useSpring(useTransform(rawX, [-0.5, 0.5], [-TILT_DEG, TILT_DEG]), SPRING_CONFIG);

  // 광택 그라디언트 위치 (마우스 따라 이동)
  const glareX = useTransform(rawX, [-0.5, 0.5], [0, 100]);
  const glareY = useTransform(rawY, [-0.5, 0.5], [0, 100]);
  const glareOpacity = useSpring(0, { stiffness: 200, damping: 20 });
  // hooks 규칙: useTransform은 컴포넌트 최상위에서만 호출 (JSX style 안에서 호출 금지)
  const glareBackground = useTransform(
    [glareX, glareY],
    ([x, y]) =>
      `radial-gradient(circle at ${x as number}% ${y as number}%, rgba(255,255,255,0.24) 0%, transparent 58%)`,
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isSelected) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      rawX.set((e.clientX - rect.left) / rect.width - 0.5);
      rawY.set((e.clientY - rect.top) / rect.height - 0.5);
    },
    [rawX, rawY, isSelected],
  );

  const onMouseEnter = useCallback(() => {
    if (isSelected) return;
    setIsHovered(true);
    glareOpacity.set(1);
  }, [glareOpacity, isSelected]);

  const onMouseLeave = useCallback(() => {
    rawX.set(0);
    rawY.set(0);
    setIsHovered(false);
    glareOpacity.set(0);
  }, [rawX, rawY, glareOpacity]);

  return (
    <div
      ref={containerRef}
      style={{ perspective: '900px' }}
      onMouseMove={onMouseMove}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* layoutId: 이 카드와 확장 오버레이가 같은 layoutId를 공유해서
          클릭 시 카드가 오버레이로 모핑되는 공유 레이아웃 애니메이션 발동 */}
      <motion.div
        layoutId={`card-${movie.id}`}
        drag={!isSelected}
        dragSnapToOrigin
        dragElastic={0.18}
        // 릴리즈 시 통통 튀는 스프링 — 빠르게 던질수록 더 멀리 날아갔다 돌아옴
        dragTransition={{ bounceStiffness: 100, bounceDamping: 10 }}
        whileDrag={{ scale: 1.08, zIndex: 50, cursor: 'grabbing', rotateZ: 3 }}
        whileHover={{ scale: isSelected ? 1 : 1.03 }}
        onClick={() => onSelect(movie.id)}
        style={{
          rotateX: isSelected ? 0 : tiltX,
          rotateY: isSelected ? 0 : tiltY,
          transformStyle: 'preserve-3d',
          cursor: isSelected ? 'default' : 'grab',
        }}
        className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-gray-800 shadow-lg"
      >
        {/* 포스터 이미지 — layoutId로 오버레이에서도 같은 이미지가 모핑 */}
        <motion.div layoutId={`poster-img-${movie.id}`} className="absolute inset-0">
          {posterUrl ? (
            <Image
              src={posterUrl}
              alt={movie.title}
              fill
              className="object-cover"
              priority={priority}
              placeholder="blur"
              blurDataURL={blurDataURL}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
              No poster
            </div>
          )}
        </motion.div>

        {/* 광택 하이라이트 — 마우스 위치에 따라 이동하는 radial gradient */}
        <motion.div
          className="absolute inset-0 pointer-events-none rounded-xl"
          style={{ opacity: glareOpacity, background: glareBackground }}
        />

        {/* 호버 오버레이 — 클릭 힌트 */}
        {isHovered && !isSelected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent flex items-end p-2 pointer-events-none"
          >
            <span className="text-xs text-white/80">클릭해서 펼치기 ↗</span>
          </motion.div>
        )}
      </motion.div>

      {/* 카드 아래 제목 */}
      <motion.div
        layoutId={`card-title-below-${movie.id}`}
        className="mt-2 space-y-0.5"
        animate={{ opacity: 1 }}
      >
        <p className="text-sm font-medium leading-tight line-clamp-2">{movie.title}</p>
        <p className="text-xs text-gray-400">{movie.release_date?.slice(0, 4)}</p>
      </motion.div>
    </div>
  );
};
