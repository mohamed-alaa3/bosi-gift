import { CommonModule } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss',
})
export class ButtonComponent {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly fullWidth = input(false);
  readonly iconOnly = input(false);

  /** Optional router link — renders the button as an `<a>` */
  readonly routerLink = input<string | unknown[] | null>(null);

  readonly clicked = output<MouseEvent>();

  readonly classes = computed(() => {
    const variant = this.variant();
    const size = this.size();
    return [
      'app-button',
      `app-button--${variant}`,
      `app-button--${size}`,
      this.fullWidth() ? 'app-button--full' : '',
      this.iconOnly() ? 'app-button--icon' : '',
      this.loading() ? 'is-loading' : '',
      this.disabled() ? 'is-disabled' : '',
    ]
      .filter(Boolean)
      .join(' ');
  });

  onClick(event: MouseEvent): void {
    if (this.disabled() || this.loading()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    this.clicked.emit(event);
  }
}