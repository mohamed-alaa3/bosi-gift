import { Component, computed, input } from '@angular/core';

export type LoaderSize = 'sm' | 'md' | 'lg';
export type LoaderVariant = 'spinner' | 'dots' | 'fullscreen';

@Component({
  selector: 'app-loader',
  standalone: true,
  templateUrl: './loader.component.html',
  styleUrl: './loader.component.scss',
})
export class LoaderComponent {
  readonly size = input<LoaderSize>('md');
  readonly variant = input<LoaderVariant>('spinner');
  readonly label = input<string>('Loading...');

  readonly classes = computed(() =>
    ['app-loader', `app-loader--${this.variant()}`, `app-loader--${this.size()}`].join(' ')
  );
}