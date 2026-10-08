import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { RevealOnScrollDirective } from '../../shared/directives/reveal-on-scroll.directive';

interface StaticPageConfig {
  slug: string;
  titleKey: string;
  introKey: string;
  sectionsKey: string;
}

const PAGES: Record<string, StaticPageConfig> = {
  'privacy-policy': {
    slug: 'privacy-policy',
    titleKey: 'staticPages.privacy.title',
    introKey: 'staticPages.privacy.intro',
    sectionsKey: 'staticPages.privacy.sections',
  },
  'terms-of-service': {
    slug: 'terms-of-service',
    titleKey: 'staticPages.terms.title',
    introKey: 'staticPages.terms.intro',
    sectionsKey: 'staticPages.terms.sections',
  },
  'shipping-policy': {
    slug: 'shipping-policy',
    titleKey: 'staticPages.shipping.title',
    introKey: 'staticPages.shipping.intro',
    sectionsKey: 'staticPages.shipping.sections',
  },
  'returns-exchanges': {
    slug: 'returns-exchanges',
    titleKey: 'staticPages.returns.title',
    introKey: 'staticPages.returns.intro',
    sectionsKey: 'staticPages.returns.sections',
  },
  'gift-cards': {
    slug: 'gift-cards',
    titleKey: 'staticPages.giftCards.title',
    introKey: 'staticPages.giftCards.intro',
    sectionsKey: 'staticPages.giftCards.sections',
  },
};

interface StaticSection {
  heading: string;
  body: string;
}

@Component({
  selector: 'app-static-page',
  standalone: true,
  imports: [CommonModule, TranslatePipe, RevealOnScrollDirective],
  templateUrl: './static-page.component.html',
  styleUrl: './static-page.component.scss',
})
export class StaticPageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  protected readonly slug = signal<string>('');
  protected readonly config = computed<StaticPageConfig | null>(() => PAGES[this.slug()] ?? null);
  protected readonly sections = signal<StaticSection[]>([]);

  ngOnInit(): void {
    // Route path (e.g. 'privacy-policy')
    const path = this.route.snapshot.routeConfig?.path ?? '';
    this.slug.set(path);

    const cfg = PAGES[path];
    if (!cfg) return;

    // Load sections (translated array)
    this.translate
      .get(cfg.sectionsKey)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((raw) => {
        this.sections.set(Array.isArray(raw) ? (raw as StaticSection[]) : []);
      });

    // Reload on language change
    this.translate.onLangChange.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.translate.get(cfg.sectionsKey).subscribe((raw) => {
        this.sections.set(Array.isArray(raw) ? (raw as StaticSection[]) : []);
      });
    });
  }
}
