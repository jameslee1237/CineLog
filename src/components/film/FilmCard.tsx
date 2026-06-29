import { getPosterUrl, type ITmdbMovie } from '@/lib/tmdb';
import { FALLBACK_BLUR } from '@/lib/blur';
import Image from 'next/image';
import Link from 'next/link';

interface IFilmCardProps {
  movie: ITmdbMovie;
  priority?: boolean;
  blurDataURL?: string;
  isWatched?: boolean;
}

export const FilmCard = ({ movie, priority = false, blurDataURL = FALLBACK_BLUR, isWatched = false }: IFilmCardProps) => {
  const posterUrl = getPosterUrl(movie.poster_path, 'w342');

  return (
    <Link href={`/films/${movie.id}`} className="group block">
      {/* aspect-ratio 컨테이너 — 이미지 로드 전 공간을 확보해서 CLS(레이아웃 이동) 방지 */}
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-gray-800">
        {/* 시청 완료 체크 배지 — JS 없이 CSS only */}
        {isWatched && (
          <div className="absolute top-2 right-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-bold shadow">
            ✓
          </div>
        )}
        {posterUrl ? (
          <Image
            src={posterUrl}
            alt={movie.title}
            fill
            // sizes: 뷰포트 너비에 따라 실제 렌더 크기를 브라우저에게 알려줌
            // → 브라우저가 불필요하게 큰 이미지를 다운로드하지 않음 (LCP 최적화)
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            priority={priority}
            placeholder="blur"
            blurDataURL={blurDataURL}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-500 text-sm">
            No poster
          </div>
        )}
      </div>
      <div className="mt-2 space-y-1">
        <p className="text-sm font-medium leading-tight line-clamp-2">{movie.title}</p>
        <p className="text-xs text-gray-400">{movie.release_date?.slice(0, 4)}</p>
      </div>
    </Link>
  );
};
