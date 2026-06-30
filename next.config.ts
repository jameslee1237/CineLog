import bundleAnalyzer from '@next/bundle-analyzer';
import type { NextConfig } from 'next';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  experimental: {
    // View Transitions API — Next.js가 <Link> 탐색을 document.startViewTransition()으로 래핑해
    // view-transition-name이 붙은 요소가 브라우저 네이티브 모핑 애니메이션을 발동함
    viewTransition: true,
    // PPR: Next.js 16에서 ppr → cacheComponents로 이름 변경됨
    // cacheComponents는 generateMetadata 비동기 호출과 충돌하는 알려진 이슈가 있어 보류
    // 안정화 후 재적용 예정
  },
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        pathname: '/t/p/**',
      },
    ],
  },
};

export default withBundleAnalyzer(nextConfig);
