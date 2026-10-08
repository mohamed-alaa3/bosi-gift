import { CommonModule, DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, timeout } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';

import { OrderService } from '../../../../core/services/order.service';
import { Order, OrderStatus } from '../../../../core/models';
import { LocalizedPipe } from '../../../../shared/pipes/localized.pipe';
import { PricePipe } from '../../../../shared/pipes/price.pipe';
import { SafeImagePipe } from '../../../../shared/pipes/safe-image.pipe';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LoaderComponent } from '../../../../shared/components/loader/loader.component';
import { OrderReviewsComponent } from '../../components/order-reviews/order-reviews.component';
import {
  BreadcrumbsComponent,
  Breadcrumb,
} from '../../../../shared/components/breadcrumbs/breadcrumbs.component';

type LoadState = 'loading' | 'success' | 'error';

const FETCH_TIMEOUT_MS = 8000;

const STATUS_FLOW: OrderStatus[] = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

@Component({
  selector: 'app-account-order-details',
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
    BreadcrumbsComponent,
    OrderReviewsComponent,
  ],
  templateUrl: './order-details.component.html',
  styleUrl: './order-details.component.scss',
})
export class AccountOrderDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private orderService = inject(OrderService);
  private destroyRef = inject(DestroyRef);

  protected readonly state = signal<LoadState>('loading');
  protected readonly order = signal<Order | null>(null);

  protected readonly breadcrumbs: Breadcrumb[] = [
    { label: 'Home', url: '/' },
    { label: 'Account', url: '/account' },
    { label: 'Orders', url: '/account/orders' },
    { label: 'Order Details' },
  ];

  protected readonly statusFlow = STATUS_FLOW;

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
        if (!res || !res.success || !res.data) {
          this.state.set('error');
          return;
        }
        this.order.set(res.data);
        this.state.set('success');
      });
  }

  protected isStepComplete(order: Order, step: OrderStatus): boolean {
    if (order.status === 'cancelled') return false;
    const currentIdx = this.statusFlow.indexOf(order.status);
    const stepIdx = this.statusFlow.indexOf(step);
    return stepIdx <= currentIdx;
  }

  protected isStepCurrent(order: Order, step: OrderStatus): boolean {
    return order.status === step;
  }

  protected statusClass(status: OrderStatus): string {
    return `is-${status}`;
  }

  /** i18n key for the payment method label. */
  protected paymentMethodKey(method: string): string {
    switch (method) {
      case 'cod':
        return 'checkout.cashOnDelivery';
      case 'deposit':
        return 'checkout.paymentDeposit';
      case 'full':
        return 'checkout.paymentFull';
      default:
        return 'checkout.cashOnDelivery';
    }
  }

  /** i18n key for the payment status label. */
  protected paymentStatusKey(status: string): string {
    return `orderPayment.${status}`;
  }
}
