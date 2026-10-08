import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { catchError, of, timeout } from 'rxjs';

import { OrderService } from '../../../core/services/order.service';
import { ObjectId } from '../../../core/models';
import { ModalComponent } from '../modal/modal.component';

const FETCH_TIMEOUT_MS = 15000;

@Component({
  selector: 'app-payment-proof-viewer',
  standalone: true,
  imports: [CommonModule, TranslatePipe, ModalComponent],
  template: `
    @if (hasProof()) {
      <div class="proof-viewer">
        <button type="button" class="proof-viewer__trigger" (click)="open()" [disabled]="loading()">
          <span class="proof-viewer__icon" aria-hidden="true">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
          </span>
          @if (loading()) {
            <span class="proof-viewer__spinner" aria-hidden="true"></span>
          } @else {
            {{ 'admin.orders.paymentProof.viewButton' | translate }}
          }
        </button>
      </div>
    } @else {
      <p class="proof-viewer__empty">
        {{ 'admin.orders.paymentProof.notProvided' | translate }}
      </p>
    }

    <app-modal
      [isOpen]="isOpen()"
      size="lg"
      [ariaLabel]="'admin.orders.paymentProof.title' | translate"
      (closed)="close()"
    >
      <header class="proof-viewer__modal-header">
        <h2 class="proof-viewer__modal-title">
          {{ 'admin.orders.paymentProof.title' | translate }}
        </h2>
        <p class="proof-viewer__modal-subtitle">
          {{ 'admin.orders.paymentProof.subtitle' | translate }}
        </p>
      </header>

      <div class="proof-viewer__modal-body">
        @if (loading()) {
          <div class="proof-viewer__loader">
            <span class="proof-viewer__spinner proof-viewer__spinner--lg"></span>
          </div>
        }

        @if (error(); as err) {
          <p class="proof-viewer__error" role="alert">{{ err | translate }}</p>
        }

        @if (imageUrl(); as url) {
          <img
            [src]="url"
            [alt]="'admin.orders.paymentProof.alt' | translate"
            class="proof-viewer__image"
          />
        }
      </div>

      <footer class="proof-viewer__modal-footer">
        <button type="button" class="proof-viewer__close-btn" (click)="close()">
          {{ 'common.close' | translate }}
        </button>
      </footer>
    </app-modal>
  `,
  styles: [
    `
      .proof-viewer {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .proof-viewer__trigger {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        height: 42px;
        padding-inline: 1rem;
        font-family: 'Inter', system-ui, sans-serif;
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--brand-primary);
        background-color: var(--brand-primary-soft);
        border: 1.5px solid var(--brand-primary);
        border-radius: var(--radius-md);
        cursor: pointer;
        transition:
          background-color var(--transition-fast),
          color var(--transition-fast);

        &:hover:not(:disabled) {
          background-color: var(--brand-primary);
          color: #ffffff;
        }

        &:disabled {
          opacity: 0.7;
          cursor: progress;
        }
      }

      .proof-viewer__icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      .proof-viewer__spinner {
        display: inline-block;
        width: 14px;
        height: 14px;
        border: 2px solid currentColor;
        border-top-color: transparent;
        border-radius: 50%;
        animation: proof-spin 0.7s linear infinite;
      }

      .proof-viewer__spinner--lg {
        width: 28px;
        height: 28px;
        border-width: 3px;
      }

      @keyframes proof-spin {
        to {
          transform: rotate(360deg);
        }
      }

      .proof-viewer__empty {
        margin: 0;
        font-size: 0.8125rem;
        font-style: italic;
        color: var(--text-subtle);
      }

      .proof-viewer__modal-header {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        margin-bottom: 1rem;
      }

      .proof-viewer__modal-title {
        font-family: 'Poppins', system-ui, sans-serif;
        font-size: 1.125rem;
        font-weight: 700;
        color: var(--text);
        margin: 0;
      }

      .proof-viewer__modal-subtitle {
        font-size: 0.8125rem;
        color: var(--text-muted);
        margin: 0;
      }

      .proof-viewer__modal-body {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        min-height: 200px;
      }

      .proof-viewer__loader {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem 0;
      }

      .proof-viewer__image {
        max-width: 100%;
        max-height: 70vh;
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-md);
        object-fit: contain;
      }

      .proof-viewer__error {
        margin: 0;
        padding: 0.75rem 1rem;
        font-size: 0.875rem;
        color: var(--danger);
        background-color: var(--danger-soft);
        border: 1px solid color-mix(in srgb, var(--danger) 30%, transparent);
        border-radius: var(--radius-md);
      }

      .proof-viewer__modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
        margin-top: 1rem;
      }

      .proof-viewer__close-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        height: 42px;
        padding-inline: 1.25rem;
        font-family: 'Inter', system-ui, sans-serif;
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--text);
        background: transparent;
        border: 1.5px solid var(--border-strong);
        border-radius: var(--radius-md);
        cursor: pointer;
        transition:
          border-color var(--transition-fast),
          color var(--transition-fast);

        &:hover {
          border-color: var(--brand-primary);
          color: var(--brand-primary);
        }
      }
    `,
  ],
})
export class PaymentProofViewerComponent {
  private readonly orderService = inject(OrderService);
  private readonly destroyRef = inject(DestroyRef);

  readonly orderId = input.required<ObjectId>();
  readonly hasProof = input<boolean>(false);

  protected readonly isOpen = signal(false);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly imageUrl = signal<string | null>(null);

  private currentObjectUrl: string | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => this.revokeObjectUrl());
  }

  protected open(): void {
    this.isOpen.set(true);
    if (!this.imageUrl() && !this.loading()) {
      this.load();
    }
  }

  protected close(): void {
    this.isOpen.set(false);
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.orderService
      .getPaymentProofBlob(this.orderId())
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => {
          this.loading.set(false);
          this.error.set('admin.orders.paymentProof.loadError');
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((blob) => {
        this.loading.set(false);
        if (!blob) return;

        this.revokeObjectUrl();
        const url = URL.createObjectURL(blob);
        this.currentObjectUrl = url;
        this.imageUrl.set(url);
      });
  }

  private revokeObjectUrl(): void {
    if (this.currentObjectUrl) {
      URL.revokeObjectURL(this.currentObjectUrl);
      this.currentObjectUrl = null;
    }
  }
}
