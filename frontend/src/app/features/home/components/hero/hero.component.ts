import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, timeout } from 'rxjs';
import { GiftIconComponent } from '../../../../shared/components/gift-icon/gift-icon.component';
import { LocalizedPipe } from '../../../../shared/pipes/localized.pipe';

import { LanguageService } from '../../../../core/services/language.service';
import { BannerService } from '../../../../core/services/banner.service';
import { Banner, LocalizedText } from '../../../../core/models';

export interface HeroSlide {
  id: string;
  image: string;               // e.g. 'assets/images/hero/hero-1.jpg'
  eyebrowKey: string;          // translation key
  titleKey: string;
  subtitleKey: string;
  primaryCta: {
    labelKey: string;
    link: string | unknown[];
  };
  secondaryCta?: {
    labelKey: string;
    link: string | unknown[];
  };
  /** Optional: focal point for background image on mobile */
  focalPoint?: string; // e.g. 'center', 'top'
  /** Set when the slide comes from an admin-managed banner. */
  banner?: {
    title: LocalizedText;
    subtitle: LocalizedText;
    buttonText: LocalizedText;
    buttonLink: string;
  };
}

const BANNERS_TIMEOUT_MS = 4000;
const FALLBACK_IMAGE = 'assets/images/hero/hero-main.jpg';

const AUTOPLAY_INTERVAL_MS = 5500;
const TRANSITION_MS = 700;

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe, LocalizedPipe, GiftIconComponent],
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.scss',
})
export class HeroComponent {
  private language = inject(LanguageService);
  private destroyRef = inject(DestroyRef);
  private bannerService = inject(BannerService);

  readonly autoplay = input<boolean>(true);
  readonly intervalMs = input<number>(AUTOPLAY_INTERVAL_MS);

  /** Built-in slides — used only when no active hero banners are available. */
  private readonly fallbackSlides: HeroSlide[] = [
    {
      id: 'slide-1',
      image: FALLBACK_IMAGE,
      eyebrowKey: 'home.hero.eyebrow',
      titleKey: 'home.hero.title',
      subtitleKey: 'home.hero.subtitle',
      primaryCta: { labelKey: 'home.hero.shopNow', link: '/shop' },
      secondaryCta: { labelKey: 'home.hero.giftGuide', link: '/gifts' },
      focalPoint: 'center',
    },
  ];

  /** Empty until the banners request settles, so the hero never flashes the wrong content. */
  protected readonly slides = signal<HeroSlide[]>([]);

  protected readonly currentIndex = signal(0);
  protected readonly isPaused = signal(false);
  protected readonly isTransitioning = signal(false);
  protected readonly prefersReducedMotion = signal(false);
  protected readonly direction = signal<1 | -1>(1); // 1 = next, -1 = prev

  private autoplayId?: number;
  private readonly sliderRef = viewChild<ElementRef<HTMLElement>>('sliderEl');

  protected readonly currentSlide = computed(() => this.slides()[this.currentIndex()]);
  protected readonly totalSlides = computed(() => this.slides().length);
  protected readonly hasMultipleSlides = computed(() => this.slides().length > 1);

  constructor() {
    // Detect reduced motion preference
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.prefersReducedMotion.set(mq.matches);
      const handler = (e: MediaQueryListEvent) => this.prefersReducedMotion.set(e.matches);
      mq.addEventListener?.('change', handler);
      this.destroyRef.onDestroy(() => mq.removeEventListener?.('change', handler));
    }

    // Effect: start / stop autoplay based on state
    effect(() => {
      const shouldAutoplay =
        this.autoplay() &&
        this.hasMultipleSlides() &&
        !this.isPaused() &&
        !this.prefersReducedMotion();

      this.stopAutoplay();
      if (shouldAutoplay) this.startAutoplay();
    });

    this.destroyRef.onDestroy(() => this.stopAutoplay());

