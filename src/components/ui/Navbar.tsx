import { SignInButton, SignOutButton, UserButton } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';

export const Navbar = async () => {
  const { userId } = await auth();

  return (
    <header className="sticky top-0 z-50 border-b border-gray-800 bg-gray-950/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
          CineLog
        </Link>

        <nav className="flex items-center gap-4">
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
