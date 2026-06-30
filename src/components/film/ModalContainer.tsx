'use client';

import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FALLBACK_BLUR } from '@/lib/blur';

interface IModalContainerProps {
  movieId: number;
  title: string;
  overview: string;
  releaseDate: string;
  voteAverage: number;
  posterUrl: string | null;
  backdropUrl: string | null;
  blurDataURL?: string;
}

export const ModalContainer = ({
  movieId,
  title,
  overview,
  releaseDate,
  voteAverage,
  posterUrl,
  backdropUrl,
  blurDataURL = FALLBACK_BLUR,
}: IModalContainerProps) => {
  const router = useRouter();
  // exit 애니메이션을 위해 로컬 visible 상태 관리
  // 브라우저 Back 버튼은 즉시 언마운트되므로 Escape/백드롭 클릭에서만 애니메이션 실행
  const [isVisible, setIsVisible] = useState(true);

  const close = () => {
    setIsVisible(false);
    setTimeout(() => router.back(), 240);
  };

  useEffect(() => {
    // 의존성 배열 [] — 마운트 시 1회만 실행. 배열 없으면 애니메이션 렌더마다 실행되어
    // overflow 가 '' → 'hidden' 사이클을 반복하며 스크롤바가 깜빡임
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsVisible(false);
        setTimeout(() => router.back(), 240);
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [router]);

  const heroUrl = backdropUrl ?? posterUrl;

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* 반투명 백드롭 */}
          <motion.div
            key="modal-backdrop"
            className="fixed inset-0 z-40 bg-black/65 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={close}
          />

          {/* 모달 카드 */}
          <motion.div
            key="modal-card"
            className="fixed z-50 left-1/2 top-1/2 w-[min(440px,92vw)] rounded-2xl bg-gray-900 shadow-2xl overflow-hidden"
            style={{ translateX: '-50%', translateY: '-50%' }}
            initial={{ opacity: 0, scale: 0.94, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.24, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {/* 히어로 이미지 — aspect-[2/1]로 높이 제한, 하단 그라디언트로 배경색과 자연스럽게 연결 */}
            {heroUrl && (
              <div className="relative w-full aspect-[2/1] overflow-hidden rounded-t-2xl shrink-0">
                <Image
                  src={heroUrl}
                  alt={title}
                  fill
                  className="object-cover"
                  placeholder="blur"
                  blurDataURL={blurDataURL}
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent" />
              </div>
            )}

            {/* 콘텐츠 — 이미지와 겹치지 않게 일반 흐름으로 배치 */}
            <motion.div
              className="p-5"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.1 }}
            >
              <h2 className="text-xl font-bold leading-tight">{title}</h2>
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-400">
                <span>{releaseDate?.slice(0, 4)}</span>
                <span className="text-yellow-400">★ {voteAverage.toFixed(1)}</span>
              </div>

              {overview && (
                <p className="mt-3 text-sm text-gray-300 leading-relaxed line-clamp-5">{overview}</p>
              )}

              <div className="mt-5">
                <Link
                  href={`/films/${movieId}`}
                  className="block w-full text-center py-2.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-gray-100 transition-colors"
                >
                  View details →
                </Link>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
