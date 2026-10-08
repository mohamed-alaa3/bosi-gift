/**
 * The API HTML-escapes user text on input. Angular interpolation is already
 * XSS-safe, so turn the entities back into characters before DISPLAYING or
 * PRE-FILLING an edit form (otherwise edits would double-escape).
 */
export function decodeEntities(text: string | null | undefined): string {
  return (text ?? '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&amp;/g, '&');
}
