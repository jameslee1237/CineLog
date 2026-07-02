import { getCurrentTmdbLanguage, searchMovies } from '@/lib/tmdb';
import { FilmCard } from '@/components/film/FilmCard';
import { FALLBACK_BLUR } from '@/lib/blur';
import { getTranslations } from 'next-intl/server';

interface ISearchResultsProps {
  query: string;
}

export const SearchResults = async ({ query }: ISearchResultsProps) => {
  const t = await getTranslations('search');

  if (!query.trim()) {
    return <p className="mt-8 text-center text-gray-500">{t('promptEmpty')}</p>;
  }

  const data = await searchMovies(query, await getCurrentTmdbLanguage());

  if (data.results.length === 0) {
    return <p className="mt-8 text-center text-gray-500">{t('noResults', { query })}</p>;
  }

  return (
    <>
      <p className="mb-4 text-sm text-gray-400">
        {t('resultsCount', { count: data.total_results })}
      </p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {data.results.map((movie) => (
          <FilmCard key={movie.id} movie={movie} blurDataURL={FALLBACK_BLUR} />
        ))}
      </div>
    </>
  );
};

export const SearchResultsSkeleton = () => (
  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 animate-pulse mt-8">
    {Array.from({ length: 10 }, (_, index) => (
      <div key={index}>
        <div className="aspect-[2/3] rounded-lg bg-gray-800" />
        <div className="mt-2 h-4 w-3/4 rounded bg-gray-700" />
        <div className="mt-1 h-3 w-1/2 rounded bg-gray-700" />
      </div>
    ))}
  </div>
);
