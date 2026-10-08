import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  of,
  switchMap,
  timeout,
} from 'rxjs';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { AdminCouponService } from '../../../../../core/services/admin-coupon.service';
import { CategoryService } from '../../../../../core/services/category.service';
import { ProductService } from '../../../../../core/services/product.service';
import { ToastService } from '../../../../../core/services/toast.service';
import {
  Category,
  CouponPayload,
  CouponTargetRef,
  CouponType,
  Product,
} from '../../../../../core/models';
import { LocalizedPipe } from '../../../../../shared/pipes/localized.pipe';
import { LoaderComponent } from '../../../../../shared/components/loader/loader.component';

type FormMode = 'create' | 'edit';

const FETCH_TIMEOUT_MS = 10000;
const CODE_REGEX = /^[A-Za-z0-9_-]{3,32}$/;
const MIN_SEARCH_LENGTH = 2;

/** ISO string -> value for <input type="datetime-local"> (local time). */
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** <input type="datetime-local"> value -> ISO string (or null when empty). */
function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

@Component({
  selector: 'app-admin-coupon-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    TranslatePipe,
    LocalizedPipe,
    LoaderComponent,
  ],
  templateUrl: './coupon-form.component.html',
  styleUrl: './coupon-form.component.scss',
})
export class AdminCouponFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private couponService = inject(AdminCouponService);
  private categoryService = inject(CategoryService);
  private productService = inject(ProductService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  protected readonly mode = signal<FormMode>('create');
  protected readonly couponId = signal<string | null>(null);
  protected readonly loading = signal(false);
  protected readonly submitting = signal(false);

  // Scope (categories + products)
  protected readonly categories = signal<Category[]>([]);
  protected readonly selectedCategoryIds = signal<string[]>([]);
  protected readonly selectedProducts = signal<CouponTargetRef[]>([]);
  protected readonly productResults = signal<Product[]>([]);
  protected readonly searchingProducts = signal(false);
  protected readonly productSearch = new FormControl('', { nonNullable: true });

  protected readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(CODE_REGEX)]],
    type: ['percentage' as CouponType, [Validators.required]],
    value: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.01)]),
    minOrderAmount: this.fb.control<number | null>(null, [Validators.min(0)]),
    maxDiscountAmount: this.fb.control<number | null>(null, [Validators.min(0)]),
    usageLimit: this.fb.control<number | null>(null, [Validators.min(1)]),
    perUserLimit: this.fb.control<number | null>(1, [Validators.required, Validators.min(1)]),
    validFrom: [''],
    validUntil: [''],
    isActive: [true],
  });

  private readonly typeSignal = signal<CouponType>('percentage');
  protected readonly isPercentage = computed(() => this.typeSignal() === 'percentage');

  /** Selected products that are still visible in the result list are hidden from it. */
  protected readonly availableResults = computed(() => {
    const picked = new Set(this.selectedProducts().map((p) => p._id));
    return this.productResults().filter((p) => !picked.has(p._id));
  });

  constructor() {
    this.form.controls.type.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((type) => {
        this.typeSignal.set(type);
        this.applyTypeRules(type);
      });

    this.productSearch.valueChanges
      .pipe(
        debounceTime(300),
        map((q) => q.trim()),
        distinctUntilChanged(),
        switchMap((q) => {
          if (q.length < MIN_SEARCH_LENGTH) {
            this.searchingProducts.set(false);
            return of<Product[]>([]);
          }
          this.searchingProducts.set(true);
          return this.productService
            .list({ q, limit: 8, includeInactive: true })
            .pipe(
              map((res) => res.data ?? []),
              catchError(() => of<Product[]>([])),
            );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((results) => {
        this.searchingProducts.set(false);
        this.productResults.set(results);
      });
  }

  ngOnInit(): void {
    this.loadCategories();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.mode.set('edit');
      this.couponId.set(id);
      this.loadCoupon(id);
    }
  }

  private loadCategories(): void {
    this.categoryService
      .list(true)
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        if (res?.success) this.categories.set(res.data ?? []);
      });
  }

  private loadCoupon(id: string): void {
    this.loading.set(true);

    this.couponService
      .getById(id)
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        this.loading.set(false);
        if (!res?.success || !res.data) {
          this.toast.error(this.translate.instant('admin.coupons.notFound'));
          this.router.navigate(['/admin/coupons']);
          return;
        }

        const c = res.data;
        this.form.patchValue({
          code: c.code,
          type: c.type,
          value: c.value,
          minOrderAmount: c.minOrderAmount,
          maxDiscountAmount: c.maxDiscountAmount,
          usageLimit: c.usageLimit,
          perUserLimit: c.perUserLimit,
          validFrom: toLocalInput(c.validFrom),
          validUntil: toLocalInput(c.validUntil),
          isActive: c.isActive,
        });
        this.typeSignal.set(c.type);
        this.applyTypeRules(c.type);

        this.selectedCategoryIds.set(c.applicableCategories.map((cat) => cat._id));
        this.selectedProducts.set(c.applicableProducts);
      });
  }

  /** The cap only makes sense for percentage coupons; percentage is limited to 100. */
  private applyTypeRules(type: CouponType): void {
    const { maxDiscountAmount, value } = this.form.controls;

    if (type === 'percentage') {
      maxDiscountAmount.enable({ emitEvent: false });
      value.setValidators([Validators.required, Validators.min(0.01), Validators.max(100)]);
    } else {
      maxDiscountAmount.setValue(null, { emitEvent: false });
      maxDiscountAmount.disable({ emitEvent: false });
      value.setValidators([Validators.required, Validators.min(0.01)]);
    }
    value.updateValueAndValidity({ emitEvent: false });
  }

  // ---------- Scope ----------

  protected isCategorySelected(id: string): boolean {
    return this.selectedCategoryIds().includes(id);
  }

  protected toggleCategory(id: string): void {
    this.selectedCategoryIds.update((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    );
  }

  protected addProduct(product: Product): void {
    this.selectedProducts.update((list) =>
      list.some((p) => p._id === product._id)
        ? list
        : [...list, { _id: product._id, name: product.name }],
    );
  }

  protected removeProduct(id: string): void {
    this.selectedProducts.update((list) => list.filter((p) => p._id !== id));
  }

  // ---------- Submit ----------

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const validFrom = fromLocalInput(v.validFrom);
    const validUntil = fromLocalInput(v.validUntil);

    if (validFrom && validUntil && new Date(validUntil) <= new Date(validFrom)) {
      this.toast.error(this.translate.instant('admin.coupons.errorDates'));
      return;
    }

    const payload: CouponPayload = {
      code: v.code.trim().toUpperCase(),
      type: v.type,
      value: Number(v.value),
      minOrderAmount: v.minOrderAmount ?? null,
      maxDiscountAmount: v.type === 'percentage' ? (v.maxDiscountAmount ?? null) : null,
      usageLimit: v.usageLimit ?? null,
      perUserLimit: Number(v.perUserLimit) || 1,
      validFrom,
      validUntil,
      isActive: v.isActive,
      applicableCategories: this.selectedCategoryIds(),
      applicableProducts: this.selectedProducts().map((p) => p._id),
    };

    this.submitting.set(true);
    const id = this.couponId();

    const op$ = id ? this.couponService.update(id, payload) : this.couponService.create(payload);

    op$
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        this.submitting.set(false);
        if (!res?.success) return;

        this.toast.success(
          this.translate.instant(id ? 'admin.coupons.toastUpdated' : 'admin.coupons.toastCreated'),
        );
        this.router.navigate(['/admin/coupons']);
      });
  }

  protected getFormLabel(): string {
    return this.mode() === 'create' ? 'admin.coupons.addCoupon' : 'admin.coupons.editCoupon';
  }

  protected onCodeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const upper = input.value.toUpperCase();
    if (upper !== input.value) {
      input.value = upper;
      this.form.controls.code.setValue(upper);
    }
  }
}
