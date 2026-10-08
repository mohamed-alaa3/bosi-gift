import { DOCUMENT } from '@angular/common';
import { Inject, Injectable, signal, computed } from '@angular/core';

export type AppTheme = 'light' | 'dark';

const STORAGE_KEY = 'habiba.theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _current = signal<AppTheme>('light');
  readonly current = this._current.asReadonly();

  readonly isDark = computed(() => this._current() === 'dark');

  constructor(@Inject(DOCUMENT) private doc: Document) {}

  /**
   * Initialize theme from localStorage or system preference.
   * Called once from App root.
   */
  initialize(): void {
    const stored = this.readStored();
    const initial: AppTheme = stored ?? this.getSystemPreference();
    this.apply(initial);
  }

  /**
   * Set the active theme.
   */
  set(theme: AppTheme): void {
    if (theme === this._current()) return;
    this.apply(theme);
  }

  /**
   * Toggle between light and dark.
   */
  toggle(): void {
    this.set(this._current() === 'light' ? 'dark' : 'light');
  }

  /**
   * Applies the theme: sets `data-theme` on <html>, saves to localStorage.
   * Adds a `.theme-transition` class briefly so the theme change animates.
   */
  private apply(theme: AppTheme): void {
    const html = this.doc.documentElement;

    // Briefly enable smooth transition
    html.classList.add('theme-transition');
    window.setTimeout(() => html.classList.remove('theme-transition'), 300);

    html.setAttribute('data-theme', theme);
    this._current.set(theme);

    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }

  private readStored(): AppTheme | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === 'light' || raw === 'dark') return raw;
    } catch {
      /* ignore */
    }
    return null;
  }

  private getSystemPreference(): AppTheme {
    if (typeof window === 'undefined' || !window.matchMedia) return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}