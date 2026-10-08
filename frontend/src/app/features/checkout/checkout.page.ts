import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, timeout } from 'rxjs';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { environment } from '../../../environments/environment';

import { LocalizedPipe } from '../../shared/pipes/localized.pipe';
import { PricePipe } from '../../shared/pipes/price.pipe';
import { SafeImagePipe } from '../../shared/pipes/safe-image.pipe';
import { CouponInputComponent } from './components/coupon-input/coupon-input.component';

import { CartService } from '../../core/services/cart.service';
import { OrderService } from '../../core/services/order.service';
import { AddressService } from '../../core/services/address.service';
import { SettingsService } from '../../core/services/settings.service';
import { ToastService } from '../../core/services/toast.service';
import { CartStore } from '../../core/stores/cart.store';
import { AuthStore } from '../../core/stores/auth.store';
import { CouponStore } from '../../core/stores/coupon.store';
import { CouponService } from '../../core/services/coupon.service';

import {
  Address,
  AddressSnapshot,
  CouponInvalidReason,
  CreateOrderResponse,
  Order,
  PaymentMethod,
  PaymentProofMethod,
  PublicGovernorate,
  QuoteResponse,
} from '../../core/models';

import { LoaderComponent } from '../../shared/components/loader/loader.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { InputComponent } from '../../shared/components/input/input.component';
import { TextareaComponent } from '../../shared/components/textarea/textarea.component';
import { SelectComponent, SelectOption } from '../../shared/components/select/select.component';

import {
  CheckoutStepIndicatorComponent,
  CheckoutStep,
} from './components/step-indicator/step-indicator.component';
import { CheckoutOrderReviewComponent } from './components/order-review/order-review.component';
import { CheckoutOrderConfirmationComponent } from './components/order-confirmation/order-confirmation.component';
import {
  CheckoutPaymentMethodComponent,
  PaymentOption,
} from './components/payment-method/payment-method.component';
import { CheckoutPaymentProofComponent } from './components/payment-proof/payment-proof.component';
import { RevealOnScrollDirective } from '../../shared/directives/reveal-on-scroll.directive';

type LoadState = 'loading' | 'ready' | 'empty' | 'error';
type FlowState = 'form' | 'submitting' | 'confirmed';

const FETCH_TIMEOUT_MS = 10000;
const GOV_NONE = '';

