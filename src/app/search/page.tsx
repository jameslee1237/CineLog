import { SearchInput } from '@/components/search/SearchInput';
import { SearchResults, SearchResultsSkeleton } from '@/components/search/SearchResults';
import { Suspense } from 'react';
import type { Metadata } from 'next';

interface ISearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export async function generateMetadata({ searchParams }: ISearchPageProps): Promise<Metadata> {
  const { q } = await searchParams;
  return {
    title: q ? `"${q}" 검색 결과 — CineLog` : '영화 검색 — CineLog',
  };
}

export default async function SearchPage({ searchParams }: ISearchPageProps) {
  const { q } = await searchParams;
  const query = q ?? '';

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">영화 검색</h1>

      {/*
        SearchInput은 useSearchParams를 사용하므로 반드시 Suspense로 감싸야 함.
        Suspense 없이 useSearchParams를 쓰면 Next.js가 빌드 시 경고를 emit함.
      */}
      <Suspense>
        <SearchInput />
      </Suspense>

      {/*
        SearchResults는 async RSC — query가 바뀔 때 이 Suspense 경계가
        skeleton을 보여주면서 새 결과를 스트리밍함.
        useTransition의 isPending이 이 지연을 input 레이어에서 브릿징함.
      */}
      <div className="mt-8">
        <Suspense key={query} fallback={<SearchResultsSkeleton />}>
          <SearchResults query={query} />
        </Suspense>
      </div>
    </main>
  );
}
