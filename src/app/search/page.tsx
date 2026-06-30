import { SearchResults, SearchResultsSkeleton } from '@/components/search/SearchResults';
import { Suspense } from 'react';
import type { Metadata } from 'next';

interface ISearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export async function generateMetadata({ searchParams }: ISearchPageProps): Promise<Metadata> {
  const { q } = await searchParams;
  return {
    title: q ? `"${q}" — CineLog` : 'Search — CineLog',
  };
}

export default async function SearchPage({ searchParams }: ISearchPageProps) {
  const { q } = await searchParams;
  const query = q ?? '';

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      {query ? (
        <h1 className="mb-6 text-xl font-semibold text-gray-300">
          Results for &ldquo;{query}&rdquo;
        </h1>
      ) : (
        <h1 className="mb-6 text-xl font-semibold text-gray-300">Search Films</h1>
      )}

      {/*
        key={query}: query가 바뀔 때 Suspense가 skeleton fallback을 보여주면서
        새 결과를 스트리밍. NavbarSearch의 useTransition이 이 지연을 브릿징.
      */}
      <Suspense key={query} fallback={<SearchResultsSkeleton />}>
        <SearchResults query={query} />
      </Suspense>
    </main>
  );
}
