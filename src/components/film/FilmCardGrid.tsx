'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useState, useCallback } from 'react';
import { FALLBACK_BLUR } from '@/lib/blur';
import type { ITmdbMovie } from '@/lib/tmdb';
import { InteractiveFilmCard } from './InteractiveFilmCard';
import { FilmCardExpanded } from './FilmCardExpanded';

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
  // 클릭된 카드 id — InteractiveFilmCard의 layoutId와 FilmCardExpanded가 공유해서 FLIP 애니메이션 발동
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const handleSelect = useCallback((id: number) => setSelectedId(id), []);
  const handleClose = useCallback(() => setSelectedId(null), []);

  const selectedMovie = movies.find((movie) => movie.id === selectedId) ?? null;
  const selectedBlur = selectedId !== null
    ? (blurUrls[movies.findIndex((movie) => movie.id === selectedId)] ?? FALLBACK_BLUR)
    : FALLBACK_BLUR;

  return (
    <>
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
            <InteractiveFilmCard
              movie={movie}
              blurDataURL={blurUrls[index] ?? FALLBACK_BLUR}
              priority={index < 6}
              isSelected={selectedId === movie.id}
              onSelect={handleSelect}
            />
          </motion.div>
        ))}
      </motion.div>

      {/*
        AnimatePresence는 FilmCardExpanded 내부에 있음.
        FilmCardGrid 밖에서 포털로 렌더해도 되지만, z-index 관리를 위해 인접 sibling으로 배치.
      */}
      <FilmCardExpanded
        movie={selectedMovie}
        blurDataURL={selectedBlur}
        onClose={handleClose}
      />
    </>
  );
};
