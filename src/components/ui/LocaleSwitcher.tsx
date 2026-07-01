'use client';

import { useLocale } from 'next-intl';
import { getNextLocale } from '@/i18n/locales';
import { usePathname, useRouter } from '@/i18n/navigation';

export const LocaleSwitcher = () => {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const nextLocale = getNextLocale(locale as 'en' | 'kr');

  return (
    <button
      onClick={() => router.replace(pathname, { locale: nextLocale })}
      aria-label={`Switch to ${nextLocale === 'kr' ? 'Korean' : 'English'}`}
      className="rounded-full px-3 py-1.5 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
    >
      {nextLocale.toUpperCase()}
    </button>
  );
};
