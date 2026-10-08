import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  computed,
  effect,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

export type ModalSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.scss',
})
export class ModalComponent implements OnDestroy {
  readonly isOpen = input<boolean>(false);
  readonly size = input<ModalSize>('md');
  readonly closeOnBackdrop = input(true);
  readonly showCloseButton = input(true);
  readonly ariaLabel = input<string>('Dialog');

  readonly closed = output<void>();

  protected readonly dialogRef = viewChild<ElementRef<HTMLElement>>('dialogEl');

  protected readonly classes = computed(() =>
    ['app-modal', `app-modal--${this.size()}`].join(' ')
  );

  private previousOverflow: string = '';

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        this.lockScroll();
      } else {
        this.unlockScroll();
      }
    });
  }

  ngOnDestroy(): void {
    this.unlockScroll();
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (!this.closeOnBackdrop()) return;
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  protected close(): void {
    this.closed.emit();
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.isOpen()) this.close();
  }

  private lockScroll(): void {
    const body = document.body;
    this.previousOverflow = body.style.overflow;
    body.style.overflow = 'hidden';
  }

  private unlockScroll(): void {
    if (this.previousOverflow !== undefined) {
      document.body.style.overflow = this.previousOverflow || '';
    }
  }
}