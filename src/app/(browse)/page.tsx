import { FilmGrid } from '@/components/film/FilmGrid';
import { FilmGridSkeleton } from '@/components/film/FilmGridSkeleton';
import { getTrending } from '@/lib/tmdb';
import { Suspense } from 'react';

export default async function BrowsePage() {
  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Trending This Week</h1>
      {/* Suspense로 감싸면 shell이 먼저 스트리밍되고, FilmGrid는 데이터 준비되면 뒤따라 스트림 */}
      <Suspense fallback={<FilmGridSkeleton />}>
        <TrendingGrid />
      </Suspense>
    </main>
  );
}

// 별도 async 컴포넌트로 분리해야 Suspense boundary가 동작함
async function TrendingGrid() {
  const movies = await getTrending();
  return <FilmGrid movies={movies} />;
}
