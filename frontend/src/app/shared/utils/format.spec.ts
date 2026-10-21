import { describe, expect, it } from 'vitest';

import { formatMoney, formatNumber, formatPercent, localizeDigits } from './format';

describe('dashboard formatting', () => {
  it('uses EGP with Latin digits in English', () => {
    expect(formatMoney(12345, 'en')).toBe('12,345 LE');
    expect(formatNumber(1200, 'en')).toBe('1,200');
    expect(formatPercent(12.5, 'en')).toBe('12.5%');
  });

  it('uses EGP with Arabic-Indic digits in Arabic', () => {
    expect(formatMoney(12345, 'ar')).toMatch(/^[٠-٩٬٫\s]+ ج\.م\.$/);
    expect(formatMoney(12345, 'ar')).not.toMatch(/[0-9]/);
    expect(formatNumber(1200, 'ar')).not.toMatch(/[0-9]/);
    expect(formatPercent(12.5, 'ar')).not.toMatch(/[0-9]/);
    expect(formatMoney(12345, 'ar')).not.toContain('$');
  });

  it('converts digits in plain strings only for Arabic', () => {
    expect(localizeDigits('10/21', 'ar')).toBe('١٠/٢١');
    expect(localizeDigits('10/21', 'en')).toBe('10/21');
  });
});
