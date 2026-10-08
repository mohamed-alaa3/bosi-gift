import { Component, computed, input } from '@angular/core';

export type SkeletonVariant = 'card' | 'line' | 'text-block';

@Component({
  selector: 'app-skeleton-card',
  standalone: true,
  templateUrl: './skeleton-card.component.html',
  styleUrl: './skeleton-card.component.scss',
})
export class SkeletonCardComponent {
  readonly variant = input<SkeletonVariant>('card');
  readonly lines = input<number>(3);
  readonly height = input<string>('');

  readonly classes = computed(() =>
    ['app-skeleton', `app-skeleton--${this.variant()}`].join(' ')
  );

  readonly linesArray = computed(() =>
    Array.from({ length: Math.max(1, this.lines()) }, (_, i) => i)
  );
}