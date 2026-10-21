import { Pipe, PipeTransform, inject } from '@angular/core';
import { LanguageService } from '../../core/services/language.service';
import { formatNumber, localizeDigits } from '../utils/format';

/**
 * Shows numbers/strings with Arabic-Indic digits when the language is Arabic.
 * Usage: {{ count | localDigits }}  /  {{ dateText | localDigits }}
 */
@Pipe({ name: 'localDigits', standalone: true, pure: false })
export class LocalDigitsPipe implements PipeTransform {
  private language = inject(LanguageService);

  transform(value: number | string | null | undefined): string {
    if (value == null || value === '') return '';
    const lang = this.language.current();
    return typeof value === 'number' ? formatNumber(value, lang, 2) : localizeDigits(value, lang);
  }
}
