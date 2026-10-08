import { CommonModule } from '@angular/common';
import { Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { LocalizedPipe } from '../../../../shared/pipes/localized.pipe';

import { Category } from '../../../../core/models';
import { OCCASIONS, RECIPIENTS } from '../../../../core/constants/gift-taxonomy';

export interface ShopFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  inStock?: boolean;
  onSale?: boolean;
  search?: string;
  // Gift discovery (all optional; map 1:1 to API query params)
  recipient?: string;
  occasion?: string;
  trending?: boolean;
  dailyOffer?: boolean;
  readyBox?: boolean;
}

export type ShopFlag = 'trending' | 'dailyOffer' | 'readyBox';

@Component({
  selector: 'app-filter-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, LocalizedPipe],
  templateUrl: './filter-sidebar.component.html',
  styleUrl: './filter-sidebar.component.scss',
})
export class FilterSidebarComponent {
  readonly categories = input<Category[]>([]);
  readonly value = input<ShopFilters>({});

  readonly valueChange = output<ShopFilters>();

  // Local working copy
  protected readonly draft = signal<ShopFilters>({});

  // Price range
  protected readonly minPriceInput = signal<number | null>(null);
  protected readonly maxPriceInput = signal<number | null>(null);

  protected readonly ratingOptions = [4, 3, 2, 1];
  protected readonly recipients = RECIPIENTS;
  protected readonly occasions = OCCASIONS;

  constructor() {
    // Sync from parent
    effect(() => {
      const v = this.value();
      this.draft.set({ ...v });
      this.minPriceInput.set(v.minPrice ?? null);
      this.maxPriceInput.set(v.maxPrice ?? null);
    });
  }

  // --- Gift discovery ---

  protected toggleRecipient(slug: string): void {
    const current = this.draft();
    this.emit({ ...current, recipient: current.recipient === slug ? undefined : slug });
  }

  protected toggleOccasion(slug: string): void {
    const current = this.draft();
    this.emit({ ...current, occasion: current.occasion === slug ? undefined : slug });
  }

  protected toggleFlag(flag: ShopFlag): void {
    const current = this.draft();
    this.emit({ ...current, [flag]: !current[flag] });
  }

  // --- Category ---

  protected isCategoryActive(id: string): boolean {
    return this.draft().category === id;
  }

  protected toggleCategory(id: string): void {
    const current = this.draft();
    if (current.category === id) {
      this.emit({ ...current, category: undefined });
    } else {
      this.emit({ ...current, category: id });
    }
  }

  // --- Price ---

  protected applyPrice(): void {
    const next = { ...this.draft() };
    const min = this.minPriceInput();
    const max = this.maxPriceInput();

    if (min != null && !isNaN(min)) next.minPrice = min;
    else delete next.minPrice;

    if (max != null && !isNaN(max)) next.maxPrice = max;
    else delete next.maxPrice;

    this.emit(next);
  }

  // --- Rating ---

  protected isRatingActive(rating: number): boolean {
    return this.draft().rating === rating;
  }

  protected toggleRating(rating: number): void {
    const current = this.draft();
    if (current.rating === rating) {
      this.emit({ ...current, rating: undefined });
    } else {
      this.emit({ ...current, rating });
    }
  }

  // --- Availability ---

  protected toggleInStock(): void {
    const current = this.draft();
    this.emit({ ...current, inStock: !current.inStock });
  }

  protected toggleOnSale(): void {
    const current = this.draft();
    this.emit({ ...current, onSale: !current.onSale });
  }

  // --- Reset ---

  protected reset(): void {
    this.minPriceInput.set(null);
    this.maxPriceInput.set(null);
    this.emit({});
  }

  private emit(next: ShopFilters): void {
    this.draft.set(next);
    this.valueChange.emit(next);
  }
}
