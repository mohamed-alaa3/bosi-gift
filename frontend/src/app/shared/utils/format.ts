/**
 * Locale-aware number/money formatting shared by the admin dashboard.
 * Arabic uses Arabic-Indic digits (ar-EG); English uses Latin digits.
 * Currency is always EGP, with the same symbols as the store's price pipe.
 */

export type FormatLang = 'ar' | 'en';

const numLocale = (lang: FormatLang): string => (lang === 'ar' ? 'ar-EG' : 'en-US');

/** Plain number, e.g. 1,234 / ١٬٢٣٤. */
export function formatNumber(value: number, lang: FormatLang, maxFractionDigits = 0): string {
  return new Intl.NumberFormat(numLocale(lang), { maximumFractionDigits: maxFractionDigits }).format(value);
}

/** Money in EGP with the store's symbol ("LE" / "ج.م."). */
export function formatMoney(value: number, lang: FormatLang, fractionDigits = 0): string {
  const amount = new Intl.NumberFormat(numLocale(lang), {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
  return `${amount} ${lang === 'ar' ? 'ج.م.' : 'LE'}`;
}

/** Percentage with one decimal, e.g. 12.5% / ١٢٫٥٪. */
export function formatPercent(value: number, lang: FormatLang): string {
  const n = new Intl.NumberFormat(numLocale(lang), {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
  return lang === 'ar' ? `${n}٪` : `${n}%`;
}

/** Converts Latin digits in any string (dates, labels) to Arabic-Indic for Arabic. */
export function localizeDigits(text: string, lang: FormatLang): string {
  if (lang !== 'ar') return text;
  return text.replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);
}