    this.loadBanners();
  }

  /** Loads active hero banners from the API; falls back to the built-in slide. */
  private loadBanners(): void {
    this.bannerService
      .list('hero')
      .pipe(
        timeout(BANNERS_TIMEOUT_MS),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        const banners = (res?.success && Array.isArray(res.data) ? res.data : []).filter(
          (b) => b && b.isActive !== false && !!(b.imageUrl || b.image),
        );
        this.currentIndex.set(0);
        this.slides.set(
          banners.length > 0 ? banners.map((b) => this.toSlide(b)) : this.fallbackSlides,
        );
      });
  }

  private toSlide(b: Banner): HeroSlide {
    return {
      id: `banner-${b._id}`,
      image: b.imageUrl || b.image,
      eyebrowKey: '',
      titleKey: '',
      subtitleKey: '',
      primaryCta: { labelKey: '', link: b.buttonLink || '' },
      focalPoint: 'center',
      banner: {
        title: b.title,
        subtitle: b.subtitle,
        buttonText: b.buttonText,
        buttonLink: b.buttonLink || '',
      },
    };
  }

  /** CSS background: banner image first, built-in image as a safety net if it fails to load. */
  protected backgroundFor(slide: HeroSlide): string {
    const url = (u: string) => `url("${u.replace(/"/g, '%22')}")`;
    return slide.banner && slide.image !== FALLBACK_IMAGE
      ? `${url(slide.image)}, ${url(FALLBACK_IMAGE)}`
      : url(slide.image);
  }

  protected isExternal(link: string): boolean {
    return /^(https?:)?\/\//i.test(link) || /^(mailto|tel):/i.test(link);
  }

  protected internalLink(link: string): string {
    return link.startsWith('/') ? link : `/${link}`;
  }

  // --- Controls ---

  protected next(): void {
    if (!this.hasMultipleSlides() || this.isTransitioning()) return;
    this.direction.set(1);
    this.currentIndex.update((i) => (i + 1) % this.totalSlides());
    this.flashTransition();
  }

  protected prev(): void {
    if (!this.hasMultipleSlides() || this.isTransitioning()) return;
    this.direction.set(-1);
    this.currentIndex.update((i) => (i - 1 + this.totalSlides()) % this.totalSlides());
    this.flashTransition();
  }

  protected goTo(index: number): void {
    if (index === this.currentIndex() || this.isTransitioning()) return;
    this.direction.set(index > this.currentIndex() ? 1 : -1);
    this.currentIndex.set(index);
    this.flashTransition();
  }

  // --- Pause on hover / focus ---

  protected onMouseEnter(): void {
    this.isPaused.set(true);
  }

  protected onMouseLeave(): void {
    this.isPaused.set(false);
  }

  protected onFocusIn(): void {
    this.isPaused.set(true);
  }

  protected onFocusOut(): void {
    this.isPaused.set(false);
  }

  // --- Keyboard ---

  @HostListener('keydown', ['$event'])
  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowRight') {
      // RTL: right arrow = previous
      const isRtl = this.language.isRtl();
      isRtl ? this.prev() : this.next();
    } else if (event.key === 'ArrowLeft') {
      const isRtl = this.language.isRtl();
      isRtl ? this.next() : this.prev();
    } else if (event.key === 'Home') {
      event.preventDefault();
      this.goTo(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      this.goTo(this.totalSlides() - 1);
    }
  }

  // --- Internals ---

  private startAutoplay(): void {
    this.stopAutoplay();
    this.autoplayId = window.setInterval(() => {
      // Skip if document hidden (tab background)
      if (typeof document !== 'undefined' && document.hidden) return;
      this.next();
    }, this.intervalMs());
  }

  private stopAutoplay(): void {
    if (this.autoplayId !== undefined) {
      window.clearInterval(this.autoplayId);
      this.autoplayId = undefined;
    }
  }

  private flashTransition(): void {
    if (this.prefersReducedMotion()) return;
    this.isTransitioning.set(true);
    window.setTimeout(() => this.isTransitioning.set(false), TRANSITION_MS);
  }

  // Pause when the tab is hidden
  @HostListener('document:visibilitychange')
  protected onVisibilityChange(): void {
    if (typeof document !== 'undefined' && document.hidden) {
      this.stopAutoplay();
    } else if (
      this.autoplay() &&
      this.hasMultipleSlides() &&
      !this.isPaused() &&
      !this.prefersReducedMotion()
    ) {
      this.startAutoplay();
    }
  }
}