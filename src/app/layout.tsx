import { ClerkProvider } from '@clerk/nextjs';
import { SpeedInsights } from '@vercel/speed-insights/next';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Geist, Geist_Mono } from 'next/font/google';
import { WebVitals } from '@/components/ui/WebVitals';
import { Navbar } from '@/components/ui/Navbar';
import './globals.css';

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

interface IRootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: Readonly<IRootLayoutProps>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <head>
          {/* TMDB 이미지 서버에 대한 DNS + TCP + TLS를 미리 맺어 LCP를 단축 */}
          <link rel="preconnect" href="https://image.tmdb.org" />
        </head>
        <body className="min-h-full flex flex-col">
          <Navbar />
          <div className="flex-1">{children}</div>
          <WebVitals />
          {/* Vercel Speed Insights — 실제 방문자의 LCP/CLS/INP 실측치 수집 (Lighthouse는 lab 데이터만 제공) */}
          <SpeedInsights />
        </body>
      </html>
    </ClerkProvider>
  );
}
