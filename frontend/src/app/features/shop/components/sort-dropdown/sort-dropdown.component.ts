import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

export type SortOption =
  'newest' | 'oldest' | 'price-asc' | 'price-desc' | 'rating-desc' | 'featured';

interface SortChoice {
  value: SortOption;
  labelKey: string;
}

@Component({
  selector: 'app-sort-dropdown',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './sort-dropdown.component.html',
  styleUrl: './sort-dropdown.component.scss',
})
export class SortDropdownComponent {
  private el = inject(ElementRef<HTMLElement>);

  readonly value = input<SortOption>('newest');
  readonly valueChange = output<SortOption>();

  protected readonly open = signal(false);

  protected readonly choices: SortChoice[] = [
    { value: 'newest', labelKey: 'shop.sortNewest' },
    { value: 'oldest', labelKey: 'shop.sortOldest' },
    { value: 'price-asc', labelKey: 'shop.sortPriceAsc' },
    { value: 'price-desc', labelKey: 'shop.sortPriceDesc' },
    { value: 'rating-desc', labelKey: 'shop.sortRatingDesc' },
    { value: 'featured', labelKey: 'shop.sortFeatured' },
  ];

  protected readonly currentLabelKey = computed(() => {
    const current = this.choices.find((c) => c.value === this.value());
    return current?.labelKey ?? 'shop.sortNewest';
  });

  protected toggle(): void {
    this.open.update((v) => !v);
  }

  protected choose(choice: SortChoice): void {
    this.valueChange.emit(choice.value);
    this.open.set(false);
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.el.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.open.set(false);
  }
}
