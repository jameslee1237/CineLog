import type { ITmdbMovie } from '@/lib/tmdb';
import { FilmCard } from './FilmCard';

interface IFilmGridProps {
  movies: ITmdbMovie[];
}

export const FilmGrid = ({ movies }: IFilmGridProps) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
    {movies.map((movie, index) => (
      <FilmCard
        key={movie.id}
        movie={movie}
        // 첫 6장은 above-the-fold — priority 설정으로 LCP 최적화
        priority={index < 6}
      />
    ))}
  </div>
);
