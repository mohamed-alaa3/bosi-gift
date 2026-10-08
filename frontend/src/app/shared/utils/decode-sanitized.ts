/**
 * Decodes HTML entities that the backend's XSS sanitizer produces.
 *
 * The sanitizer stores ' " < > / as HTML entities (&#x27;, &quot;,
 * &lt;, &gt;, &#x2F;). This helper converts them back to their
 * original characters for display.
 *
 * Applied to fields like cancellation reasons, notes, and names
 * that pass through the sanitizer.
 */
export function decodeSanitized(value: string | null | undefined): string {
  if (!value) return '';

  return value
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&'); // must be last to avoid double-decoding
}
