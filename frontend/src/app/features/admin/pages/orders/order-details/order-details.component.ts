import { CommonModule, DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, timeout } from 'rxjs';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { OrderService } from '../../../../../core/services/order.service';
import { ToastService } from '../../../../../core/services/toast.service';

import { Order, OrderStatus } from '../../../../../core/models';
import { LocalizedPipe } from '../../../../../shared/pipes/localized.pipe';
import { PricePipe } from '../../../../../shared/pipes/price.pipe';
import { SafeImagePipe } from '../../../../../shared/pipes/safe-image.pipe';
import { EmptyStateComponent } from '../../../../../shared/components/empty-state/empty-state.component';
import { LoaderComponent } from '../../../../../shared/components/loader/loader.component';
import { ModalComponent } from '../../../../../shared/components/modal/modal.component';
import { PaymentProofViewerComponent } from '../../../../../shared/components/payment-proof-viewer/payment-proof-viewer.component';

type LoadState = 'loading' | 'success' | 'error';

interface OrderAction {
  /** Target status to send to the backend */
  status: OrderStatus;
  /** i18n key under `admin.orders.actions.*` */
  labelKey: string;
  /** Visual style */
  variant: 'primary' | 'danger' | 'secondary';
  /** i18n key for the toast on success */
  toastKey: string;
  /** Whether this action needs a reason dialog */
  needsReason: boolean;
  /** Whether this action needs an extra `confirm: true` checkbox */
  needsConfirm: boolean;
  /** i18n key for the dialog title */
  dialogTitleKey?: string;
  /** i18n key for the dialog body */
  dialogTextKey?: string;
  /** i18n key for the dialog submit button */
  dialogSubmitKey?: string;
}

const FETCH_TIMEOUT_MS = 8000;

