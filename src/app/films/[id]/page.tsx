import {
  getBackdropUrl,
  getMovieCredits,
  getMovieDetail,
  getPosterUrl,
  type ITmdbCastMember,
  type ITmdbMovieDetail,
} from '@/lib/tmdb';
import { getWatchedStatus, getRating } from '@/lib/db/queries';
import { WatchedButton } from '@/components/film/WatchedButton';
import { RatingWidget } from '@/components/film/RatingWidget';
import { auth } from '@clerk/nextjs/server';
import { Suspense } from 'react';
import Image from 'next/image';
import type { Metadata } from 'next';

interface IFilmPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: IFilmPageProps): Promise<Metadata> {
  const { id } = await params;
  const movie = await getMovieDetail(Number(id));
  return {
    title: `${movie.title} — CineLog`,
    description: movie.overview,
  };
}

export default async function FilmPage({ params }: IFilmPageProps) {
  const { id } = await params;
  const movieId = Number(id);

  return (
    <main>
      {/* 영화 상세 전체를 Suspense로 감쌈 — shell이 즉시 스트리밍되고 데이터는 뒤따라 옴 */}
      <Suspense fallback={<FilmDetailSkeleton />}>
        <FilmDetail movieId={movieId} />
      </Suspense>
    </main>
  );
}

// 실제 데이터 fetch를 별도 async 컴포넌트로 분리 — Suspense boundary가 이 경계를 기준으로 동작
async function FilmDetail({ movieId }: { movieId: number }) {
  // TMDB 데이터 + 인증 정보를 병렬로 fetch
  const { userId } = await auth();

  // Promise.all로 두 TMDB 요청 병렬 실행 — 순차 await 대비 ~50% 빠름
  const [movie, credits] = await Promise.all([
    getMovieDetail(movieId),
    getMovieCredits(movieId),
  ]);

  // 로그인 상태일 때만 DB 조회
  const [isWatched, rating] = userId
    ? await Promise.all([getWatchedStatus(userId, movieId), getRating(userId, movieId)])
    : [false, null];

  const posterUrl = getPosterUrl(movie.poster_path, 'w500');
  const backdropUrl = getBackdropUrl(movie.backdrop_path);
  const topCast = credits.cast.slice(0, 10);

  return (
    <>
      {backdropUrl && (
        <div className="relative h-64 md:h-96 w-full">
          <Image src={backdropUrl} alt={movie.title} fill className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/60 to-transparent" />
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex gap-6 -mt-24 relative z-10">
          {posterUrl && (
            <div className="hidden md:block w-48 shrink-0">
              <div className="relative aspect-[2/3] rounded-lg overflow-hidden shadow-2xl">
                <Image src={posterUrl} alt={movie.title} fill className="object-cover" />
              </div>
            </div>
          )}
          <FilmMeta movie={movie} />
        </div>

        {/* 사용자 인터랙션 영역 — 로그인 상태일 때만 표시 */}
        {userId && (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <WatchedButton tmdbId={movieId} initialWatched={isWatched} />
            <RatingWidget tmdbId={movieId} initialRating={rating} />
          </div>
        )}

        <CastSection cast={topCast} />
      </div>
    </>
  );
}

interface IFilmMetaProps {
  movie: ITmdbMovieDetail;
}

const FilmMeta = ({ movie }: IFilmMetaProps) => (
  <div className="flex-1 pt-24 md:pt-0">
    <h1 className="text-3xl font-bold">{movie.title}</h1>
    {movie.tagline && <p className="text-gray-400 italic mt-1">{movie.tagline}</p>}
    <div className="flex gap-3 mt-2 text-sm text-gray-400">
      <span>{movie.release_date?.slice(0, 4)}</span>
      {movie.runtime && <span>{movie.runtime}m</span>}
      <span>★ {movie.vote_average.toFixed(1)}</span>
    </div>
    <div className="flex flex-wrap gap-2 mt-3">
      {movie.genres.map((genre) => (
        <span key={genre.id} className="px-2 py-1 rounded-full bg-gray-800 text-xs">
          {genre.name}
        </span>
      ))}
    </div>
    <p className="mt-4 text-gray-300 leading-relaxed">{movie.overview}</p>
  </div>
);

interface ICastSectionProps {
  cast: ITmdbCastMember[];
}

const CastSection = ({ cast }: ICastSectionProps) => (
  <section className="mt-8">
    <h2 className="text-xl font-semibold mb-4">Cast</h2>
    <div className="flex gap-3 overflow-x-auto pb-2">
      {cast.map((member) => (
        <div key={member.id} className="shrink-0 w-20 text-center">
          <div className="w-20 h-20 rounded-full bg-gray-800 overflow-hidden mx-auto">
            {member.profile_path && (
              <Image
                src={`https://image.tmdb.org/t/p/w185${member.profile_path}`}
                alt={member.name}
                width={80}
                height={80}
                className="object-cover w-full h-full"
              />
            )}
          </div>
          <p className="text-xs mt-1 line-clamp-2">{member.name}</p>
          <p className="text-xs text-gray-500 line-clamp-1">{member.character}</p>
        </div>
      ))}
    </div>
  </section>
);

const FilmDetailSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-64 md:h-96 w-full bg-gray-800" />
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex gap-6 -mt-24 relative z-10">
        <div className="hidden md:block w-48 shrink-0">
          <div className="aspect-[2/3] rounded-lg bg-gray-700" />
        </div>
        <div className="flex-1 pt-24 md:pt-0 space-y-3">
          <div className="h-8 w-2/3 rounded bg-gray-700" />
          <div className="h-4 w-1/3 rounded bg-gray-700" />
          <div className="h-4 w-full rounded bg-gray-700 mt-4" />
          <div className="h-4 w-5/6 rounded bg-gray-700" />
        </div>
      </div>
    </div>
  </div>
);
