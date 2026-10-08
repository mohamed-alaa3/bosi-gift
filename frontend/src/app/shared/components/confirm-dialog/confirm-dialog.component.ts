import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { ModalComponent } from '../modal/modal.component';

export type ConfirmVariant = 'primary' | 'danger';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, ModalComponent],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss',
})
export class ConfirmDialogComponent {
  readonly isOpen = input<boolean>(false);
  readonly title = input<string>('Are you sure?');
  readonly message = input<string>('');
  readonly confirmText = input<string>('Confirm');
  readonly cancelText = input<string>('Cancel');
  readonly variant = input<ConfirmVariant>('primary');

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  protected onConfirm(): void {
    this.confirmed.emit();
  }

  protected onCancel(): void {
    this.cancelled.emit();
  }
}