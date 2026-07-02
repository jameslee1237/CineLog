'use client';

import { useLocale, useTranslations } from 'next-intl';
import { DEFAULT_LOCALE, getNextLocale, isValidLocale } from '@/i18n/locales';
import { usePathname, useRouter } from '@/i18n/navigation';

export const LocaleSwitcher = () => {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('localeSwitcher');
  const currentLocale = isValidLocale(locale) ? locale : DEFAULT_LOCALE;
  const nextLocale = getNextLocale(currentLocale);

  return (
    <button
      onClick={() => router.replace(pathname, { locale: nextLocale })}
      aria-label={nextLocale === 'kr' ? t('switchToKorean') : t('switchToEnglish')}
      className="rounded-full px-3 py-1.5 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
    >
      {nextLocale.toUpperCase()}
    </button>
  );
};
