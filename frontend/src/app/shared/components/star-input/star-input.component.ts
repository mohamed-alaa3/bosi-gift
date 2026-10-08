import { ChangeDetectionStrategy, Component, ElementRef, inject, input, model, signal } from '@angular/core';

import { LanguageService } from '../../../core/services/language.service';

/**
 * Accessible 1–5 star picker (radiogroup, roving tabindex, arrow keys).
 * Two-way: [(value)]. Logical order: star 1 sits at the START edge, so it
 * reads naturally in both LTR and RTL.
 */
@Component({
  selector: 'app-star-input',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="si" role="radiogroup" [attr.aria-label]="label()" [class.si--lg]="size() === 'lg'" (keydown)="onKey($event)">
      @for (n of stars; track n) {
        <button
          type="button"
          role="radio"
          class="si__star"
          [class.is-on]="n <= (hover() || value())"
          [attr.aria-checked]="value() === n"
          [attr.aria-label]="n + ' / 5'"
          [tabindex]="isTabStop(n) ? 0 : -1"
          [disabled]="disabled()"
          (click)="set(n)"
          (mouseenter)="hover.set(n)"
          (mouseleave)="hover.set(0)"
        >★</button>
      }
    </div>
  `,
  styles: `
    :host { display: inline-block; }
    .si { display: inline-flex; gap: 0.15rem; direction: ltr; }
    :host-context([dir='rtl']) .si { direction: rtl; }
    .si__star {
      padding: 0 0.1rem;
      border: 0;
      background: none;
      font-size: 1.75rem;
      line-height: 1;
      color: var(--border-strong);
      cursor: pointer;
      transition: color 0.15s ease, transform 0.15s ease;
    }
    .si--lg .si__star { font-size: 2.25rem; }
    .si__star.is-on { color: #f5a623; }
    .si__star:hover:not(:disabled) { transform: scale(1.12); }
    .si__star:focus-visible { outline: 3px solid var(--brand-secondary); outline-offset: 2px; border-radius: 6px; }
    .si__star:disabled { cursor: default; }
    @media (prefers-reduced-motion: reduce) { .si__star { transition: none; } .si__star:hover { transform: none; } }
  `,
})
export class StarInputComponent {
  readonly value = model<number>(0);
  readonly label = input<string>('');
  readonly size = input<'md' | 'lg'>('md');
  readonly disabled = input<boolean>(false);

  protected readonly stars = [1, 2, 3, 4, 5];
  protected readonly hover = signal(0);

  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private language = inject(LanguageService);

  protected isTabStop(n: number): boolean {
    return this.value() ? this.value() === n : n === 1;
  }

  protected set(n: number): void {
    if (!this.disabled()) this.value.set(n);
  }

  protected onKey(e: KeyboardEvent): void {
    const forward = this.language.isRtl() ? 'ArrowLeft' : 'ArrowRight';
    const back = this.language.isRtl() ? 'ArrowRight' : 'ArrowLeft';
    let next = this.value() || 0;
    if (e.key === forward || e.key === 'ArrowUp') next = Math.min(5, next + 1);
    else if (e.key === back || e.key === 'ArrowDown') next = Math.max(1, next - 1);
    else return;
    e.preventDefault();
    this.set(next);
    queueMicrotask(() =>
      this.host.nativeElement.querySelectorAll<HTMLButtonElement>('.si__star')[next - 1]?.focus(),
    );
  }
}