@Component({
  selector: 'app-checkout-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    TranslatePipe,
    LoaderComponent,
    EmptyStateComponent,
    InputComponent,
    TextareaComponent,
    SelectComponent,
    CheckoutStepIndicatorComponent,
    CheckoutOrderReviewComponent,
    CheckoutOrderConfirmationComponent,
    CheckoutPaymentMethodComponent,
    CheckoutPaymentProofComponent,
    PricePipe,
    LocalizedPipe,
    SafeImagePipe,
    CouponInputComponent,
    RevealOnScrollDirective,
  ],
  templateUrl: './checkout.page.html',
  styleUrl: './checkout.page.scss',
})
export class CheckoutPage implements OnInit {
  private fb = inject(FormBuilder);
  private cartService = inject(CartService);
  private orderService = inject(OrderService);
  private addressService = inject(AddressService);
  private settingsService = inject(SettingsService);
  private cartStore = inject(CartStore);
  private authStore = inject(AuthStore);
  private couponService = inject(CouponService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  /**
   * Store is used from the template, so it must be accessible there.
   * (The template calls couponStore.clear().)
   */
  protected readonly couponStore = inject(CouponStore);

  // ---------- State ----------
  protected readonly loadState = signal<LoadState>('loading');
  protected readonly flowState = signal<FlowState>('form');
  protected readonly currentStep = signal<CheckoutStep>('information');
  protected readonly submitting = signal(false);

  // ---------- Settings ----------
  protected readonly governorates = signal<PublicGovernorate[]>([]);
  protected readonly depositAmount = signal<number>(0);
  protected readonly fullPaymentDiscountPercent = signal<number>(0);
  protected readonly vodafoneCashNumber = signal<string>('');
  protected readonly instapayNumber = signal<string>('');

  // ---------- Cart (source of truth) ----------
  protected readonly items = computed(() => this.cartStore.items());
  protected readonly subtotal = computed(() => this.cartStore.subtotal());
  protected readonly hasUnavailable = computed(() => this.cartStore.hasUnavailable());

  // ---------- Coupon ----------
  protected readonly couponCode = computed(() => this.couponStore.code());
  protected readonly couponDiscount = computed(() => this.couponStore.discount());
  protected readonly couponNoticeReason = signal<CouponInvalidReason | null>(null);
  protected readonly couponNoticeAmount = signal<number | null>(null);

  // ---------- Quote (server-authoritative pricing) ----------
  protected readonly quote = signal<QuoteResponse | null>(null);
  protected readonly quoteLoading = signal(false);
  protected readonly quoteError = signal<string | null>(null);
  protected readonly priceChangedNotice = signal(false);

  // ---------- Payment ----------
  protected readonly paymentMethod = signal<PaymentMethod | ''>('');
  protected readonly paymentProofMethod = signal<PaymentProofMethod | ''>('');
  protected readonly paymentProofFile = signal<File | null>(null);

  // ---------- Address ----------
  protected readonly savedAddresses = signal<Address[]>([]);
  protected readonly selectedAddressId = signal<string | null>(null);

  // ---------- Order confirmation ----------
  protected readonly createdOrder = signal<Order | null>(null);
  protected readonly whatsappMessage = signal<string>('');
  protected readonly whatsappNumber = environment.whatsappNumber;

  // ---------- Form ----------
  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.required]],
    country: ['Egypt', [Validators.required]],
    governorate: [GOV_NONE, [Validators.required]],
    city: ['', [Validators.required]],
    area: [''],
    street: ['', [Validators.required]],
    building: [''],
    apartment: [''],
    postalCode: [''],
    notes: [''],
  });

  // ---------- Computed ----------
  protected readonly governorateOptions = computed<SelectOption[]>(() =>
    this.governorates()
      .filter((g) => g.enabled)
      .map((g) => ({
        value: g.key,
        label: this.translate.currentLang() === 'ar' ? g.name.ar : g.name.en,
      })),
  );

  protected readonly selectedGovernorate = computed<PublicGovernorate | null>(() => {
    const key = this.form.controls.governorate.value;
    if (!key) return null;
    return this.governorates().find((g) => g.key === key) ?? null;
  });

  protected readonly paymentOptions = computed<PaymentOption[]>(() => {
    const hasAnyNumber = !!this.vodafoneCashNumber() || !!this.instapayNumber();
    return [
      {
        value: 'cod',
        titleKey: 'checkout.paymentCod',
        descKey: 'checkout.paymentCodDesc',
        available: true,
      },
      {
        value: 'deposit',
        titleKey: 'checkout.paymentDeposit',
        descKey: 'checkout.paymentDepositDesc',
        available: hasAnyNumber && this.depositAmount() > 0,
      },
      {
        value: 'full',
        titleKey: 'checkout.paymentFull',
        descKey: 'checkout.paymentFullDesc',
        badgeKey: this.fullPaymentDiscountPercent() > 0 ? 'checkout.paymentFullBadge' : undefined,
        available: hasAnyNumber,
      },
    ];
  });

  protected readonly canPlaceOrder = computed(() => {
    if (this.hasUnavailable()) return false;
    if (this.items().length === 0) return false;
    if (!this.paymentMethod()) return false;

    const method = this.paymentMethod();
    if (method === 'deposit' || method === 'full') {
      if (!this.paymentProofMethod()) return false;
      if (!this.paymentProofFile()) return false;
    }

    const q = this.quote();
    if (!q) return false;

    return true;
  });

  // ---------- Lifecycle ----------
  ngOnInit(): void {
    if (!this.authStore.isAuthenticated()) {
      this.router.navigate(['/auth/login'], {
        queryParams: { redirect: '/checkout' },
      });
      return;
    }

    const user = this.authStore.user();
    if (user?.email) this.form.patchValue({ email: user.email });
    if (user?.name) this.form.patchValue({ fullName: user.name });
    if (user?.phone) this.form.patchValue({ phone: user.phone });

    this.loadSettings();
    this.loadCart();
    this.loadAddresses();

    // Re-quote whenever key inputs change
    this.form.controls.governorate.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refreshQuote());
  }

  // ---------- Loaders ----------
  private loadSettings(): void {
    this.settingsService
      .load(true)
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((data) => {
        if (!data) return;
        this.governorates.set(data.governorates);
        this.depositAmount.set(data.depositAmount);
        this.fullPaymentDiscountPercent.set(data.fullPaymentDiscountPercent);
        this.vodafoneCashNumber.set(data.vodafoneCashNumber);
        this.instapayNumber.set(data.instapayNumber);
      });
  }

  private loadCart(): void {
    this.loadState.set('loading');

    this.cartService
      .get()
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        if (!res || !res.success) {
          this.loadState.set('error');
          return;
        }
        const hasItems = (res.data.items?.length ?? 0) > 0;
        this.loadState.set(hasItems ? 'ready' : 'empty');
        if (hasItems) this.refreshCoupon();
      });
  }

  private refreshCoupon(): void {
    this.couponNoticeReason.set(null);

    this.couponService
      .refresh()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result && !result.valid && result.reason && result.reason !== 'EMPTY_CART') {
          this.couponNoticeAmount.set(result.minOrderAmount);
          this.couponNoticeReason.set(result.reason);
        }
        this.refreshQuote();
      });
  }

  /**
   * Called by the coupon-input component when the user applies a code.
   * On success we re-quote so the summary shows the fresh discount.
   */
  protected applyCouponInput(code: string): void {
    const value = (code || '').trim();
    if (!value) return;

    this.couponService
      .apply(value)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.refreshQuote(),
        error: () => {},
      });
  }

  private loadAddresses(): void {
    this.addressService
      .list()
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        if (!res?.success) return;
        this.savedAddresses.set(res.data ?? []);
        const def = res.data?.find((a) => a.isDefault);
        if (def) this.applyAddress(def);
      });
  }

  // ---------- Quote ----------
  /**
   * Public because the template calls it after removing a coupon.
   */
  protected refreshQuote(): void {
    const gov = this.form.controls.governorate.value;
    const method = this.paymentMethod();
    if (!gov || !method) {
      this.quote.set(null);
      return;
    }

    // Address is required for the quote — build a partial snapshot.
    const v = this.form.getRawValue();
    if (!v.fullName || !v.phone || !v.city || !v.street) {
      this.quote.set(null);
      return;
    }

    this.quoteLoading.set(true);
    this.quoteError.set(null);

    this.orderService
      .quote({
        shippingAddress: {
          fullName: v.fullName,
          phone: v.phone,
          country: v.country,
          city: v.city,
          area: v.area,
          street: v.street,
          building: v.building,
          apartment: v.apartment,
          postalCode: v.postalCode,
          governorate: v.governorate,
        },
        paymentMethod: method,
        couponCode: this.couponCode() ?? undefined,
        paymentProofMethod: this.paymentProofMethod() || undefined,
      })
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError((err: unknown) => {
          this.quoteLoading.set(false);
          this.handleQuoteError(err);
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        this.quoteLoading.set(false);
        if (!res?.success || !res.data) return;
        this.quote.set(res.data);
        this.priceChangedNotice.set(false);
      });
  }

  private handleQuoteError(err: unknown): void {
    if (err instanceof HttpErrorResponse) {
      // Coupon invalid
      const fieldErrors: unknown = err.error?.errors;
      if (Array.isArray(fieldErrors)) {
        const couponErr = fieldErrors.find((e: { field?: string }) => e?.field === 'couponCode');
        if (couponErr) {
          this.couponStore.clear();
          this.toast.error(this.translate.instant('coupon.errors.NOT_FOUND'));
          this.quote.set(null);
          return;
        }
      }
      // PRICE_CHANGED
      if (err.status === 409) {
        this.priceChangedNotice.set(true);
        this.toast.warning(this.translate.instant('checkout.priceChanged'));
        this.quote.set(null);
        return;
      }
    }
    this.quoteError.set(this.translate.instant('checkout.quoteError'));
    this.quote.set(null);
  }

  // ---------- Address ----------
  protected applyAddress(address: Address): void {
    this.selectedAddressId.set(address._id);
    this.form.patchValue({
      fullName: address.fullName,
      phone: address.phone,
      country: address.country || 'Egypt',
      // governorate is not stored on the saved address yet — leave it as-is
      city: address.city,
      area: address.area || '',
      street: address.street,
      building: address.building || '',
      apartment: address.apartment || '',
      postalCode: address.postalCode || '',
    });
  }

  // ---------- Payment ----------
  protected onPaymentMethodChange(method: PaymentMethod): void {
    this.paymentMethod.set(method);
    // Reset proof inputs when method changes
    this.paymentProofMethod.set('');
    this.paymentProofFile.set(null);
    this.refreshQuote();
  }

  protected onPaymentProofMethodChange(method: PaymentProofMethod): void {
    this.paymentProofMethod.set(method);
  }

  protected onPaymentProofFileChange(file: File | null): void {
    this.paymentProofFile.set(file);
  }

  protected onPaymentProofComponentFile(file: File | null): void {
    this.onPaymentProofFileChange(file);
  }

  // ---------- Steps ----------
  protected goToStep(step: CheckoutStep): void {
    this.currentStep.set(step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected continueFromInformation(): void {
    // Validate contact + address
    const controls = ['email', 'fullName', 'phone', 'country', 'governorate', 'city', 'street'];
    let valid = true;
    for (const name of controls) {
      const c = this.form.controls[name as keyof typeof this.form.controls];
      c.markAsTouched();
      if (c.invalid) valid = false;
    }
    if (!valid) return;

    this.goToStep('shipping');
  }

  protected continueFromShipping(): void {
    this.goToStep('coupon');
  }

  protected continueFromCoupon(): void {
    this.goToStep('payment');
  }

  protected continueFromPayment(): void {
    if (!this.paymentMethod()) {
      this.toast.error(this.translate.instant('checkout.paymentRequired'));
      return;
    }
    if (this.paymentMethod() === 'cod') {
      this.goToStep('review');
      this.refreshQuote();
      return;
    }
    this.goToStep('proof');
    this.refreshQuote();
  }

  protected continueFromProof(): void {
    if (!this.paymentProofMethod()) {
      this.toast.error(this.translate.instant('checkout.proofMethodRequired'));
      return;
    }
    if (!this.paymentProofFile()) {
      this.toast.error(this.translate.instant('checkout.proofFileRequired'));
      return;
    }
    this.goToStep('review');
  }

  protected backToStep(step: CheckoutStep): void {
    this.goToStep(step);
  }

  // ---------- Form helpers ----------
  protected showError(field: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[field];
    return c.touched && c.invalid;
  }

  protected errorFor(field: string): string {
    const c = (this.form.controls as Record<string, any>)[field];
    if (!c || !c.errors) return '';
    if (c.errors['required']) return this.translate.instant('errors.required');
    if (c.errors['email']) return this.translate.instant('errors.invalidEmail');
    if (c.errors['minlength']) return this.translate.instant('errors.tooShort');
    return this.translate.instant('errors.invalid');
  }

  // ---------- Place order ----------
  protected placeOrder(): void {
    if (!this.canPlaceOrder() || this.submitting()) return;

    const q = this.quote();
    const method = this.paymentMethod();
    if (!q || !method) return;

    this.submitting.set(true);
    this.flowState.set('submitting');

    const v = this.form.getRawValue();
    const shippingAddress: AddressSnapshot = {
      fullName: v.fullName,
      phone: v.phone,
      country: v.country,
      city: v.city,
      area: v.area,
      street: v.street,
      building: v.building,
      apartment: v.apartment,
      postalCode: v.postalCode,
      governorate: v.governorate,
    };

    // Pre-open the WhatsApp tab to avoid popup blockers
    const waTab = window.open('', '_blank');

    this.orderService
      .create({
        shippingAddress,
        notes: v.notes || undefined,
        couponCode: this.couponCode() ?? undefined,
        paymentMethod: method,
        paymentProofMethod: this.paymentProofMethod() || undefined,
        amountDueNow: q.amountDueNow,
        paymentProof: this.paymentProofFile(),
      })
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError((err: unknown) => {
          this.submitting.set(false);
          this.flowState.set('form');
          if (waTab) waTab.close();
          this.handleCreateError(err);
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        this.submitting.set(false);
        if (!res?.success || !res.data) {
          if (waTab) waTab.close();
          return;
        }

        const created = res.data as CreateOrderResponse;
        this.createdOrder.set(created.order);
        this.whatsappMessage.set(created.whatsappMessage);
        this.flowState.set('confirmed');
        this.cartStore.clear();
        this.couponStore.clear();

        // Open WhatsApp with the pre-formatted message
        this.openWhatsApp(created.whatsappMessage, waTab);

        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
  }

  private handleCreateError(err: unknown): void {
    if (err instanceof HttpErrorResponse) {
      // PRICE_CHANGED
      if (err.status === 409) {
        this.priceChangedNotice.set(true);
        this.toast.warning(this.translate.instant('checkout.priceChanged'));
        this.currentStep.set('review');
        this.refreshQuote();
        return;
      }
    }
    // The HTTP interceptor already surfaces most errors.
    this.toast.error(this.translate.instant('checkout.createError'));
  }

  private openWhatsApp(message: string, preOpenedTab: Window | null): void {
    const phone = environment.whatsappNumber;

    // Direct wa.me with encoded text (keep encodeURIComponent for safety)
    const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;

    if (preOpenedTab && !preOpenedTab.closed) {
      preOpenedTab.location.href = url;
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  protected retry(): void {
    this.loadCart();
  }
}
