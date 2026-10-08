/**
 * Client-side mirror of the backend normalisers (backend/utils/egyptPayment.js).
 * Used ONLY to give instant form feedback — the server validates and
 * normalises again and is the authority.
 */

const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩';
const EXTENDED_ARABIC_INDIC = '۰۱۲۳۴۵۶۷۸۹';

/** Converts Arabic-Indic / Persian digits to 0-9. */
export function toLatinDigits(value: string): string {
  return value.replace(/[٠-٩۰-۹]/g, (ch) => {
    const a = ARABIC_INDIC.indexOf(ch);
    return String(a !== -1 ? a : EXTENDED_ARABIC_INDIC.indexOf(ch));
  });
}

/** Egyptian mobile → "01XXXXXXXXX", or null when invalid. */
export function normalizeEgyptMobile(input: string): string | null {
  let digits = toLatinDigits(input).replace(/[\s\-().]/g, '');

  if (digits.startsWith('+20')) digits = '0' + digits.slice(3);
  else if (digits.startsWith('0020')) digits = '0' + digits.slice(4);
  else if (/^20\d{10}$/.test(digits)) digits = '0' + digits.slice(2);
  else if (/^1[0125]\d{8}$/.test(digits)) digits = '0' + digits;

  return /^01[0125]\d{8}$/.test(digits) ? digits : null;
}

/** InstaPay: a mobile number or an address like name@bank (lower-cased), else null. */
export function normalizeInstapay(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;

  const mobile = normalizeEgyptMobile(raw);
  if (mobile) return mobile;

  const address = raw.toLowerCase();
  return /^[a-z0-9._-]{3,40}@[a-z]{3,20}$/.test(address) ? address : null;
}
