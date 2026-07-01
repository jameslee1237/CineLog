import { ClerkProvider } from '@clerk/nextjs';
import { koKR } from '@clerk/localizations';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Geist, Geist_Mono } from 'next/font/google';
import { WebVitals } from '@/components/ui/WebVitals';
import { Navbar } from '@/components/ui/Navbar';
import { routing } from '@/i18n/routing';
import '../globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'CineLog',
  description: 'Track, rate, and discover films',
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

interface IRootLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function RootLayout({ children, params }: Readonly<IRootLayoutProps>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const messages = await getMessages();

  return (
    <ClerkProvider localization={locale === 'kr' ? koKR : undefined}>
      <html
        lang={locale}
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <head>
          {/* TMDB 이미지 서버에 대한 DNS + TCP + TLS를 미리 맺어 LCP를 단축 */}
          <link rel="preconnect" href="https://image.tmdb.org" />
        </head>
        <body className="min-h-full flex flex-col">
          <NextIntlClientProvider messages={messages}>
            <Navbar />
            <div className="flex-1">{children}</div>
          </NextIntlClientProvider>
          <WebVitals />
          {/* Vercel Speed Insights — 실제 방문자의 LCP/CLS/INP 실측치 수집 (Lighthouse는 lab 데이터만 제공) */}
          <SpeedInsights />
        </body>
      </html>
    </ClerkProvider>
  );
}
