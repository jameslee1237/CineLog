import { getWatchedFilmsWithRatings } from '@/lib/db/queries';
import { getMovieDetail } from '@/lib/tmdb';
import { FilmCard } from '@/components/film/FilmCard';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '내 목록 — CineLog',
};

export default async function ProfilePage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">내 시청 목록</h1>
      <Suspense fallback={<WatchedListSkeleton />}>
        <WatchedList userId={userId} />
      </Suspense>
    </main>
  );
}

async function WatchedList({ userId }: { userId: string }) {
  const entries = await getWatchedFilmsWithRatings(userId);

  if (entries.length === 0) {
    return (
      <p className="text-gray-400 text-sm">
        아직 시청한 영화가 없습니다. 영화를 찾아 시청 목록에 추가해보세요.
      </p>
    );
  }

  // TMDB 상세 정보 병렬 fetch (최대 50개)
  const movies = await Promise.all(
    entries.map((entry) => getMovieDetail(entry.tmdbId)),
  );

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {movies.map((movie, index) => (
        <div key={movie.id} className="relative">
          <FilmCard movie={movie} isWatched={true} />
          {/* 별점 표시 */}
          {entries[index]?.score && (
            <p className="mt-1 text-center text-xs text-amber-400">
              {'★'.repeat(entries[index].score ?? 0)}
              <span className="text-gray-500">
                {'★'.repeat(5 - (entries[index].score ?? 0))}
              </span>
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

const WatchedListSkeleton = () => (
  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 animate-pulse">
    {Array.from({ length: 10 }, (_, index) => (
      <div key={index}>
        <div className="aspect-[2/3] rounded-lg bg-gray-800" />
        <div className="mt-2 h-4 w-3/4 rounded bg-gray-700" />
        <div className="mt-1 h-3 w-1/2 rounded bg-gray-700" />
      </div>
    ))}
  </div>
);
