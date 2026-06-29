interface IFilmGridSkeletonProps {
  count?: number;
}

export const FilmGridSkeleton = ({ count = 20 }: IFilmGridSkeletonProps) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="animate-pulse">
        {/* FilmCard와 동일한 aspect-ratio 유지 */}
        <div className="aspect-[2/3] w-full rounded-lg bg-gray-800" />
        <div className="mt-2 space-y-1">
          <div className="h-3 w-3/4 rounded bg-gray-700" />
          <div className="h-3 w-1/4 rounded bg-gray-700" />
        </div>
      </div>
    ))}
  </div>
);
