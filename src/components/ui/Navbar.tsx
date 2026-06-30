import { SignInButton, UserButton } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';

export const Navbar = async () => {
  const { userId } = await auth();

  return (
    <header className="sticky top-0 z-50 border-b border-gray-800 bg-gray-950/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4">
        <Link href="/" className="text-lg font-bold tracking-tight shrink-0">
          CineLog
        </Link>

        {/* 검색 링크 — 클릭 시 /search 페이지로 이동 */}
        <Link
          href="/search"
          className="flex flex-1 max-w-sm items-center gap-2 rounded-lg bg-gray-800 px-3 py-1.5 text-sm text-gray-400 ring-1 ring-gray-700 hover:ring-gray-500 transition-all"
        >
          <span>🔍</span>
          <span>영화 검색...</span>
        </Link>

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
