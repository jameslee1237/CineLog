'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';

export const NavbarSearch = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const isOnSearchPage = pathname === '/search';
  const urlQuery = searchParams.get('q') ?? '';

  const [isExpanded, setIsExpanded] = useState(isOnSearchPage);
  const [value, setValue] = useState(urlQuery);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 뒤로가기 등 URL 변경 시 input 값을 동기화
  useEffect(() => {
    setValue(urlQuery);
  }, [urlQuery]);

  // /search 페이지 진입 시 자동 expand
  useEffect(() => {
    if (isOnSearchPage) setIsExpanded(true);
  }, [isOnSearchPage]);

  const expand = () => {
    setIsExpanded(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const collapse = () => {
    // 검색 페이지에서는 닫기 불가
    if (isOnSearchPage) return;
    setIsExpanded(false);
    setValue('');
    if (debounceRef.current) clearTimeout(debounceRef.current);
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    setValue(nextValue);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      startTransition(() => {
        const params = new URLSearchParams();
        if (nextValue.trim()) params.set('q', nextValue.trim());
        router.replace(`/search${params.size > 0 ? `?${params.toString()}` : ''}`);
      });
    }, 300);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') collapse();
  };

  const handleBlur = () => {
    // 값이 없고 검색 페이지가 아니면 collapse (클릭 이벤트 여유를 위해 살짝 지연)
    if (!value.trim() && !isOnSearchPage) {
      setTimeout(collapse, 150);
    }
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  if (!isExpanded) {
    return (
      <button
        onClick={expand}
        aria-label="Search"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
      >
        <SearchIcon />
      </button>
    );
  }

  return (
    <div className="flex flex-1 max-w-sm items-center gap-2">
      <div className="relative flex-1">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
          <SearchIcon />
        </span>
        <input
          ref={inputRef}
          type="search"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder="Search films..."
          autoFocus
          className="w-full rounded-lg bg-gray-800 py-1.5 pl-9 pr-3 text-sm outline-none ring-1 ring-emerald-500 transition-shadow focus:ring-2"
          aria-label="Search films"
        />
        {isPending && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 animate-pulse">
            ···
          </span>
        )}
      </div>
      {/* 검색 페이지가 아닐 때만 닫기 버튼 표시 */}
      {!isOnSearchPage && (
        <button
          onClick={collapse}
          aria-label="Close search"
          className="text-gray-400 hover:text-white transition-colors text-lg leading-none"
        >
          ×
        </button>
      )}
    </div>
  );
};

const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
    <path
      d="M10 6.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Zm-.87 3.72a4.5 4.5 0 1 1 .71-.71l3.1 3.1-.71.7-3.1-3.09Z"
      fill="currentColor"
      fillRule="evenodd"
      clipRule="evenodd"
    />
  </svg>
);
