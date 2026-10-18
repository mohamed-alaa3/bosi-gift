import { Component, DestroyRef, OnInit, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, of, timeout } from 'rxjs';

import { Banner, BannerPosition } from '../../../../core/models';
import { BannerService } from '../../../../core/services/banner.service';
import { LocalizedPipe } from '../../../../shared/pipes/localized.pipe';

const FETCH_TIMEOUT_MS = 6000;

/**
 * Renders the active admin-managed banners for a non-hero position
 * ('promo' | 'home-mid'). Renders nothing when there are none or the
 * request fails.
 */
@Component({
  selector: 'app-banner-strip',
  standalone: true,
  imports: [RouterLink, LocalizedPipe],
  template: `
    @if (banners().length > 0) {
      <section class="banner-strip" [attr.aria-label]="position()">
        <div class="banner-strip__inner">
          @for (b of banners(); track b._id) {
            <article class="banner-strip__card">
              @if (!failed().has(b._id)) {
                <img
                  class="banner-strip__img"
                  [src]="b.imageUrl || b.image"
                  [alt]="b.title | localized"
                  loading="lazy"
                  decoding="async"
                  (error)="onImageError(b._id)"
                />
              }
              <div class="banner-strip__overlay" aria-hidden="true"></div>
              <div class="banner-strip__content">
                <h2 class="banner-strip__title">{{ b.title | localized }}</h2>
                @if ((b.subtitle | localized); as sub) {
                  <p class="banner-strip__subtitle">{{ sub }}</p>
                }
                @if ((b.buttonText | localized); as label) {
                  @if (b.buttonLink) {
                    @if (isExternal(b.buttonLink)) {
                      <a class="banner-strip__cta" [href]="b.buttonLink" rel="noopener">{{ label }}</a>
                    } @else {
                      <a class="banner-strip__cta" [routerLink]="internalLink(b.buttonLink)">{{ label }}</a>
                    }
                  }
                }
              </div>
            </article>
          }
        </div>
      </section>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .banner-strip {
        padding: 1.5rem 1rem;
      }
      .banner-strip__inner {
        display: grid;
        gap: 1rem;
        max-width: 1280px;
        margin-inline: auto;
      }
      .banner-strip__card {
        position: relative;
        overflow: hidden;
        border-radius: var(--radius-xl, 1.25rem);
        min-height: clamp(180px, 32vw, 320px);
        background: var(--brand-ink, #1f3f40);
        color: #fff;
        display: flex;
        align-items: center;
      }
      .banner-strip__img {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .banner-strip__overlay {
        position: absolute;
        inset: 0;
        background: linear-gradient(90deg, rgba(18, 48, 49, 0.6), rgba(18, 48, 49, 0.1));
      }
      :host-context([dir='rtl']) .banner-strip__overlay {
        background: linear-gradient(270deg, rgba(18, 48, 49, 0.6), rgba(18, 48, 49, 0.1));
      }
      .banner-strip__content {
        position: relative;
        z-index: 1;
        padding: 1.5rem clamp(1.25rem, 4vw, 3rem);
        max-width: 560px;
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
        align-items: flex-start;
      }
      .banner-strip__title {
        margin: 0;
        font-family: var(--font-display);
        font-weight: 400;
        font-size: clamp(1.5rem, 3.2vw, 2.5rem);
        line-height: 1.15;
      }
      .banner-strip__subtitle {
        margin: 0;
        font-size: clamp(0.9rem, 1.4vw, 1.05rem);
        line-height: 1.5;
        color: rgba(255, 255, 255, 0.9);
      }
      .banner-strip__cta {
        margin-top: 0.4rem;
        display: inline-flex;
        align-items: center;
        height: 44px;
        padding-inline: 1.4rem;
        border-radius: var(--radius-full, 999px);
        background: var(--brand-primary, #ca4562);
        color: #fff;
        font-weight: 600;
        font-size: 0.9rem;
        text-decoration: none;
      }
      .banner-strip__cta:hover {
        background: var(--brand-primary-hover, #b33a55);
      }
      .banner-strip__cta:focus-visible {
        outline: 2px solid #fff;
        outline-offset: 3px;
      }
    `,
  ],
})
export class BannerStripComponent implements OnInit {
  private bannerService = inject(BannerService);
  private destroyRef = inject(DestroyRef);

  readonly position = input.required<Exclude<BannerPosition, 'hero'>>();

  protected readonly banners = signal<Banner[]>([]);
  protected readonly failed = signal<Set<string>>(new Set());

  ngOnInit(): void {
    // Position is a static input per placement, so one load is enough.
    this.load();
  }

  private load(): void {
    this.bannerService
      .list(this.position())
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        const list = res?.success && Array.isArray(res.data) ? res.data : [];
        this.banners.set(list.filter((b) => b && b.isActive !== false && !!(b.imageUrl || b.image)));
      });
  }

  protected onImageError(id: string): void {
    this.failed.update((s) => new Set(s).add(id));
  }

  protected isExternal(link: string): boolean {
    return /^(https?:)?\/\//i.test(link) || /^(mailto|tel):/i.test(link);
  }

  protected internalLink(link: string): string {
    return link.startsWith('/') ? link : `/${link}`;
  }
}
