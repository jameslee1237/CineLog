import { defineRouting } from 'next-intl/routing';
import { DEFAULT_LOCALE, LOCALES } from './locales';

export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  // 'always': 기본 로케일(en)도 항상 /en 접두사를 붙임.
  // 로케일별로 독립적인 캐싱/정적 렌더링이 가능해지고, URL만으로 로케일을 알 수 있어
  // 공유 링크·SEO에도 유리함.
  localePrefix: 'always',
});
