import { CommonModule } from '@angular/common';
import { Component, ElementRef, computed, input, output, signal, viewChild } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { PaymentProofMethod } from '../../../../core/models';
import { PricePipe } from '../../../../shared/pipes/price.pipe';

const MAX_FILE_MB = 5;
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export interface PaymentNumbers {
  vodafoneCashNumber: string;
  instapayNumber: string;
}

@Component({
  selector: 'app-checkout-payment-proof',
  standalone: true,
  imports: [CommonModule, TranslatePipe, PricePipe],
  template: `
    <section class="payment-proof">
      <header class="payment-proof__header">
        <h2 class="payment-proof__title">
          {{ 'checkout.proofTitle' | translate }}
        </h2>
        <p class="payment-proof__subtitle">
          {{ 'checkout.proofSubtitle' | translate }}
        </p>
      </header>

      <!-- Amount due now -->
      <div class="payment-proof__amount">
        <span class="payment-proof__amount-label">
          {{ 'checkout.proofAmountLabel' | translate }}
        </span>
        <span class="payment-proof__amount-value">
          {{ amountDueNow() | price }}
        </span>
      </div>

      <!-- Numbers -->
      <div class="payment-proof__numbers">
        @if (numbers().vodafoneCashNumber) {
          <button
            type="button"
            class="payment-proof__number"
            [class.is-selected]="method() === 'vodafone'"
            (click)="selectMethod('vodafone')"
          >
            <div class="payment-proof__number-head">
              <span class="payment-proof__number-title">
                {{ 'checkout.proofVodafone' | translate }}
              </span>
              <span class="payment-proof__radio" aria-hidden="true"></span>
            </div>
            <div class="payment-proof__number-row">
              <span class="payment-proof__number-value">
                {{ numbers().vodafoneCashNumber }}
              </span>
              <button
                type="button"
                class="payment-proof__copy"
                (click)="$event.stopPropagation(); copy(numbers().vodafoneCashNumber)"
                [attr.aria-label]="'common.copy' | translate"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                </svg>
              </button>
            </div>
          </button>
        }

        @if (numbers().instapayNumber) {
          <button
            type="button"
            class="payment-proof__number"
            [class.is-selected]="method() === 'instapay'"
            (click)="selectMethod('instapay')"
          >
            <div class="payment-proof__number-head">
              <span class="payment-proof__number-title">
                {{ 'checkout.proofInstapay' | translate }}
              </span>
              <span class="payment-proof__radio" aria-hidden="true"></span>
            </div>
            <div class="payment-proof__number-row">
              <span class="payment-proof__number-value">
                {{ numbers().instapayNumber }}
              </span>
              <button
                type="button"
                class="payment-proof__copy"
                (click)="$event.stopPropagation(); copy(numbers().instapayNumber)"
                [attr.aria-label]="'common.copy' | translate"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                </svg>
              </button>
            </div>
          </button>
        }
      </div>

      <!-- Upload -->
      <div class="payment-proof__upload">
        <label class="payment-proof__upload-label" for="payment-proof-input">
          {{ 'checkout.proofUploadLabel' | translate }}
          <span class="payment-proof__required" aria-hidden="true">*</span>
        </label>

        <input
          #fileInput
          id="payment-proof-input"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          class="payment-proof__file-input"
          (change)="onFileChange($event)"
        />

        @if (previewUrl(); as url) {
          <div class="payment-proof__preview">
            <img [src]="url" alt="" class="payment-proof__preview-img" />
            <div class="payment-proof__preview-info">
              <span class="payment-proof__preview-name">{{ fileName() }}</span>
              <button type="button" class="payment-proof__remove" (click)="clearFile()">
                {{ 'common.remove' | translate }}
              </button>
            </div>
          </div>
        } @else {
          <button type="button" class="payment-proof__dropzone" (click)="fileInput.click()">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" x2="12" y1="3" y2="15" />
            </svg>
            <span class="payment-proof__dropzone-title">
              {{ 'checkout.proofChooseFile' | translate }}
            </span>
            <span class="payment-proof__dropzone-hint">
              {{ 'checkout.proofFileHint' | translate: { max: maxFileMb } }}
            </span>
          </button>
        }

        @if (fileError(); as err) {
          <p class="payment-proof__error" role="alert">{{ err }}</p>
        }
      </div>
    </section>
  `,
  styles: [
    `
      .payment-proof {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }

      .payment-proof__header {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .payment-proof__title {
        font-family: 'Poppins', system-ui, sans-serif;
        font-size: 1.125rem;
        font-weight: 700;
        color: var(--text);
        margin: 0;
      }

      .payment-proof__subtitle {
        font-size: 0.875rem;
        line-height: 1.6;
        color: var(--text-muted);
        margin: 0;
      }

      .payment-proof__amount {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        padding: 1rem 1.25rem;
        background-color: var(--brand-primary-soft);
        border: 1.5px solid var(--brand-primary);
        border-radius: var(--radius-md);
      }

      .payment-proof__amount-label {
        font-family: 'Inter', system-ui, sans-serif;
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--text);
      }

      .payment-proof__amount-value {
        font-family: 'Poppins', system-ui, sans-serif;
        font-size: 1.375rem;
        font-weight: 700;
        color: var(--brand-primary);
        font-variant-numeric: tabular-nums;
      }

      .payment-proof__numbers {
        display: grid;
        grid-template-columns: 1fr;
        gap: 0.75rem;

        @media (min-width: 640px) {
          grid-template-columns: 1fr 1fr;
        }
      }

      .payment-proof__number {
        display: flex;
        flex-direction: column;
        gap: 0.625rem;
        padding: 1rem 1.25rem;
        text-align: start;
        background-color: var(--surface);
        border: 1.5px solid var(--border-strong);
        border-radius: var(--radius-md);
        cursor: pointer;
        transition:
          border-color var(--transition-fast),
          background-color var(--transition-fast),
          box-shadow var(--transition-fast);

        &:hover:not(.is-selected) {
          border-color: var(--brand-primary);
        }

        &.is-selected {
          border-color: var(--brand-primary);
          background-color: var(--brand-primary-soft);
          box-shadow: 0 0 0 3px rgba(var(--brand-primary-rgb), 0.12);
        }
      }

      .payment-proof__number-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.5rem;
      }

      .payment-proof__number-title {
        font-family: 'Inter', system-ui, sans-serif;
        font-size: 0.8125rem;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--text-subtle);
      }

      .payment-proof__radio {
        display: inline-flex;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        border: 2px solid var(--border-strong);
        background-color: var(--surface);
        flex-shrink: 0;
        position: relative;
        transition: border-color var(--transition-fast);
      }

      .payment-proof__number.is-selected .payment-proof__radio {
        border-color: var(--brand-primary);

        &::after {
          content: '';
          position: absolute;
          inset: 3px;
          border-radius: 50%;
          background-color: var(--brand-primary);
        }
      }

      .payment-proof__number-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.5rem;
      }

      .payment-proof__number-value {
        font-family: 'Poppins', system-ui, sans-serif;
        font-size: 1.0625rem;
        font-weight: 700;
        color: var(--text);
        font-variant-numeric: tabular-nums;
        letter-spacing: 0.02em;
      }

      .payment-proof__copy {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        padding: 0;
        border-radius: var(--radius-sm);
        background: transparent;
        border: none;
        color: var(--text-muted);
        cursor: pointer;
        transition:
          color var(--transition-fast),
          background-color var(--transition-fast);

        &:hover {
          color: var(--brand-primary);
          background-color: var(--brand-primary-soft);
        }
      }

      .payment-proof__upload {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .payment-proof__upload-label {
        font-family: 'Inter', system-ui, sans-serif;
        font-size: 0.8125rem;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--text-subtle);
      }

      .payment-proof__required {
        color: var(--danger);
        margin-inline-start: 0.125rem;
      }

      .payment-proof__file-input {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }

      .payment-proof__dropzone {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 2rem 1.5rem;
        background-color: var(--surface);
        border: 2px dashed var(--border-strong);
        border-radius: var(--radius-lg);
        cursor: pointer;
        color: var(--text-muted);
        transition:
          border-color var(--transition-fast),
          background-color var(--transition-fast);

        &:hover {
          border-color: var(--brand-primary);
          background-color: var(--brand-primary-soft);
          color: var(--brand-primary);
        }
      }

      .payment-proof__dropzone-title {
        font-family: 'Inter', system-ui, sans-serif;
        font-size: 0.9375rem;
        font-weight: 600;
        color: var(--text);
      }

      .payment-proof__dropzone-hint {
        font-size: 0.75rem;
        color: var(--text-subtle);
      }

      .payment-proof__preview {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 0.75rem;
        background-color: var(--surface);
        border: 1.5px solid var(--brand-primary);
        border-radius: var(--radius-lg);
      }

      .payment-proof__preview-img {
        width: 72px;
        height: 72px;
        object-fit: cover;
        border-radius: var(--radius-md);
        flex-shrink: 0;
      }

      .payment-proof__preview-info {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .payment-proof__preview-name {
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--text);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .payment-proof__remove {
        align-self: flex-start;
        padding: 0;
        font-family: 'Inter', system-ui, sans-serif;
        font-size: 0.8125rem;
        font-weight: 600;
        color: var(--danger);
        background: transparent;
        border: none;
        cursor: pointer;

        &:hover {
          text-decoration: underline;
        }
      }

      .payment-proof__error {
        margin: 0;
        font-size: 0.8125rem;
        color: var(--danger);
      }
    `,
  ],
})
export class CheckoutPaymentProofComponent {
  private readonly fileInputRef = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  // ─── Inputs ─────────────────────────────────────────────
  readonly amountDueNow = input<number>(0);
  readonly numbers = input<PaymentNumbers>({
    vodafoneCashNumber: '',
    instapayNumber: '',
  });

