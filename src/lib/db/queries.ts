import { and, desc, eq } from 'drizzle-orm';
import { db } from './index';
import { ratings, watchedFilms } from './schema';

export const getWatchedStatus = async (userId: string, tmdbId: number): Promise<boolean> => {
  const result = await db
    .select({ id: watchedFilms.id })
    .from(watchedFilms)
    .where(and(eq(watchedFilms.userId, userId), eq(watchedFilms.tmdbId, tmdbId)))
    .limit(1);
  return result.length > 0;
};

export const getRating = async (userId: string, tmdbId: number): Promise<number | null> => {
  const result = await db
    .select({ score: ratings.score })
    .from(ratings)
    .where(and(eq(ratings.userId, userId), eq(ratings.tmdbId, tmdbId)))
    .limit(1);
  return result[0]?.score ?? null;
};

export interface IWatchedEntry {
  tmdbId: number;
  watchedAt: Date;
  score: number | null;
}

export const getWatchedFilmsWithRatings = async (userId: string): Promise<IWatchedEntry[]> => {
  const rows = await db
    .select({
      tmdbId: watchedFilms.tmdbId,
      watchedAt: watchedFilms.watchedAt,
      score: ratings.score,
    })
    .from(watchedFilms)
    .leftJoin(
      ratings,
      and(eq(ratings.userId, userId), eq(ratings.tmdbId, watchedFilms.tmdbId)),
    )
    .where(eq(watchedFilms.userId, userId))
    .orderBy(desc(watchedFilms.watchedAt))
    .limit(50);

  return rows.map((row) => ({
    tmdbId: row.tmdbId,
    watchedAt: row.watchedAt,
    score: row.score ?? null,
  }));
};
