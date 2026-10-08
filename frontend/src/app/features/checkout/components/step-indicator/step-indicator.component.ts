import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

export type CheckoutStep = 'information' | 'shipping' | 'coupon' | 'payment' | 'proof' | 'review';

interface StepDef {
  key: CheckoutStep;
  labelKey: string;
}

@Component({
  selector: 'app-checkout-step-indicator',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <ol class="step-indicator">
      @for (step of steps; track step.key; let i = $index; let last = $last) {
        <li
          class="step-indicator__item"
          [class.is-active]="isActive(step.key)"
          [class.is-complete]="isComplete(step.key)"
        >
          <span class="step-indicator__dot" aria-hidden="true">
            @if (isComplete(step.key)) {
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="3"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            } @else {
              {{ i + 1 }}
            }
          </span>
          <span class="step-indicator__label">{{ step.labelKey | translate }}</span>
          @if (!last) {
            <span class="step-indicator__line" aria-hidden="true"></span>
          }
        </li>
      }
    </ol>
  `,
  styles: [
    `
      .step-indicator {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0;
        margin: 0 0 2rem;
        list-style: none;
        overflow-x: auto;
        scrollbar-width: none;
      }
      .step-indicator::-webkit-scrollbar {
        display: none;
      }

      .step-indicator__item {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        flex-shrink: 0;
        color: var(--text-muted);
      }

      .step-indicator__dot {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        border-radius: 9999px;
        background-color: var(--bg-muted);
        border: 2px solid var(--border);
        font-family: 'Inter', system-ui, sans-serif;
        font-size: 0.75rem;
        font-weight: 700;
        color: var(--text-muted);
        flex-shrink: 0;
        transition: all var(--transition-base);
      }

      .step-indicator__label {
        font-family: 'Inter', system-ui, sans-serif;
        font-size: 0.8125rem;
        font-weight: 600;
        white-space: nowrap;
      }

      .step-indicator__line {
        display: inline-block;
        width: 24px;
        height: 2px;
        background-color: var(--border);
        border-radius: 2px;
        margin-inline: 0.25rem;
      }

      @media (min-width: 768px) {
        .step-indicator__line {
          width: 40px;
        }
      }

      .step-indicator__item.is-active .step-indicator__dot {
        background-color: var(--brand-primary);
        border-color: var(--brand-primary);
        color: #ffffff;
      }

      .step-indicator__item.is-active .step-indicator__label {
        color: var(--text);
      }

      .step-indicator__item.is-complete .step-indicator__dot {
        background-color: var(--brand-primary-soft);
        border-color: var(--brand-primary);
        color: var(--brand-primary);
      }

      .step-indicator__item.is-complete .step-indicator__line {
        background-color: var(--brand-primary);
      }
    `,
  ],
})
export class CheckoutStepIndicatorComponent {
  readonly current = input<CheckoutStep>('information');

  protected readonly steps: StepDef[] = [
    { key: 'information', labelKey: 'checkout.stepInformation' },
    { key: 'shipping', labelKey: 'checkout.stepShipping' },
    { key: 'coupon', labelKey: 'checkout.stepCoupon' },
    { key: 'payment', labelKey: 'checkout.stepPayment' },
    { key: 'proof', labelKey: 'checkout.stepProof' },
    { key: 'review', labelKey: 'checkout.stepReview' },
  ];

  private readonly order: CheckoutStep[] = [
    'information',
    'shipping',
    'coupon',
    'payment',
    'proof',
    'review',
  ];

  protected isActive(step: CheckoutStep): boolean {
    return this.current() === step;
  }

  protected isComplete(step: CheckoutStep): boolean {
    return this.order.indexOf(step) < this.order.indexOf(this.current());
  }
}
