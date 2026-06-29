import type { ITmdbMovie } from '@/lib/tmdb';
import { getPosterBlurDataUrl } from '@/lib/blur';
import { FilmCard } from './FilmCard';

interface IFilmGridProps {
  movies: ITmdbMovie[];
}

export const FilmGrid = async ({ movies }: IFilmGridProps) => {
  // 모든 포스터의 blur placeholder를 병렬로 생성 — 순차 처리 대비 훨씬 빠름
  const blurUrls = await Promise.all(
    movies.map((movie) => getPosterBlurDataUrl(movie.poster_path)),
  );

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {movies.map((movie, index) => (
        <FilmCard
          key={movie.id}
          movie={movie}
          blurDataURL={blurUrls[index]}
          priority={index < 6}
        />
      ))}
    </div>
  );
};
