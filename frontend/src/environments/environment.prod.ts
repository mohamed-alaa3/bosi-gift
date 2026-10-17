/**
 * Production environment.
 * Update apiBaseUrl when deploying.
 */
export const environment = {
  production: true,
  apiBaseUrl: 'https://bosi-gift-bail.vercel.app/api',
  /** Public site origin, no trailing slash. Used to build absolute og:url / og:image values. */
  siteUrl: 'https://bosi-gift.vercel.app',
  /** WhatsApp number in international format, digits only (no +, spaces or dashes). Local: 01008150149 */
  whatsappNumber: '201008150149',
  defaultLanguage: 'en',
  supportedLanguages: ['en', 'ar'] as const,
};
