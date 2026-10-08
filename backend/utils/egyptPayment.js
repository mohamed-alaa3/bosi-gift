/**
 * Normalisers for the numbers customers transfer money to.
 * Accept what an admin would naturally type (spaces, dashes, +20, 0020,
 * Arabic-Indic digits) and store one clean canonical form.
 */

const ARABIC_INDIC = "٠١٢٣٤٥٦٧٨٩";
const EXTENDED_ARABIC_INDIC = "۰۱۲۳۴۵۶۷۸۹";

function toLatinDigits(value) {
  return String(value).replace(/[٠-٩۰-۹]/g, (ch) => {
    const a = ARABIC_INDIC.indexOf(ch);
    return String(a !== -1 ? a : EXTENDED_ARABIC_INDIC.indexOf(ch));
  });
}

/**
 * Egyptian mobile → local 11-digit form "01XXXXXXXXX" (prefixes 010/011/012/015).
 * Returns null when it isn't a valid Egyptian mobile number.
 */
function normalizeEgyptMobile(input) {
  if (input === null || input === undefined) return null;

  let digits = toLatinDigits(input).replace(/[\s\-().]/g, "");

  if (digits.startsWith("+20")) digits = "0" + digits.slice(3);
  else if (digits.startsWith("0020")) digits = "0" + digits.slice(4);
  else if (/^20\d{10}$/.test(digits)) digits = "0" + digits.slice(2);
  else if (/^1[0125]\d{8}$/.test(digits)) digits = "0" + digits; // typed without the leading 0

  return /^01[0125]\d{8}$/.test(digits) ? digits : null;
}

/**
 * InstaPay accepts a mobile number OR a payment address (name@bank).
 * Mobiles are normalised like above; addresses are lower-cased.
 * Returns null when neither form matches.
 */
function normalizeInstapay(input) {
  if (input === null || input === undefined) return null;

  const raw = String(input).trim();
  if (!raw) return null;

  const mobile = normalizeEgyptMobile(raw);
  if (mobile) return mobile;

  const address = raw.toLowerCase();
  return /^[a-z0-9._-]{3,40}@[a-z]{3,20}$/.test(address) ? address : null;
}

module.exports = { toLatinDigits, normalizeEgyptMobile, normalizeInstapay };
