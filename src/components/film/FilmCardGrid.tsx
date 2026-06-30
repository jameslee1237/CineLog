'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { FALLBACK_BLUR } from '@/lib/blur';
import type { ITmdbMovie } from '@/lib/tmdb';
import { FilmCard } from './FilmCard';

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
    <motion.div
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
      variants={containerVariants}
      // 모션 감소 설정 시 즉시 최종 상태로 렌더 (애니메이션 완전 생략)
      initial={prefersReducedMotion ? false : 'hidden'}
      animate={prefersReducedMotion ? false : 'visible'}
    >
      {movies.map((movie, index) => (
        <motion.div key={movie.id} variants={cardVariants} transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}>
          <FilmCard
            movie={movie}
            blurDataURL={blurUrls[index] ?? FALLBACK_BLUR}
            priority={index < 6}
          />
        </motion.div>
      ))}
    </motion.div>
  );
};
