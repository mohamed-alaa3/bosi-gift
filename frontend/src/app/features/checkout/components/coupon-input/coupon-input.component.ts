import { CommonModule } from '@angular/common';
import { Component, output, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-checkout-coupon-input',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div class="coupon-input">
      <input
        type="text"
        class="coupon-input__field"
        [placeholder]="'coupon.placeholder' | translate"
        [value]="value()"
        (input)="value.set($any($event.target).value.toUpperCase())"
        (keydown.enter)="onApply()"
        maxlength="32"
      />
      <button
        type="button"
        class="coupon-input__btn"
        [disabled]="!value().trim()"
        (click)="onApply()"
      >
        {{ 'coupon.apply' | translate }}
      </button>
    </div>
  `,
  styles: [
    `
      .coupon-input {
        display: flex;
        gap: 0.5rem;
      }

      .coupon-input__field {
        flex: 1;
        height: 48px;
        padding-inline: 1rem;
        font-family: 'Inter', system-ui, sans-serif;
        font-size: 0.9375rem;
        color: var(--text);
        background-color: var(--surface);
        border: 1.5px solid var(--border-strong);
        border-radius: var(--radius-md);
        outline: none;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        transition:
          border-color var(--transition-fast),
          box-shadow var(--transition-fast);

        &:focus {
          border-color: var(--brand-primary);
          box-shadow: 0 0 0 3px rgba(var(--brand-primary-rgb), 0.15);
        }

        &::placeholder {
          color: var(--text-subtle);
          text-transform: none;
          letter-spacing: normal;
        }
      }

      .coupon-input__btn {
        height: 48px;
        padding-inline: 1.5rem;
        font-family: 'Inter', system-ui, sans-serif;
        font-size: 0.9375rem;
        font-weight: 600;
        color: #ffffff;
        background-color: var(--brand-primary);
        border: 1.5px solid var(--brand-primary);
        border-radius: var(--radius-md);
        cursor: pointer;
        transition: background-color var(--transition-base);

        &:hover:not(:disabled) {
          background-color: var(--brand-primary-hover);
          border-color: var(--brand-primary-hover);
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      }
    `,
  ],
})
export class CouponInputComponent {
  readonly value = signal<string>('');
  readonly applied = output<string>();

  protected onApply(): void {
    const v = this.value().trim();
    if (!v) return;
    this.applied.emit(v);
  }
}
