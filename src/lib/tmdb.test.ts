import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getMovieDetail, getTrending, LOCALE_TO_TMDB_LANGUAGE, searchMovies } from './tmdb';

const okJsonResponse = (body: unknown) => ({
  ok: true,
  json: async () => body,
});

describe('LOCALE_TO_TMDB_LANGUAGE', () => {
  it('maps en to en-US and kr to ko-KR', () => {
    expect(LOCALE_TO_TMDB_LANGUAGE.en).toBe('en-US');
    expect(LOCALE_TO_TMDB_LANGUAGE.kr).toBe('ko-KR');
  });
});

describe('getTrending', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => okJsonResponse({ results: [] })));
  });

  it('requests the given language', async () => {
    await getTrending('ko-KR');
    const [url] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('language=ko-KR');
  });
});

describe('getMovieDetail', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => okJsonResponse({ id: 1 })));
  });

  it('requests the given language for the given movie id', async () => {
    await getMovieDetail(42, 'en-US');
    const [url] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('/movie/42');
    expect(url).toContain('language=en-US');
  });
});

describe('searchMovies', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => okJsonResponse({ results: [], total_pages: 0, total_results: 0 })),
    );
  });

  it('requests the given language alongside the query', async () => {
    await searchMovies('dune', 'ko-KR');
    const [url] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('query=dune');
    expect(url).toContain('language=ko-KR');
  });
});
