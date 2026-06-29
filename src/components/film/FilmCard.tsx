import { getPosterUrl, type ITmdbMovie } from '@/lib/tmdb';
import Image from 'next/image';
import Link from 'next/link';

interface IFilmCardProps {
  movie: ITmdbMovie;
  priority?: boolean;
}

export const FilmCard = ({ movie, priority = false }: IFilmCardProps) => {
  const posterUrl = getPosterUrl(movie.poster_path, 'w342');

  return (
    <Link href={`/films/${movie.id}`} className="group block">
      {/* aspect-ratio 컨테이너 — 이미지 로드 전에도 공간을 확보해서 CLS(레이아웃 이동)를 방지 */}
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-gray-800">
        {posterUrl ? (
          <Image
            src={posterUrl}
            alt={movie.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            priority={priority}
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
