import type { ITmdbMovie } from '@/lib/tmdb';
import { getPosterBlurDataUrl } from '@/lib/blur';
import { FilmCardGrid } from './FilmCardGrid';

interface IFilmGridProps {
  movies: ITmdbMovie[];
}

// RSC — blur URL 생성(async)만 담당하고, 렌더링·애니메이션은 FilmCardGrid(client)에 위임
export const FilmGrid = async ({ movies }: IFilmGridProps) => {
  // 모든 포스터의 blur placeholder를 병렬로 생성 — 순차 처리 대비 훨씬 빠름
  const blurUrls = await Promise.all(
    movies.map((movie) => getPosterBlurDataUrl(movie.poster_path)),
  );

  return <FilmCardGrid movies={movies} blurUrls={blurUrls} />;
};
