import { Pipe, PipeTransform, inject } from '@angular/core';
import { LanguageService } from '../../core/services/language.service';
import { LocalizedText } from '../../core/models';

/**
 * Picks the correct translation from a LocalizedText object based on
 * the current language. Falls back to the other language if the preferred is empty.
 *
 * Usage: {{ product.name | localized }}
 */
@Pipe({
  name: 'localized',
  standalone: true,
  pure: false, // re-evaluates when language changes
})
export class LocalizedPipe implements PipeTransform {
  private language = inject(LanguageService);

  transform(value: LocalizedText | null | undefined): string {
    if (!value) return '';
    const lang = this.language.current();
    const primary = value[lang];
    if (primary && primary.trim()) return primary;
    const fallback = lang === 'en' ? value.ar : value.en;
    return fallback || '';
  }
}