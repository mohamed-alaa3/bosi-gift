/**
 * Development environment.
 * API_BASE_URL points to the local backend.
 */
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:5000/api',
  /** Public site origin, no trailing slash. Used to build absolute og:url / og:image values. */
  siteUrl: 'http://localhost:4200',
  /** WhatsApp number in international format, digits only (no +, spaces or dashes). Local: 01008150149 */
  whatsappNumber: '201008150149',
  defaultLanguage: 'en',
  supportedLanguages: ['en', 'ar'] as const,
};
