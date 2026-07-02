'use client';

import { toggleWatched } from '@/app/[locale]/films/[id]/actions';
import { useTranslations } from 'next-intl';
import { useOptimistic, useTransition } from 'react';

interface IWatchedButtonProps {
  tmdbId: number;
  initialWatched: boolean;
}

export const WatchedButton = ({ tmdbId, initialWatched }: IWatchedButtonProps) => {
  const [optimisticWatched, setOptimisticWatched] = useOptimistic(initialWatched);
  const [isPending, startTransition] = useTransition();
  const t = useTranslations('film');

  const handleClick = () => {
    startTransition(async () => {
      setOptimisticWatched(!optimisticWatched);
      await toggleWatched(tmdbId);
    });
  };

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      aria-label={optimisticWatched ? t('unmarkWatched') : t('markWatched')}
      className={[
        'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors',
        optimisticWatched
          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
          : 'bg-gray-700 text-gray-200 hover:bg-gray-600',
        isPending ? 'opacity-60 cursor-not-allowed' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {optimisticWatched ? t('watched') : t('addToWatched')}
    </button>
  );
};
