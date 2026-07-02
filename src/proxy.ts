import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import createMiddleware from 'next-intl/middleware';
import { LOCALES } from '@/i18n/locales';
import { routing } from '@/i18n/routing';

const intlMiddleware = createMiddleware(routing);

// LOCALES에서 파생 — 로케일이 추가/제거되면 이 패턴도 자동으로 갱신됨
const localePattern = `(${LOCALES.join('|')})`;

const isPublicRoute = createRouteMatcher([
  '/',
  `/${localePattern}`,
  `/${localePattern}/films/(.*)`,
  '/api/(.*)',
  `/${localePattern}/sign-in(.*)`,
  `/${localePattern}/sign-up(.*)`,
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
  return intlMiddleware(request);
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
