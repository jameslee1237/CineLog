export const LOCALES = ['en', 'kr'] as const;

export type TLocale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: TLocale = 'en';

export const isValidLocale = (value: string): value is TLocale =>
  (LOCALES as readonly string[]).includes(value);

export const getNextLocale = (current: TLocale): TLocale =>
  current === 'en' ? 'kr' : 'en';
