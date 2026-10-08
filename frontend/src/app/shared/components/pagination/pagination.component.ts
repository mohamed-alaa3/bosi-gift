import { CommonModule } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.scss',
})
export class PaginationComponent {
  readonly page = input<number>(1);
  readonly totalPages = input<number>(1);
  readonly maxVisible = input<number>(5);
  readonly showPrevNext = input<boolean>(true);

  readonly pageChange = output<number>();

  /**
   * Build the visible page range, e.g. [1, 2, 3, '...', 10].
   * Values can be numbers or the string '...'.
   */
  protected readonly visiblePages = computed<(number | string)[]>(() => {
    const current = this.page();
    const total = this.totalPages();
    const max = Math.max(3, this.maxVisible());

    if (total <= max) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const side = Math.floor((max - 3) / 2);
    const start = Math.max(2, current - side);
    const end = Math.min(total - 1, current + side);

    const pages: (number | string)[] = [1];
    if (start > 2) pages.push('...');
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < total - 1) pages.push('...');
    pages.push(total);

    return pages;
  });

  protected readonly canGoPrev = computed(() => this.page() > 1);
  protected readonly canGoNext = computed(() => this.page() < this.totalPages());

  protected goTo(p: number | string): void {
    if (typeof p === 'string') return; // skip ellipsis
    if (p === this.page()) return;
    if (p < 1 || p > this.totalPages()) return;
    this.pageChange.emit(p);
  }

  protected prev(): void {
    if (!this.canGoPrev()) return;
    this.pageChange.emit(this.page() - 1);
  }

  protected next(): void {
    if (!this.canGoNext()) return;
    this.pageChange.emit(this.page() + 1);
  }
}