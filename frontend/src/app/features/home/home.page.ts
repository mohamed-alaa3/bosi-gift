import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

import { RevealOnScrollDirective } from '../../shared/directives/reveal-on-scroll.directive';
import { HeroComponent } from './components/hero/hero.component';
import { ShopByCategoryComponent } from './components/shop-by-category/shop-by-category.component';
import { ShopByOccasionComponent } from './components/shop-by-occasion/shop-by-occasion.component';
import { ShopByRecipientComponent } from './components/shop-by-recipient/shop-by-recipient.component';
import { GiftShowcaseComponent } from './components/gift-showcase/gift-showcase.component';
import { GiftFinderComponent } from './components/gift-finder/gift-finder.component';
import { GiftBuilderCtaComponent } from './components/gift-builder-cta/gift-builder-cta.component';
import { CustomerReviewsComponent } from './components/customer-reviews/customer-reviews.component';
import { GiftWallComponent } from './components/gift-wall/gift-wall.component';
import { BrandPromiseComponent } from './components/brand-promise/brand-promise.component';
import { NewsletterCtaComponent } from './components/newsletter-cta/newsletter-cta.component';
import { TrustBadgesComponent } from './components/trust-badges/trust-badges.component';

/**
 * Homepage = a gift-shopping journey:
 * hero → trust → who → occasion → trending → daily offers → ready boxes →
 * featured → categories → finder → wrapping → reviews → wall → promise → CTA.
 * Product showcases render only when the backend returns real products.
 */
@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [
    CommonModule,
    RevealOnScrollDirective,
    HeroComponent,
    TrustBadgesComponent,
    ShopByRecipientComponent,
    ShopByOccasionComponent,
    GiftShowcaseComponent,
    ShopByCategoryComponent,
    GiftFinderComponent,
    GiftBuilderCtaComponent,
    CustomerReviewsComponent,
    GiftWallComponent,
    BrandPromiseComponent,
    NewsletterCtaComponent,
  ],
  template: `
    <app-hero />

    <div appRevealOnScroll variant="up">
      <app-trust-badges />
    </div>

    <app-shop-by-recipient />

    <app-shop-by-occasion />

    <app-gift-showcase kind="trending" />

    <app-gift-showcase kind="offers" />

    <app-gift-showcase kind="boxes" />

    <app-gift-showcase kind="featured" />

    <!-- shop-by-category reveals its own header + card grid internally -->
    <app-shop-by-category />

    <app-gift-finder />

    <div appRevealOnScroll variant="up">
      <app-gift-builder-cta />
    </div>

    <app-customer-reviews />

    <app-gift-wall />

    <div appRevealOnScroll variant="up">
      <app-brand-promise />
    </div>

    <div appRevealOnScroll variant="up">
      <app-newsletter-cta />
    </div>
  `,
  styles: [``],
})
export class HomePage {}
