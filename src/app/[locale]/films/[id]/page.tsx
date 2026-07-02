import {
  LOCALE_TO_TMDB_LANGUAGE,
  getBackdropUrl,
  getCurrentTmdbLanguage,
  getMovieCredits,
  getMovieDetail,
  getPosterUrl,
  type ITmdbCastMember,
  type ITmdbMovieDetail,
} from '@/lib/tmdb';
import { getWatchedStatus, getRating } from '@/lib/db/queries';
import { WatchedButton } from '@/components/film/WatchedButton';
import { RatingWidget } from '@/components/film/RatingWidget';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { auth } from '@clerk/nextjs/server';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import Image from 'next/image';
import type { Metadata } from 'next';
import type { TLocale } from '@/i18n/locales';

interface IFilmPageProps {
  params: Promise<{ locale: TLocale; id: string }>;
}

export async function generateMetadata({ params }: IFilmPageProps): Promise<Metadata> {
  const { locale, id } = await params;
  const movie = await getMovieDetail(Number(id), LOCALE_TO_TMDB_LANGUAGE[locale]);
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
  const { userId } = await auth();
  const language = await getCurrentTmdbLanguage();
  const t = await getTranslations('film');

  // TMDB 데이터 병렬 fetch
  const [movie, credits] = await Promise.all([
    getMovieDetail(movieId, language),
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
        // aspect-video(16:9)로 TMDB 백드롭의 실제 비율에 맞춤 — 이전엔 h-64/md:h-96
        // 고정 높이 + w-full이라 넓은 화면에서 원본보다 훨씬 가로로 긴 컨테이너가 되어
        // object-cover가 이미지 위/아래를 과도하게 잘라냄. max-h로 초광폭 화면에서
        // 배너가 지나치게 커지는 것만 제한.
        <div className="relative w-full aspect-video max-h-[420px] overflow-hidden">
          <Image
            src={backdropUrl}
            alt={movie.title}
            fill
            sizes="100vw"
            className="object-cover"
            priority
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/60 to-transparent" />
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex gap-6 -mt-24 relative z-10">
          {posterUrl && (
            <div className="w-28 md:w-48 shrink-0">
              {/*
                view-transition-name: FilmCard의 poster-{id}와 일치해야 브라우저가
                카드 → 상세 이동 시 포스터를 자연스럽게 모핑함.
                모바일에서도 항상 표시(hidden 제거) — 데스크톱보다 작은 크기(w-28)로.
              */}
              <div
                className="relative aspect-[2/3] rounded-lg overflow-hidden shadow-2xl"
                style={{ viewTransitionName: `poster-${movieId}` }}
              >
                <Image
                  src={posterUrl}
                  alt={movie.title}
                  fill
                  sizes="(max-width: 767px) 112px, 192px"
                  className="object-cover"
                />
              </div>
            </div>
          )}

          {/* 메타 정보: 마운트 시 아래에서 위로 슬라이드업 */}
          <MotionDiv
            className="flex-1"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1], delay: 0.1 }}
          >
            <FilmMeta movie={movie} />
          </MotionDiv>
        </div>

        {userId && (
          <MotionDiv
            className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1], delay: 0.25 }}
          >
            <WatchedButton tmdbId={movieId} initialWatched={isWatched} />
            <RatingWidget tmdbId={movieId} initialRating={rating} />
          </MotionDiv>
        )}

        {/* 출연진: 약간 늦게 등장해서 콘텐츠가 순서대로 나타나는 느낌 */}
        <MotionDiv
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1], delay: 0.35 }}
        >
          <CastSection cast={topCast} heading={t('cast')} />
        </MotionDiv>
      </div>
    </>
  );
}

interface IFilmMetaProps {
  movie: ITmdbMovieDetail;
}

const FilmMeta = ({ movie }: IFilmMetaProps) => (
  <div className="flex-1">
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
  heading: string;
}

const CastSection = ({ cast, heading }: ICastSectionProps) => (
  <section className="mt-8">
    <h2 className="text-xl font-semibold mb-4">{heading}</h2>
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
    <div className="w-full aspect-video max-h-[420px] bg-gray-800" />
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex gap-6 -mt-24 relative z-10">
        <div className="w-28 md:w-48 shrink-0">
          <div className="aspect-[2/3] rounded-lg bg-gray-700" />
        </div>
        <div className="flex-1 space-y-3">
          <div className="h-8 w-2/3 rounded bg-gray-700" />
          <div className="h-4 w-1/3 rounded bg-gray-700" />
          <div className="h-4 w-full rounded bg-gray-700 mt-4" />
          <div className="h-4 w-5/6 rounded bg-gray-700" />
        </div>
      </div>
    </div>
  </div>
);
