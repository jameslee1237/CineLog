'use client';

import { toggleWatched } from '@/app/films/[id]/actions';
import { useOptimistic, useTransition } from 'react';

interface IWatchedButtonProps {
  tmdbId: number;
  initialWatched: boolean;
}

export const WatchedButton = ({ tmdbId, initialWatched }: IWatchedButtonProps) => {
  const [optimisticWatched, setOptimisticWatched] = useOptimistic(initialWatched);
  const [isPending, startTransition] = useTransition();

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
      aria-label={optimisticWatched ? '시청 취소' : '시청 완료로 표시'}
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
      {optimisticWatched ? '✓ 시청 완료' : '+ 시청 목록에 추가'}
    </button>
  );
};
