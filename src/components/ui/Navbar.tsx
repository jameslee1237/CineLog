import { SignInButton, UserButton } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';
import { Suspense } from 'react';
import { NavbarSearch } from './NavbarSearch';

export const Navbar = async () => {
  const { userId } = await auth();

  return (
    <header className="sticky top-0 z-50 border-b border-gray-800 bg-gray-950/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
        <Link href="/" className="text-lg font-bold tracking-tight shrink-0">
          CineLog
        </Link>

        {/*
          NavbarSearch는 useSearchParams를 사용하므로 Suspense가 필요.
          fallback으로 아이콘 버튼을 미리 보여줘서 레이아웃 이동(CLS)을 방지.
        */}
        <div className="flex flex-1">
          <Suspense fallback={<SearchIconFallback />}>
            <NavbarSearch />
          </Suspense>
        </div>

        <nav className="ml-auto flex items-center gap-4 shrink-0">
          {userId ? (
            <>
              <Link href="/profile" className="text-sm text-gray-300 hover:text-white transition-colors">
                내 목록
              </Link>
              <UserButton />
            </>
          ) : (
            <SignInButton mode="modal">
              <button className="rounded-full bg-gray-700 px-4 py-1.5 text-sm font-medium hover:bg-gray-600 transition-colors">
                로그인
              </button>
            </SignInButton>
          )}
        </nav>
      </div>
    </header>
  );
};

const SearchIconFallback = () => (
  <div className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400">
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <path
        d="M10 6.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Zm-.87 3.72a4.5 4.5 0 1 1 .71-.71l3.1 3.1-.71.7-3.1-3.09Z"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </svg>
  </div>
);
