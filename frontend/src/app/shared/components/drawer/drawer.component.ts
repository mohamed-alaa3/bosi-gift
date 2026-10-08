import { CommonModule } from '@angular/common';
import {
  Component,
  HostListener,
  OnDestroy,
  computed,
  effect,
  input,
  output,
} from '@angular/core';

export type DrawerPosition = 'start' | 'end';
export type DrawerSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-drawer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './drawer.component.html',
  styleUrl: './drawer.component.scss',
})
export class DrawerComponent implements OnDestroy {
  readonly isOpen = input<boolean>(false);
  readonly position = input<DrawerPosition>('end');
  readonly size = input<DrawerSize>('md');
  readonly closeOnBackdrop = input(true);
  readonly ariaLabel = input<string>('Drawer');

  readonly closed = output<void>();

  protected readonly classes = computed(() =>
    [
      'app-drawer',
      `app-drawer--${this.position()}`,
      `app-drawer--${this.size()}`,
    ].join(' ')
  );

  private previousOverflow = '';

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

  protected onBackdropClick(): void {
    if (this.closeOnBackdrop()) this.close();
  }

  protected close(): void {
    this.closed.emit();
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.isOpen()) this.close();
  }

  private lockScroll(): void {
    this.previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }

  private unlockScroll(): void {
    document.body.style.overflow = this.previousOverflow || '';
  }
}