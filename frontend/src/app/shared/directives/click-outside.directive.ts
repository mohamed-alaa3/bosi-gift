import {
  Directive,
  ElementRef,
  EventEmitter,
  HostListener,
  Output,
  inject,
} from '@angular/core';

/**
 * Emits when the user clicks outside the host element.
 * Useful for closing dropdowns, drawers, popovers.
 *
 * Usage:
 *   <div (clickOutside)="close()">...</div>
 */
@Directive({
  selector: '[clickOutside]',
  standalone: true,
})
export class ClickOutsideDirective {
  private el = inject(ElementRef<HTMLElement>);

  @Output() clickOutside = new EventEmitter<MouseEvent>();

  @HostListener('document:mousedown', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as Node | null;
    if (!target) return;

    if (!this.el.nativeElement.contains(target)) {
      this.clickOutside.emit(event);
    }
  }
}