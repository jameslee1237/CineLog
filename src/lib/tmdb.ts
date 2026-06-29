const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

// 1시간 캐시 — Next.js 16의 fetch revalidate 패턴 (use cache 대안)
const CACHE_1H = { next: { revalidate: 3600 } } as const;

const getHeaders = () => ({
  Authorization: `Bearer ${process.env.TMDB_API_READ_ACCESS_TOKEN}`,
  'Content-Type': 'application/json',
});

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

export async function getTrending(): Promise<ITmdbMovie[]> {
  const res = await fetch(`${TMDB_BASE}/trending/movie/week`, {
    headers: getHeaders(),
    ...CACHE_1H,
  });
  if (!res.ok) throw new Error('Failed to fetch trending movies');
  const data = await res.json();
  return data.results as ITmdbMovie[];
}

export async function getNowPlaying(): Promise<ITmdbMovie[]> {
  const res = await fetch(`${TMDB_BASE}/movie/now_playing`, {
    headers: getHeaders(),
    ...CACHE_1H,
  });
  if (!res.ok) throw new Error('Failed to fetch now playing');
  const data = await res.json();
  return data.results as ITmdbMovie[];
}

export async function getMovieDetail(id: number): Promise<ITmdbMovieDetail> {
  const res = await fetch(`${TMDB_BASE}/movie/${id}`, {
    headers: getHeaders(),
    ...CACHE_1H,
  });
  if (!res.ok) throw new Error(`Failed to fetch movie ${id}`);
  return res.json() as Promise<ITmdbMovieDetail>;
}

export async function getMovieCredits(id: number): Promise<ITmdbCredits> {
  const res = await fetch(`${TMDB_BASE}/movie/${id}/credits`, {
    headers: getHeaders(),
    ...CACHE_1H,
  });
  if (!res.ok) throw new Error(`Failed to fetch credits for movie ${id}`);
  return res.json() as Promise<ITmdbCredits>;
}

export async function searchMovies(query: string, page = 1): Promise<ITmdbSearchResult> {
  const res = await fetch(
    `${TMDB_BASE}/search/movie?query=${encodeURIComponent(query)}&page=${page}`,
    { headers: getHeaders() },
  );
  if (!res.ok) throw new Error('Failed to search movies');
  return res.json() as Promise<ITmdbSearchResult>;
}
