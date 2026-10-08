import { CommonModule } from '@angular/common';
import { Component, computed, input, output, signal } from '@angular/core';

export type RatingSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-rating-stars',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rating-stars.component.html',
  styleUrl: './rating-stars.component.scss',
})
export class RatingStarsComponent {
  readonly value = input<number>(0);
  readonly max = input<number>(5);
  readonly size = input<RatingSize>('md');
  readonly showValue = input<boolean>(false);
  readonly showCount = input<boolean>(false);
  readonly count = input<number>(0);
  /** Interactive mode — clicking a star emits the new value. */
  readonly interactive = input<boolean>(false);

  readonly valueChange = output<number>();

  protected readonly hovered = signal<number>(0);

  protected readonly starsArray = computed(() =>
    Array.from({ length: this.max() }, (_, i) => i + 1)
  );

  /**
   * The effective rating to display — hover overrides the value in interactive mode.
   */
  protected readonly displayValue = computed(() => {
    if (this.interactive() && this.hovered() > 0) return this.hovered();
    return this.value();
  });

  /**
   * For each star, compute whether it should be filled:
   * - filled if the star index <= floor(displayValue)
   * - half-filled if the star index === ceil(displayValue) and displayValue has a fraction
   */
  protected starState(index: number): 'full' | 'half' | 'empty' {
    const v = this.displayValue();
    if (index <= Math.floor(v)) return 'full';
    if (index === Math.ceil(v) && v % 1 >= 0.25 && v % 1 < 0.75) return 'half';
    if (index === Math.ceil(v) && v % 1 >= 0.75) return 'full';
    return 'empty';
  }

  protected onStarClick(star: number): void {
    if (!this.interactive()) return;
    this.valueChange.emit(star);
  }

  protected onStarHover(star: number): void {
    if (!this.interactive()) return;
    this.hovered.set(star);
  }

  protected onLeave(): void {
    if (!this.interactive()) return;
    this.hovered.set(0);
  }

  protected readonly formattedValue = computed(() => this.value().toFixed(1));
}