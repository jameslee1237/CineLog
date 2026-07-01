import { SignInButton, UserButton } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';
import { Suspense } from 'react';
import { NavbarSearch } from './NavbarSearch';

export const Navbar = () => (
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

      {/*
        auth()는 동적 API — 이 슬라이스만 별도 Suspense로 감싸서
        로고/검색창 등 나머지 shell이 auth 응답을 기다리지 않고 먼저 flush되도록 함.
        이전에는 Navbar 전체가 async 함수여서 await auth()가 페이지 전체의
        첫 바이트 전송을 막고 있었음.
      */}
      <nav className="ml-auto flex items-center gap-4 shrink-0">
        <Suspense fallback={<AuthSlotFallback />}>
          <NavbarAuthSlot />
        </Suspense>
      </nav>
    </div>
  </header>
);

const NavbarAuthSlot = async () => {
  const { userId } = await auth();

  if (userId) {
    return (
      <>
        <Link href="/profile" className="text-sm text-gray-300 hover:text-white transition-colors">
          My List
        </Link>
        <UserButton />
      </>
    );
  }

  return (
    <SignInButton mode="modal">
      <button className="rounded-full bg-gray-700 px-4 py-1.5 text-sm font-medium hover:bg-gray-600 transition-colors">
        Sign In
      </button>
    </SignInButton>
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

// 로그인 상태(=My List 텍스트 + gap-4 + UserButton 아바타)와 로그아웃 상태
// (=Sign In 버튼) 두 가지 구조적으로 다른 결과물을 하나의 정적 모양으로는
// 정확히 맞출 수 없고, auth() 응답 전에는 어느 쪽이 나올지도 알 수 없음.
// w-32는 로그인 상태 쪽 너비에 더 가까운 근사값으로 잡아 이동을 줄이되,
// 완전히 없애지는 못함 (특히 로그아웃 상태에서는 약간의 축소 방향 이동이 남음).
const AuthSlotFallback = () => (
  <div className="h-8 w-32 rounded-full bg-gray-800" />
);
