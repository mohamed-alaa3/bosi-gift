import { Pipe, PipeTransform, inject } from '@angular/core';
import { LanguageService } from '../../core/services/language.service';

@Pipe({
  name: 'price',
  standalone: true,
  pure: false,
})
export class PricePipe implements PipeTransform {
  private language = inject(LanguageService);

  transform(value: number | null | undefined, currency?: string): string {
    if (value == null || isNaN(Number(value))) return '';

    const lang = this.language.current();
    const amount = Number(value);

    // Fixed currency for the whole store
    const curr = currency ?? 'EGP';

    // Format number with grouping and 2 decimals
    const numLocale = lang === 'ar' ? 'ar-EG' : 'en-US';
    const numFmt = new Intl.NumberFormat(numLocale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const formattedNumber = numFmt.format(amount);

    // Symbol per language — use "LE" in EN, "ج.م." in AR
    const symbol = curr === 'EGP' ? (lang === 'ar' ? 'ج.م.' : 'LE') : curr;

    // Order: number + symbol. In RTL, Arabic style usually puts symbol after.
    return `${formattedNumber} ${symbol}`;
  }
}