@Component({
  selector: 'app-admin-order-details',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    RouterLink,
    TranslatePipe,
    LocalizedPipe,
    PricePipe,
    SafeImagePipe,
    EmptyStateComponent,
    LoaderComponent,
    ModalComponent,
    PaymentProofViewerComponent,
  ],
  templateUrl: './order-details.component.html',
  styleUrl: './order-details.component.scss',
})
export class AdminOrderDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private orderService = inject(OrderService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  // ---------- State ----------
  protected readonly state = signal<LoadState>('loading');
  protected readonly order = signal<Order | null>(null);
  protected readonly updatingStatus = signal(false);

  // Dialog state
  protected readonly dialogOpen = signal(false);
  protected readonly pendingAction = signal<OrderAction | null>(null);
  protected readonly reasonText = signal('');
  protected readonly confirmChecked = signal(false);
  protected readonly dialogError = signal<string | null>(null);

  // ---------- Actions per status ----------
  private readonly actionMap: Record<OrderStatus, OrderAction[]> = {
    pending: [
      {
        status: 'confirmed',
        labelKey: 'admin.orders.actions.approve',
        variant: 'primary',
        toastKey: 'admin.orders.toast.approve',
        needsReason: false,
        needsConfirm: false,
      },
      {
        status: 'cancelled',
        labelKey: 'admin.orders.actions.reject',
        variant: 'danger',
        toastKey: 'admin.orders.toast.reject',
        needsReason: true,
        needsConfirm: false,
        dialogTitleKey: 'admin.orders.dialog.rejectTitle',
        dialogTextKey: 'admin.orders.dialog.rejectText',
        dialogSubmitKey: 'admin.orders.dialog.submitReject',
      },
    ],
    confirmed: [
      {
        status: 'processing',
        labelKey: 'admin.orders.actions.startProcessing',
        variant: 'primary',
        toastKey: 'admin.orders.toast.startProcessing',
        needsReason: false,
        needsConfirm: false,
      },
      {
        status: 'cancelled',
        labelKey: 'admin.orders.actions.cancel',
        variant: 'danger',
        toastKey: 'admin.orders.toast.cancel',
        needsReason: true,
        needsConfirm: false,
        dialogTitleKey: 'admin.orders.dialog.cancelTitle',
        dialogTextKey: 'admin.orders.dialog.cancelText',
        dialogSubmitKey: 'admin.orders.dialog.submitCancel',
      },
    ],
    processing: [
      {
        status: 'shipped',
        labelKey: 'admin.orders.actions.markShipped',
        variant: 'primary',
        toastKey: 'admin.orders.toast.markShipped',
        needsReason: false,
        needsConfirm: false,
      },
      {
        status: 'cancelled',
        labelKey: 'admin.orders.actions.cancel',
        variant: 'danger',
        toastKey: 'admin.orders.toast.cancel',
        needsReason: true,
        needsConfirm: true,
        dialogTitleKey: 'admin.orders.dialog.cancelTitle',
        dialogTextKey: 'admin.orders.dialog.cancelText',
        dialogSubmitKey: 'admin.orders.dialog.submitCancel',
      },
    ],
    shipped: [
      {
        status: 'delivered',
        labelKey: 'admin.orders.actions.markDelivered',
        variant: 'primary',
        toastKey: 'admin.orders.toast.markDelivered',
        needsReason: false,
        needsConfirm: false,
      },
    ],
    delivered: [],
    cancelled: [],
  };

  protected readonly availableActions = computed<OrderAction[]>(() => {
    const o = this.order();
    if (!o) return [];
    return this.actionMap[o.status] ?? [];
  });

  // ---------- Lifecycle ----------
  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.state.set('error');
      return;
    }
    this.load(id);
  }

  protected load(id: string): void {
    this.state.set('loading');

    this.orderService
      .getById(id)
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        if (!res?.success || !res.data) {
          this.state.set('error');
          return;
        }
        this.order.set(res.data);
        this.state.set('success');
      });
  }

  // ---------- Action flow ----------
  /** Button click — either apply immediately or open the reason dialog. */
  protected triggerAction(action: OrderAction): void {
    const o = this.order();
    if (!o || this.updatingStatus()) return;

    if (action.needsReason) {
      this.pendingAction.set(action);
      this.reasonText.set('');
      this.confirmChecked.set(false);
      this.dialogError.set(null);
      this.dialogOpen.set(true);
      return;
    }

    this.applyAction(action);
  }

  /** Dialog submit — validate then apply. */
  protected confirmDialog(): void {
    const action = this.pendingAction();
    if (!action) return;

    if (action.needsReason && !this.reasonText().trim()) {
      this.dialogError.set(this.translate.instant('admin.orders.dialog.reasonRequired'));
      return;
    }

    if (action.needsConfirm && !this.confirmChecked()) {
      this.dialogError.set(this.translate.instant('admin.orders.dialog.confirmRequired'));
      return;
    }

    this.closeDialog();
    this.applyAction(action, this.reasonText().trim(), action.needsConfirm);
  }

  protected closeDialog(): void {
    this.dialogOpen.set(false);
    this.pendingAction.set(null);
    this.reasonText.set('');
    this.confirmChecked.set(false);
    this.dialogError.set(null);
  }

  // ---------- Actual API call ----------
  private applyAction(action: OrderAction, reason?: string, confirm?: boolean): void {
    const o = this.order();
    if (!o || this.updatingStatus()) return;

    this.updatingStatus.set(true);

    this.orderService
      .updateStatus(o._id, {
        status: action.status,
        reason: reason || undefined,
        confirm: confirm === true ? true : undefined,
      })
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => {
          this.updatingStatus.set(false);
          // The HTTP error interceptor already surfaces the backend message;
          // this toast is a safety net if it doesn't.
          this.toast.error(this.translate.instant('admin.orders.toast.failed'));
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        this.updatingStatus.set(false);
        if (!res?.success || !res.data) return;

        this.order.set(res.data);
        this.toast.success(this.translate.instant(action.toastKey));
      });
  }

  // ---------- Helpers ----------
  protected statusClass(status: OrderStatus): string {
    return `is-${status}`;
  }

  protected actionButtonClass(variant: OrderAction['variant']): string {
    return `admin-order-details__action admin-order-details__action--${variant}`;
  }

  protected customerName(o: Order): string {
    const u = o.user;
    if (u && typeof u === 'object' && 'name' in u) {
      return (u as { name: string }).name || 'Guest';
    }
    return o.shippingAddress?.fullName || 'Guest';
  }

  protected customerEmail(o: Order): string {
    const u = o.user;
    if (u && typeof u === 'object' && 'email' in u) {
      return (u as { email: string }).email || '';
    }
    return '';
  }

  protected paymentStatusKey(status: string): string {
    return `orderPayment.${status}`;
  }
}
