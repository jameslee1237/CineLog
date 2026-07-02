'use client';

import { useLocale, useTranslations } from 'next-intl';
import { DEFAULT_LOCALE, getNextLocale, isValidLocale } from '@/i18n/locales';
import { getPathname, usePathname } from '@/i18n/navigation';

export const LocaleSwitcher = () => {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations('localeSwitcher');
  const currentLocale = isValidLocale(locale) ? locale : DEFAULT_LOCALE;
  const nextLocale = getNextLocale(currentLocale);

  const handleClick = () => {
    // Next.js의 partial rendering 최적화는 client-side 네비게이션에서
    // [locale]/layout.tsx 같은 "공유 레이아웃"을 다시 fetch하지 않는다
    // (Next.js 공식 문서에 명시된 동작) — 이 레이아웃 자체가 locale param에
    // 의존하는데도, soft navigation으로는 Navbar/번역 컨텍스트가 갱신되지 않아
    // 이전 로케일 내용이 계속 보이는 버그로 이어짐. 로케일 전환은 자주 일어나는
    // 동작이 아니므로, 전체 페이지를 하드 네비게이션으로 다시 로드해 항상
    // 새 로케일로 완전히 새로고침되도록 한다.
    // 렌더링 중이 아닌 클릭 핸들러 내부의 실제 브라우저 네비게이션이므로 React Compiler의 순수성 검사와 무관함.
    // eslint-disable-next-line react-hooks/immutability
    window.location.href = getPathname({ href: pathname, locale: nextLocale });
  };

  return (
    <button
      onClick={handleClick}
      aria-label={nextLocale === 'kr' ? t('switchToKorean') : t('switchToEnglish')}
      className="rounded-full px-3 py-1.5 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
    >
      {nextLocale.toUpperCase()}
    </button>
  );
};
