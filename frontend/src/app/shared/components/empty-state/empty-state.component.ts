import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GiftIconComponent, GiftIconName } from '../gift-icon/gift-icon.component';
export type EmptyStateIcon =
  | 'cart'
  | 'heart'
  | 'search'
  | 'box'
  | 'file'
  | 'inbox'
  | 'calendar';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, RouterLink, GiftIconComponent],
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.scss',
})
export class EmptyStateComponent {
  readonly icon = input<EmptyStateIcon>('inbox');
  readonly title = input<string>('Nothing here yet');
  readonly message = input<string>('');
  readonly actionLabel = input<string>('');
  readonly actionLink = input<string | unknown[] | null>(null);

  readonly actionClick = output<void>();

  /** Friendly illustrated icon for the common empty states; null = fall back to the line icon. */
  protected giftIcon(): GiftIconName | null {
    switch (this.icon()) {
      case 'cart':
        return 'teddy';
      case 'heart':
        return 'heart';
      case 'box':
        return 'gift';
      default:
        return null;
    }
  }

  protected iconPath(): string {
    switch (this.icon()) {
      case 'cart':
        return 'M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0';
      case 'heart':
        return 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z';
      case 'search':
        return 'M21 21l-4.3-4.3M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z';
      case 'box':
        return 'M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z M3.3 7l8.7 5 8.7-5M12 22V12';
      case 'file':
        return 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8';
      case 'calendar':
        return 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z';
      case 'inbox':
      default:
        return 'M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z';
    }
  }

  protected onAction(): void {
    this.actionClick.emit();
  }
}