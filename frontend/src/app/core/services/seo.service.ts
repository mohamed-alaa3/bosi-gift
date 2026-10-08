import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { filter, startWith } from 'rxjs';

interface SeoEntry {
  title: string;
  description: string;
}

/**
 * Centralized SEO service.
 *
 * Reads `seo.<seoKey>.title` and `seo.<seoKey>.description` from the active
 * i18n file (en.json / ar.json) and applies them to:
 *   - <title>
 *   - <meta name="description">
 *   - Open Graph / Twitter mirrors
 *
 * Re-applies on:
 *   - Router NavigationEnd (route change)
 *   - TranslateService.onLangChange (language switch)
 *
 * Call `init()` once from the App root component.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly doc = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  /** Last seoKey we rendered — needed for re-rendering on lang change. */
  private currentSeoKey: string | null = null;

  init(): void {
    // 1. React to route changes.
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        startWith(null),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        const key = this.resolveSeoKey();
        this.currentSeoKey = key;
        this.apply(key);
      });

    // 2. React to language changes.
    this.translate.onLangChange.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.apply(this.currentSeoKey);
      this.applyHtmlLangAndDir();
    });

    // 3. Initial html lang/dir.
    this.applyHtmlLangAndDir();
  }

  /**
   * Resolves the closest `data.seoKey` from the active route tree.
   */
  private resolveSeoKey(): string | null {
    // Start from the deepest activated route.
    let current: ActivatedRoute | null = this.route;

    // Walk down to the deepest active child.
    while (current) {
      const children: ActivatedRoute[] = current.children;
      if (children.length === 0) break;
      current = children[0];
    }

    // Walk back up looking for `data.seoKey`.
    while (current) {
      const key = current.snapshot?.data?.['seoKey'] as string | undefined;
      if (key) return key;
      current = current.parent;
    }

    return null;
  }

  /**
   * Applies the SEO entry for a given key.
   */
  private apply(key: string | null): void {
    if (!key) return;

    const raw = this.translate.instant(`seo.${key}`) as unknown;

    if (!raw || typeof raw === 'string') {
      // Key missing → leave the current title untouched.
      return;
    }

    const entry = raw as SeoEntry;
    const title = entry.title || '';
    const description = entry.description || '';

    if (title) this.title.setTitle(title);

    if (description) {
      this.meta.updateTag({ name: 'description', content: description });
      this.meta.updateTag({ property: 'og:title', content: title });
      this.meta.updateTag({ property: 'og:description', content: description });
      this.meta.updateTag({ name: 'twitter:title', content: title });
      this.meta.updateTag({
        name: 'twitter:description',
        content: description,
      });
    }
  }

  /**
   * Mirrors the current language into <html lang> and <html dir>.
   */
  private applyHtmlLangAndDir(): void {
    // `currentLang` is a Signal<string | null> in newer ngx-translate;
    // fall back to 'en' when null.
    const lang: string = this.translate.currentLang() ?? 'en';
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    const html = this.doc.documentElement;
    html.setAttribute('lang', lang);
    html.setAttribute('dir', dir);
  }
}