  // ─── Outputs ────────────────────────────────────────────
  readonly methodChange = output<PaymentProofMethod>();
  readonly fileChange = output<File | null>();

  // ─── State ──────────────────────────────────────────────
  protected readonly method = signal<PaymentProofMethod | ''>('');
  protected readonly previewUrl = signal<string | null>(null);
  protected readonly fileName = signal<string>('');
  protected readonly fileError = signal<string | null>(null);
  protected readonly maxFileMb = MAX_FILE_MB;

  private currentFile: File | null = null;

  // ─── Actions ────────────────────────────────────────────
  protected selectMethod(value: PaymentProofMethod): void {
    this.method.set(value);
    this.methodChange.emit(value);
  }

  protected onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.fileError.set(null);

    // Validate type
    if (!ALLOWED_TYPES.includes(file.type)) {
      this.fileError.set('Only JPG, PNG, or WebP images are allowed.');
      input.value = '';
      return;
    }

    // Validate size
    if (file.size > MAX_FILE_BYTES) {
      this.fileError.set(`File must be smaller than ${MAX_FILE_MB} MB.`);
      input.value = '';
      return;
    }

    // Clear previous preview
    const oldUrl = this.previewUrl();
    if (oldUrl) URL.revokeObjectURL(oldUrl);

    const url = URL.createObjectURL(file);
    this.previewUrl.set(url);
    this.fileName.set(file.name);
    this.currentFile = file;
    this.fileChange.emit(file);
  }

  protected clearFile(): void {
    const url = this.previewUrl();
    if (url) URL.revokeObjectURL(url);

    this.previewUrl.set(null);
    this.fileName.set('');
    this.currentFile = null;
    this.fileChange.emit(null);

    const input = this.fileInputRef()?.nativeElement;
    if (input) input.value = '';
  }

  protected copy(value: string): void {
    if (!value) return;
    navigator.clipboard?.writeText(value).catch(() => {});
  }

  /** Public accessor so the parent can read the currently attached file. */
  get file(): File | null {
    return this.currentFile;
  }
}
