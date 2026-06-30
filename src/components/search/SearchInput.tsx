'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';

export const SearchInput = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(searchParams.get('q') ?? '');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    setValue(nextValue);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      startTransition(() => {
        const params = new URLSearchParams();
        if (nextValue.trim()) params.set('q', nextValue.trim());
        // replace 사용 — 검색어마다 history 항목이 쌓이지 않도록
        router.replace(`/search${params.size > 0 ? `?${params.toString()}` : ''}`);
      });
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="relative w-full">
      <input
        type="search"
        value={value}
        onChange={handleChange}
        placeholder="영화 제목을 검색하세요..."
        autoFocus
        className="w-full rounded-xl bg-gray-800 px-4 py-3 pr-10 text-base outline-none ring-1 ring-gray-700 transition-shadow focus:ring-2 focus:ring-emerald-500"
        aria-label="영화 검색"
      />
      {/* isPending 상태: useTransition이 router.replace를 처리 중 — 입력 자체는 차단 없이 유지 */}
      {isPending && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 animate-pulse">
          ⏳
        </span>
      )}
    </div>
  );
};
