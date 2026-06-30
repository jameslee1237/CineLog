'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect } from 'react';
import { getBackdropUrl, getPosterUrl, type ITmdbMovie } from '@/lib/tmdb';
import { FALLBACK_BLUR } from '@/lib/blur';

interface IFilmCardExpandedProps {
  movie: ITmdbMovie | null;
  blurDataURL?: string;
  onClose: () => void;
}

export const FilmCardExpanded = ({ movie, blurDataURL = FALLBACK_BLUR, onClose }: IFilmCardExpandedProps) => {
  // Escape 키로 닫기 + 열려있는 동안 body 스크롤 잠금
  useEffect(() => {
    if (!movie) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [movie, onClose]);

  const posterUrl = movie ? getPosterUrl(movie.poster_path, 'w342') : null;
  const backdropUrl = movie ? getBackdropUrl(movie.backdrop_path, 'w780') : null;

  return (
    <AnimatePresence>
      {movie && (
        <>
          {/* 반투명 백드롭 — 클릭 시 닫힘 */}
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />

          {/*
            layoutId="card-{id}" 가 InteractiveFilmCard 와 일치 →
            Framer Motion FLIP 애니메이션: 카드 위치에서 오버레이 위치로 자연스럽게 모핑
          */}
          <motion.div
            key={`expanded-${movie.id}`}
            layoutId={`card-${movie.id}`}
            className="fixed z-50 left-1/2 top-1/2 w-[min(420px,90vw)] -translate-x-1/2 -translate-y-1/2 rounded-2xl overflow-hidden bg-gray-900 shadow-2xl"
            style={{ translateX: '-50%', translateY: '-50%' }}
          >
            {/* 백드롭 이미지 — 오버레이 상단 와이드 배너 */}
            <motion.div
              layoutId={`poster-img-${movie.id}`}
              className="relative w-full aspect-video overflow-hidden"
            >
              {backdropUrl ? (
                <Image
                  src={backdropUrl}
                  alt={movie.title}
                  fill
                  className="object-cover"
                  placeholder="blur"
                  blurDataURL={blurDataURL}
                />
              ) : posterUrl ? (
                <Image
                  src={posterUrl}
                  alt={movie.title}
                  fill
                  className="object-cover object-top"
                  placeholder="blur"
                  blurDataURL={blurDataURL}
                />
              ) : (
                <div className="w-full h-full bg-gray-800" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent" />
            </motion.div>

            {/* 콘텐츠 영역 — initial/animate로 카드→오버레이 모핑 후 페이드인 */}
            <motion.div
              className="p-5 -mt-8 relative"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.22, delay: 0.12 }}
            >
              <h2 className="text-lg font-bold leading-tight">{movie.title}</h2>

              <div className="flex items-center gap-3 mt-1 text-sm text-gray-400">
                <span>{movie.release_date?.slice(0, 4)}</span>
                <span className="text-yellow-400">★ {movie.vote_average.toFixed(1)}</span>
              </div>

              {movie.overview && (
                <p className="mt-3 text-sm text-gray-300 leading-relaxed line-clamp-5">
                  {movie.overview}
                </p>
              )}

              <div className="mt-4 flex items-center gap-3">
                <Link
                  href={`/films/${movie.id}`}
                  className="flex-1 text-center py-2 rounded-lg bg-white text-black text-sm font-semibold hover:bg-gray-100 transition-colors"
                  onClick={onClose}
                >
                  상세 보기 →
                </Link>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                  aria-label="닫기"
                >
                  ✕
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
