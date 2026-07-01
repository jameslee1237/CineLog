import type { TLocale } from '@/i18n/locales';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

// 1시간 캐시 — Next.js 16의 fetch revalidate 패턴 (use cache 대안)
const CACHE_1H = { next: { revalidate: 3600 } } as const;

const getHeaders = () => ({
  Authorization: `Bearer ${process.env.TMDB_API_READ_ACCESS_TOKEN}`,
  'Content-Type': 'application/json',
});

export type TTmdbLanguage = 'en-US' | 'ko-KR';

// URL 로케일 슬러그(en/kr)와 TMDB의 표준 language 코드(en-US/ko-KR)를 잇는 유일한 지점
export const LOCALE_TO_TMDB_LANGUAGE: Record<TLocale, TTmdbLanguage> = {
  en: 'en-US',
  kr: 'ko-KR',
};

export interface ITmdbMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
}

export interface ITmdbMovieDetail extends ITmdbMovie {
  runtime: number | null;
  genres: { id: number; name: string }[];
  tagline: string;
  status: string;
  revenue: number;
  budget: number;
}

export interface ITmdbCastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

export interface ITmdbCredits {
  cast: ITmdbCastMember[];
}

export interface ITmdbSearchResult {
  results: ITmdbMovie[];
  total_pages: number;
  total_results: number;
}

export type TPosterSize = 'w185' | 'w342' | 'w500' | 'original';
export type TBackdropSize = 'w780' | 'w1280' | 'original';

export const getPosterUrl = (posterPath: string | null, size: TPosterSize = 'w342'): string | null => {
  if (!posterPath) return null;
  return `${TMDB_IMAGE_BASE}/${size}${posterPath}`;
};

export const getBackdropUrl = (backdropPath: string | null, size: TBackdropSize = 'w1280'): string | null => {
  if (!backdropPath) return null;
  return `${TMDB_IMAGE_BASE}/${size}${backdropPath}`;
};

export async function getTrending(language: TTmdbLanguage): Promise<ITmdbMovie[]> {
  const res = await fetch(`${TMDB_BASE}/trending/movie/week?language=${language}`, {
    headers: getHeaders(),
    ...CACHE_1H,
  });
  if (!res.ok) throw new Error('Failed to fetch trending movies');
  const data = await res.json();
  return data.results as ITmdbMovie[];
}

export async function getNowPlaying(language: TTmdbLanguage): Promise<ITmdbMovie[]> {
  const res = await fetch(`${TMDB_BASE}/movie/now_playing?language=${language}`, {
    headers: getHeaders(),
    ...CACHE_1H,
  });
  if (!res.ok) throw new Error('Failed to fetch now playing');
  const data = await res.json();
  return data.results as ITmdbMovie[];
}

export async function getMovieDetail(id: number, language: TTmdbLanguage): Promise<ITmdbMovieDetail> {
  const res = await fetch(`${TMDB_BASE}/movie/${id}?language=${language}`, {
    headers: getHeaders(),
    ...CACHE_1H,
  });
  if (!res.ok) throw new Error(`Failed to fetch movie ${id}`);
  return res.json() as Promise<ITmdbMovieDetail>;
}

export async function getMovieCredits(id: number): Promise<ITmdbCredits> {
  // 캐스트/크루 이름은 로케일에 따라 달라지지 않으므로 language 파라미터 없음
  const res = await fetch(`${TMDB_BASE}/movie/${id}/credits`, {
    headers: getHeaders(),
    ...CACHE_1H,
  });
  if (!res.ok) throw new Error(`Failed to fetch credits for movie ${id}`);
  return res.json() as Promise<ITmdbCredits>;
}

export async function searchMovies(
  query: string,
  language: TTmdbLanguage,
  page = 1,
): Promise<ITmdbSearchResult> {
  const res = await fetch(
    `${TMDB_BASE}/search/movie?query=${encodeURIComponent(query)}&language=${language}&page=${page}`,
    { headers: getHeaders() },
  );
  if (!res.ok) throw new Error('Failed to search movies');
  return res.json() as Promise<ITmdbSearchResult>;
}
