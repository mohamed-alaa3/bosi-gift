import { DOCUMENT } from '@angular/common';
import { Inject, Injectable, signal, computed, effect } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { environment } from '../../../environments/environment';

export type AppLanguage = 'en' | 'ar';

const STORAGE_KEY = 'habiba.lang';
const SUPPORTED: AppLanguage[] = ['en', 'ar'];

@Injectable({ providedIn: 'root' })
export class LanguageService {
  /** Current language as a signal. */
  private readonly _current = signal<AppLanguage>('en');
  readonly current = this._current.asReadonly();

  /** Derived: is the current language RTL? */
  readonly isRtl = computed(() => this._current() === 'ar');

  /** Derived: HTML `dir` value. */
  readonly dir = computed<'ltr' | 'rtl'>(() => (this.isRtl() ? 'rtl' : 'ltr'));

  constructor(
    @Inject(DOCUMENT) private doc: Document,
    private translate: TranslateService
  ) {
    // Ensure ngx-translate knows both languages
    this.translate.addLangs(SUPPORTED);
  }

  /**
   * Initializes the language from localStorage or system preference.
   * Called once from App root.
   */
  initialize(): void {
    const stored = this.readStored();
    const initial: AppLanguage = stored ?? 'en';

    this.apply(initial);
  }

  /**
   * Switches the active language.
   */
  use(lang: AppLanguage): void {
    if (!SUPPORTED.includes(lang)) return;
    if (lang === this._current()) return;

    this.apply(lang);
  }

  /**
   * Toggle between en <-> ar.
   */
  toggle(): void {
    this.use(this._current() === 'en' ? 'ar' : 'en');
  }

  /**
   * Applies the language: updates translate service, <html lang>, <html dir>, and localStorage.
   */
  private apply(lang: AppLanguage): void {
    this._current.set(lang);

    // Tell ngx-translate
    this.translate.use(lang);

    // Update the <html> element
    const html = this.doc.documentElement;
    html.setAttribute('lang', lang);
    html.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');

    // Persist
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* ignore — storage might be disabled */
    }
  }

  private readStored(): AppLanguage | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw && SUPPORTED.includes(raw as AppLanguage)) {
        return raw as AppLanguage;
      }
    } catch {
      /* ignore */
    }
    return null;
  }
}   