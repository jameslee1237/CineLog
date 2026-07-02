import { LOCALE_TO_TMDB_LANGUAGE, getBackdropUrl, getMovieDetail, getPosterUrl } from '@/lib/tmdb';
import { ModalContainer } from '@/components/film/ModalContainer';
import type { TLocale } from '@/i18n/locales';

interface IFilmModalProps {
  params: Promise<{ locale: TLocale; id: string }>;
}

// 인터셉트 라우트 — /films/[id]로의 탐색을 가로채서 @modal 슬롯에 오버레이로 렌더
// 직접 URL 입력이나 새로고침 시에는 이 라우트가 아닌 app/[locale]/films/[id]/page.tsx가 렌더됨
export default async function FilmModalPage({ params }: IFilmModalProps) {
  const { locale, id } = await params;
  const movieId = Number(id);
  const movie = await getMovieDetail(movieId, LOCALE_TO_TMDB_LANGUAGE[locale]);

  const posterUrl = getPosterUrl(movie.poster_path, 'w342');
  const backdropUrl = getBackdropUrl(movie.backdrop_path, 'w780');

  return (
    <ModalContainer
      movieId={movieId}
      title={movie.title}
      overview={movie.overview}
      releaseDate={movie.release_date}
      voteAverage={movie.vote_average}
      posterUrl={posterUrl}
      backdropUrl={backdropUrl}
    />
  );
}
