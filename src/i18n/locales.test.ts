import { describe, expect, it } from 'vitest';
import { getNextLocale, isValidLocale, LOCALES } from './locales';

describe('isValidLocale', () => {
  it('accepts every configured locale', () => {
    for (const locale of LOCALES) {
      expect(isValidLocale(locale)).toBe(true);
    }
  });

  it('rejects unsupported locale strings', () => {
    expect(isValidLocale('fr')).toBe(false);
    expect(isValidLocale('')).toBe(false);
    expect(isValidLocale('EN')).toBe(false);
  });
});

describe('getNextLocale', () => {
  it('toggles en to kr', () => {
    expect(getNextLocale('en')).toBe('kr');
  });

  it('toggles kr to en', () => {
    expect(getNextLocale('kr')).toBe('en');
  });
});
