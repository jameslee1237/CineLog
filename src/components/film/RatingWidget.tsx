'use client';

import { setRating } from '@/app/films/[id]/actions';
import { useOptimistic, useTransition } from 'react';

interface IRatingWidgetProps {
  tmdbId: number;
  initialRating: number | null;
}

const MAX_STARS = 5;

export const RatingWidget = ({ tmdbId, initialRating }: IRatingWidgetProps) => {
  const [optimisticRating, setOptimisticRating] = useOptimistic(initialRating ?? 0);
  const [isPending, startTransition] = useTransition();

  const handleRate = (score: number) => {
    // 같은 별점 클릭 시 별점 삭제(0으로)
    const nextScore = score === optimisticRating ? 0 : score;
    startTransition(async () => {
      setOptimisticRating(nextScore);
      await setRating(tmdbId, nextScore);
    });
  };

  return (
    <div className="flex items-center gap-1" aria-label={`별점 ${optimisticRating}점`}>
      {Array.from({ length: MAX_STARS }, (_, index) => {
        const starValue = index + 1;
        const isFilled = starValue <= optimisticRating;
        return (
          <button
            key={starValue}
            onClick={() => handleRate(starValue)}
            disabled={isPending}
            aria-label={`${starValue}점`}
            className={[
              'text-2xl transition-colors leading-none',
              isFilled ? 'text-amber-400' : 'text-gray-600 hover:text-amber-300',
              isPending ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            ★
          </button>
        );
      })}
      {optimisticRating > 0 && (
        <span className="ml-1 text-sm text-gray-400">{optimisticRating} / {MAX_STARS}</span>
      )}
    </div>
  );
};
