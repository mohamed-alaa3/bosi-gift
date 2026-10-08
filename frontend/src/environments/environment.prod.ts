/**
 * Production environment.
 * Update apiBaseUrl when deploying.
 */
export const environment = {
  production: true,
  apiBaseUrl: 'https://api.habiba-store.example/api',
  /** Public site origin, no trailing slash. Used to build absolute og:url / og:image values. */
  siteUrl: 'https://habiba-store.example',
  /** WhatsApp number in international format, digits only (no +, spaces or dashes). Local: 01008150149 */
  whatsappNumber: '201008150149',
  defaultLanguage: 'en',
  supportedLanguages: ['en', 'ar'] as const,
};
