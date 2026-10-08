import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { catchError, of, timeout } from 'rxjs';

import { Product } from '../../../../core/models';
import { ProductService } from '../../../../core/services/product.service';
import { LocalizedPipe } from '../../../../shared/pipes/localized.pipe';
import { SafeImagePipe } from '../../../../shared/pipes/safe-image.pipe';
import { RevealOnScrollDirective } from '../../../../shared/directives/reveal-on-scroll.directive';

const FETCH_TIMEOUT_MS = 8000;
const MIN_PHOTOS = 3;
const ROTATIONS = ['-3deg', '2deg', '-1.5deg', '2.8deg', '-2.2deg', '1.4deg'];
const STICKERS = ['💕', '✨', '🎀', '🌸', '🧸', '🍫'];
const TAPES = ['', 'gd-tape--teal', 'gd-tape--sun'];

/**
 * "From the world of Bosi Gift" — a Polaroid wall built from REAL product
 * photos (newest products). There is no Instagram integration in this
 * project, so no social posts are invented; each Polaroid links to its
 * product. Renders nothing until there are enough real photos.
 */
@Component({
  selector: 'app-gift-wall',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslatePipe, LocalizedPipe, SafeImagePipe, RevealOnScrollDirective],
  template: `
    @if (photos().length >= minPhotos) {
      <section class="wall gd-band" aria-labelledby="wall-title">
        <div class="gd">
          <header class="gd-head" appRevealOnScroll>
            <p class="gd-eyebrow">{{ 'home.wall.eyebrow' | translate }}</p>
            <h2 id="wall-title" class="gd-title">{{ 'home.wall.title' | translate }}</h2>
            <p class="gd-sub">{{ 'home.wall.subtitle' | translate }}</p>
          </header>

          <ul class="wall__grid" appRevealOnScroll [stagger]="true" [delay]="70">
            @for (p of photos(); track p._id; let i = $index) {
              <li class="wall__item">
                <a class="gd-polaroid" [style.--rot]="rot(i)" [routerLink]="['/products', p.slug]">
                  <span class="gd-tape" [class]="tape(i)" aria-hidden="true"></span>
                  <img
                    class="wall__img img-fallback"
                    [src]="image(p) | safeImage"
                    [alt]="p.name | localized"
                    loading="lazy"
                    decoding="async"
                  />
                  <span class="wall__caption">{{ p.name | localized }}</span>
                  <span class="wall__sticker" aria-hidden="true">{{ sticker(i) }}</span>
                </a>
              </li>
            }
          </ul>

          <div class="wall__more">
            <a class="gd-btn gd-btn--ghost" routerLink="/shop">{{ 'home.wall.cta' | translate }}</a>
          </div>
        </div>
      </section>
    }
  `,
  styles: `
    :host { display: block; }

    .wall { background: linear-gradient(180deg, var(--bg-muted), var(--bg)); }

    .wall__grid {
      list-style: none;
      margin: 0;
      padding: 0.75rem 0 0;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1.75rem 1.25rem;
    }
    @media (min-width: 700px) { .wall__grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 2rem 1.75rem; } }
    @media (min-width: 1280px) { .wall__grid { grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 2rem 1.25rem; } }

    .gd-polaroid { display: block; text-decoration: none; }
    .gd-polaroid:focus-visible { outline: 3px solid var(--brand-secondary); outline-offset: 4px; }

    .wall__img { display: block; width: 100%; aspect-ratio: 1; object-fit: cover; background: var(--bg-muted); }

    .wall__caption {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      margin-top: 0.65rem;
      font-family: var(--font-display);
      font-size: 1.05rem;
      line-height: 1.3;
      text-align: center;
      color: #1f3f40;
    }

    .wall__sticker { position: absolute; bottom: -0.7rem; inset-inline-end: -0.5rem; font-size: 1.7rem; filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.2)); transform: rotate(10deg); }

    .wall__more { display: flex; justify-content: center; margin-top: 2.25rem; }
  `,
})
export class GiftWallComponent implements OnInit {
  private productService = inject(ProductService);
  private destroyRef = inject(DestroyRef);

  protected readonly minPhotos = MIN_PHOTOS;
  private readonly products = signal<Product[]>([]);
  protected readonly photos = computed(() => this.products().filter((p) => !!this.image(p)));

  ngOnInit(): void {
    this.productService
      .list({ limit: 6, sort: 'newest' })
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        if (res?.success) this.products.set(res.data ?? []);
      });
  }

  protected image(p: Product): string {
    return p.imageUrls?.[0] || p.images?.[0] || '';
  }
  protected rot(i: number): string {
    return ROTATIONS[i % ROTATIONS.length];
  }
  protected sticker(i: number): string {
    return STICKERS[i % STICKERS.length];
  }
  protected tape(i: number): string {
    return TAPES[i % TAPES.length];
  }
}
