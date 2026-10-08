import { CommonModule } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { Toast, ToastService } from '../../../core/services/toast.service';

export type ToastPosition =
  | 'top-end'
  | 'top-center'
  | 'bottom-end'
  | 'bottom-center';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.scss',
})
export class ToastComponent {
  private toastService = inject(ToastService);

  readonly position = input<ToastPosition>('top-end');

  protected readonly toasts = this.toastService.toasts;

  protected dismiss(id: string): void {
    this.toastService.dismiss(id);
  }

  protected iconFor(type: Toast['type']): string {
    switch (type) {
      case 'success':
        return 'M20 6 9 17l-5-5';
      case 'error':
        return 'M18 6 6 18M6 6l12 12';
      case 'warning':
        return 'M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z';
      case 'info':
      default:
        return 'M12 16v-4M12 8h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z';
    }
  }
}