'use server';

import { db } from '@/lib/db';
import { ratings, watchedFilms } from '@/lib/db/schema';
import { LOCALES } from '@/i18n/locales';
import { auth } from '@clerk/nextjs/server';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

const revalidateFilmPaths = (tmdbId: number) => {
  // 라우트가 로케일별로 분리된 캐시 항목이므로, 두 로케일을 모두 갱신해야 함
  for (const locale of LOCALES) {
    revalidatePath(`/${locale}/films/${tmdbId}`);
    revalidatePath(`/${locale}/profile`);
  }
};

export const toggleWatched = async (tmdbId: number): Promise<{ watched: boolean }> => {
  const { userId } = await auth();
  if (!userId) throw new Error('Not authenticated');

  const existing = await db
    .select({ id: watchedFilms.id })
    .from(watchedFilms)
    .where(and(eq(watchedFilms.userId, userId), eq(watchedFilms.tmdbId, tmdbId)))
    .limit(1);

  if (existing.length > 0) {
    await db
      .delete(watchedFilms)
      .where(and(eq(watchedFilms.userId, userId), eq(watchedFilms.tmdbId, tmdbId)));
    revalidateFilmPaths(tmdbId);
    return { watched: false };
  }

  await db.insert(watchedFilms).values({ userId, tmdbId });
  revalidateFilmPaths(tmdbId);
  return { watched: true };
};

export const setRating = async (tmdbId: number, score: number): Promise<void> => {
  const { userId } = await auth();
  if (!userId) throw new Error('Not authenticated');

  if (score === 0) {
    // 0점 = 별점 삭제
    await db
      .delete(ratings)
      .where(and(eq(ratings.userId, userId), eq(ratings.tmdbId, tmdbId)));
  } else {
    // 기존 별점이 있으면 삭제 후 재삽입 (upsert 대체)
    await db
      .delete(ratings)
      .where(and(eq(ratings.userId, userId), eq(ratings.tmdbId, tmdbId)));
    await db.insert(ratings).values({ userId, tmdbId, score });
  }

  revalidateFilmPaths(tmdbId);
};
