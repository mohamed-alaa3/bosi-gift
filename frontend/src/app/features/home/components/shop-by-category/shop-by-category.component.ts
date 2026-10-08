import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { GiftIconComponent, GiftIconName } from '../../../../shared/components/gift-icon/gift-icon.component';
import { RevealOnScrollDirective } from '../../../../shared/directives/reveal-on-scroll.directive';

export interface HomeCategoryCard {
  id: string;
  image: string;
  labelKey: string;
  icon: GiftIconName;
  link: string | unknown[];
}

@Component({
  selector: 'app-shop-by-category',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe, RevealOnScrollDirective, GiftIconComponent],
  templateUrl: './shop-by-category.component.html',
  styleUrl: './shop-by-category.component.scss',
})
export class ShopByCategoryComponent {
  readonly titleKey = input<string>('home.shopByCategory.title');
  readonly subtitleKey = input<string>('home.shopByCategory.subtitle');

  protected readonly categories: HomeCategoryCard[] = [
    {
      id: 'personalized',
      icon: 'heart',
      image: 'assets/images/categories/personalized.jpg',
      labelKey: 'home.shopByCategory.personalized',
      link: ['/shop', { category: 'personalized' }],
    },
    {
      id: 'lifestyle',
      icon: 'flower',
      image: 'assets/images/categories/lifestyle.jpg',
      labelKey: 'home.shopByCategory.lifestyle',
      link: ['/shop', { category: 'lifestyle' }],
    },
    {
      id: 'home-decor',
      icon: 'house',
      image: 'assets/images/categories/home-decor.jpg',
      labelKey: 'home.shopByCategory.homeDecor',
      link: ['/shop', { category: 'home-decor' }],
    },
    {
      id: 'occasions',
      icon: 'gift',
      image: 'assets/images/categories/occasions.jpg',
      labelKey: 'home.shopByCategory.occasions',
      link: ['/shop', { category: 'occasions' }],
    },
  ];

  /** Hide a missing category photo so the decorative icon underneath shows through. */
  protected onImageError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }
}
