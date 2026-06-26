const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

function getHeaders() {
  return {
    Authorization: `Bearer ${process.env.TMDB_API_READ_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

export type TmdbMovie = {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
};

export type TmdbMovieDetail = TmdbMovie & {
  runtime: number | null;
  genres: { id: number; name: string }[];
  tagline: string;
  status: string;
  revenue: number;
  budget: number;
};

export type TmdbCastMember = {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
};

export type TmdbCredits = {
  cast: TmdbCastMember[];
};

export type TmdbSearchResult = {
  results: TmdbMovie[];
  total_pages: number;
  total_results: number;
};

export function getPosterUrl(posterPath: string | null, size: 'w185' | 'w342' | 'w500' | 'original' = 'w342') {
  if (!posterPath) return null;
  return `${TMDB_IMAGE_BASE}/${size}${posterPath}`;
}

export function getBackdropUrl(backdropPath: string | null, size: 'w780' | 'w1280' | 'original' = 'w1280') {
  if (!backdropPath) return null;
  return `${TMDB_IMAGE_BASE}/${size}${backdropPath}`;
}

// Next.js 16 use cache 패턴 — 명시적으로 캐시 어노테이션
export async function getTrending(): Promise<TmdbMovie[]> {
  'use cache';
  const res = await fetch(`${TMDB_BASE}/trending/movie/week`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch trending movies');
  const data = await res.json();
  return data.results as TmdbMovie[];
}

export async function getNowPlaying(): Promise<TmdbMovie[]> {
  'use cache';
  const res = await fetch(`${TMDB_BASE}/movie/now_playing`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch now playing');
  const data = await res.json();
  return data.results as TmdbMovie[];
}

export async function getMovieDetail(id: number): Promise<TmdbMovieDetail> {
  'use cache';
  const res = await fetch(`${TMDB_BASE}/movie/${id}`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to fetch movie ${id}`);
  return res.json() as Promise<TmdbMovieDetail>;
}

export async function getMovieCredits(id: number): Promise<TmdbCredits> {
  'use cache';
  const res = await fetch(`${TMDB_BASE}/movie/${id}/credits`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to fetch credits for movie ${id}`);
  return res.json() as Promise<TmdbCredits>;
}

export async function searchMovies(query: string, page = 1): Promise<TmdbSearchResult> {
  const res = await fetch(
    `${TMDB_BASE}/search/movie?query=${encodeURIComponent(query)}&page=${page}`,
    { headers: getHeaders() },
  );
  if (!res.ok) throw new Error('Failed to search movies');
  return res.json() as Promise<TmdbSearchResult>;
}
