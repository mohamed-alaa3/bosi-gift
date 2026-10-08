import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { catchError, of, timeout } from 'rxjs';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { AdminSettingsService } from '../../../../core/services/admin-settings.service';
import { LanguageService } from '../../../../core/services/language.service';
import { ToastService } from '../../../../core/services/toast.service';
import {
  AdminGovernorate,
  AdminSettings,
  GOVERNORATE_REGIONS,
  GovernorateRegion,
  GovernorateUpdate,
  LocalizedText,
  PaymentSettings,
  StoreSettings,
  UpdateSettingsPayload,
} from '../../../../core/models';
import { LocalizedPipe } from '../../../../shared/pipes/localized.pipe';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LoaderComponent } from '../../../../shared/components/loader/loader.component';
import { decodeSanitized } from '../../../../shared/utils/decode-sanitized';
import {
  normalizeEgyptMobile,
  normalizeInstapay,
  toLatinDigits,
} from '../../../../shared/utils/egypt-payment';

type LoadState = 'loading' | 'success' | 'error';
type TabId = 'shipping' | 'payment' | 'store';

interface ShippingRow {
  key: string;
  name: LocalizedText;
  region: GovernorateRegion;
  /** Value in the input (null = empty / not a number). */
  fee: number | null;
  enabled: boolean;
  /** Last saved values, to detect changes. */
  savedFee: number;
  savedEnabled: boolean;
}

interface RegionGroup {
  region: GovernorateRegion;
  rows: ShippingRow[];
}

const TABS: readonly { id: TabId; labelKey: string }[] = [
  { id: 'shipping', labelKey: 'admin.settings.tabs.shipping' },
  { id: 'payment', labelKey: 'admin.settings.tabs.payment' },
  { id: 'store', labelKey: 'admin.settings.tabs.store' },
];

const FETCH_TIMEOUT_MS = 10000;
const MAX_FEE = 100000;
const MAX_DEPOSIT = 100000;

const round2 = (n: number): number => Math.round(n * 100) / 100;

// ---------- Form validators (instant feedback; the server re-validates) ----------

const mobileOrEmpty: ValidatorFn = (control) => {
  const v = String(control.value ?? '').trim();
  return !v || normalizeEgyptMobile(v) ? null : { phone: true };
};

const instapayOrEmpty: ValidatorFn = (control) => {
  const v = String(control.value ?? '').trim();
  return !v || normalizeInstapay(v) ? null : { instapay: true };
};

const storePhone: ValidatorFn = (control) => {
  const v = toLatinDigits(String(control.value ?? '')).trim();
  return !v || /^[0-9+()\-\s.]+$/.test(v) ? null : { phone: true };
};

const optionalEmail: ValidatorFn = (control) => {
  const v = String(control.value ?? '').trim();
  return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : { email: true };
};

/** Only the fields whose value differs from what is saved. */
function diff<T extends object>(current: T, saved: T): Partial<T> {
  const out: Partial<T> = {};
  for (const key of Object.keys(saved) as (keyof T)[]) {
    if (current[key] !== saved[key]) out[key] = current[key];
  }
  return out;
}

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslatePipe,
    LocalizedPipe,
    EmptyStateComponent,
    LoaderComponent,
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class AdminSettingsComponent implements OnInit {
  private settingsService = inject(AdminSettingsService);
  private language = inject(LanguageService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  protected readonly tabs = TABS;
  protected readonly regions = GOVERNORATE_REGIONS;
  protected readonly maxFee = MAX_FEE;

  protected readonly state = signal<LoadState>('loading');
  protected readonly activeTab = signal<TabId>('shipping');
  /** Which tab is currently being saved (null = none). */
  protected readonly savingTab = signal<TabId | null>(null);

  // =====================================================================
  // Shipping
  // =====================================================================
  protected readonly rows = signal<ShippingRow[]>([]);
  protected readonly bulkValues = signal<Partial<Record<GovernorateRegion, string>>>({});

  protected readonly regionGroups = computed<RegionGroup[]>(() =>
    GOVERNORATE_REGIONS.map((region) => ({
      region,
      rows: this.rows().filter((r) => r.region === region),
    })).filter((g) => g.rows.length > 0),
  );

  protected readonly shippingDirty = computed(() => this.rows().some((r) => this.rowChanged(r)));
  protected readonly shippingInvalid = computed(() => this.rows().some((r) => !this.isFeeValid(r.fee)));

  // =====================================================================
  // Payment
  // =====================================================================
  protected readonly paymentForm = new FormGroup({
    depositAmount: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(1),
      Validators.max(MAX_DEPOSIT),
    ]),
    fullPaymentDiscountPercent: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(0),
      Validators.max(100),
    ]),
    vodafoneCashNumber: new FormControl('', { nonNullable: true, validators: [mobileOrEmpty] }),
    instapayNumber: new FormControl('', { nonNullable: true, validators: [instapayOrEmpty] }),
  });

  private readonly savedPayment = signal<PaymentSettings | null>(null);
  private readonly paymentValue = toSignal(this.paymentForm.valueChanges, {
    initialValue: this.paymentForm.getRawValue(),
  });
  private readonly paymentStatus = toSignal(this.paymentForm.statusChanges, {
    initialValue: this.paymentForm.status,
  });

  protected readonly paymentChanges = computed<Partial<PaymentSettings>>(() => {
    const saved = this.savedPayment();
    const v = this.paymentValue();
    if (!saved) return {};
    return diff<PaymentSettings>(
      {
        depositAmount: v.depositAmount ?? saved.depositAmount,
        fullPaymentDiscountPercent: v.fullPaymentDiscountPercent ?? saved.fullPaymentDiscountPercent,
        vodafoneCashNumber: (v.vodafoneCashNumber ?? '').trim(),
        instapayNumber: (v.instapayNumber ?? '').trim(),
      },
      saved,
    );
  });
  protected readonly paymentDirty = computed(() => Object.keys(this.paymentChanges()).length > 0);
  protected readonly paymentInvalid = computed(() => this.paymentStatus() === 'INVALID');

  /** Warn when checkout can't work because no number is configured (saved state). */
  protected readonly noPaymentNumber = computed(() => {
    const s = this.savedPayment();
    return !!s && !s.vodafoneCashNumber && !s.instapayNumber;
  });

  // =====================================================================
  // Store info
  // =====================================================================
  protected readonly storeForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(80)] }),
    phone: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(30), storePhone] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(120), optionalEmail] }),
    address: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(200)] }),
  });

  private readonly savedStore = signal<StoreSettings | null>(null);
  private readonly storeValue = toSignal(this.storeForm.valueChanges, {
    initialValue: this.storeForm.getRawValue(),
  });
  private readonly storeStatus = toSignal(this.storeForm.statusChanges, {
    initialValue: this.storeForm.status,
  });

  protected readonly storeChanges = computed<Partial<StoreSettings>>(() => {
    const saved = this.savedStore();
    const v = this.storeValue();
    if (!saved) return {};
    return diff<StoreSettings>(
      {
        name: (v.name ?? '').trim(),
        phone: (v.phone ?? '').trim(),
        email: (v.email ?? '').trim(),
        address: (v.address ?? '').trim(),
      },
      saved,
    );
  });
  protected readonly storeDirty = computed(() => Object.keys(this.storeChanges()).length > 0);
  protected readonly storeInvalid = computed(() => this.storeStatus() === 'INVALID');

  /** Dot on a tab label when it has unsaved changes. */
  protected readonly dirtyTabs = computed<Record<TabId, boolean>>(() => ({
    shipping: this.shippingDirty(),
    payment: this.paymentDirty(),
    store: this.storeDirty(),
  }));

  // =====================================================================
  // Lifecycle / loading
  // =====================================================================
  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.state.set('loading');

    this.settingsService
      .get()
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
        this.applyShipping(res.data.governorates);
        this.applyPayment(res.data.payment);
        this.applyStore(res.data.store);
        this.state.set('success');
      });
  }

  // ---- apply server state (each part independently, so saving one tab never resets another) ----

  private applyShipping(list: AdminGovernorate[]): void {
    this.rows.set(
      list.map((g) => ({
        key: g.key,
        name: g.name,
        region: g.region,
        fee: g.fee,
        enabled: g.enabled,
        savedFee: g.fee,
        savedEnabled: g.enabled,
      })),
    );
  }

  private applyPayment(p: PaymentSettings): void {
    this.savedPayment.set({ ...p });
    this.paymentForm.reset({ ...p });
  }

  private applyStore(s: AdminSettings['store']): void {
    // The API stores text HTML-escaped; show (and compare) the plain text.
    const plain: StoreSettings = {
      name: decodeSanitized(s.name),
      phone: decodeSanitized(s.phone),
      email: decodeSanitized(s.email),
      address: decodeSanitized(s.address),
    };
    this.savedStore.set(plain);
    this.storeForm.reset({ ...plain });
  }

  // =====================================================================
  // Tabs (WAI-ARIA tabs pattern: arrows, Home, End; RTL-aware)
  // =====================================================================
  protected selectTab(id: TabId): void {
    this.activeTab.set(id);
  }

  protected onTabKeydown(event: KeyboardEvent, current: TabId): void {
    const ids = TABS.map((t) => t.id);
    const index = ids.indexOf(current);
    const rtl = this.language.isRtl();

    let next: number;
    switch (event.key) {
      case 'ArrowRight':
        next = rtl ? index - 1 : index + 1;
        break;
      case 'ArrowLeft':
        next = rtl ? index + 1 : index - 1;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = ids.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    const target = ids[(next + ids.length) % ids.length];
    this.selectTab(target);
    queueMicrotask(() => document.getElementById(`settings-tab-${target}`)?.focus());
  }

  // =====================================================================
  // Shipping actions
  // =====================================================================
  protected isFeeValid(fee: number | null): boolean {
    return fee !== null && fee >= 0 && fee <= MAX_FEE;
  }

  protected rowChanged(r: ShippingRow): boolean {
    return r.fee !== r.savedFee || r.enabled !== r.savedEnabled;
  }

  private parseAmount(raw: string): number | null {
    const text = raw.trim();
    if (text === '') return null;
    const n = Number(text);
    return Number.isFinite(n) ? n : null;
  }

  private setFee(key: string, fee: number | null): void {
    this.rows.update((list) => list.map((r) => (r.key === key ? { ...r, fee } : r)));
  }

  protected onFeeInput(key: string, event: Event): void {
    this.setFee(key, this.parseAmount((event.target as HTMLInputElement).value));
  }

  protected toggleEnabled(key: string): void {
    this.rows.update((list) => list.map((r) => (r.key === key ? { ...r, enabled: !r.enabled } : r)));
  }

  protected onBulkInput(region: GovernorateRegion, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.bulkValues.update((v) => ({ ...v, [region]: value }));
  }

  protected bulkAmount(region: GovernorateRegion): number | null {
    const fee = this.parseAmount(this.bulkValues()[region] ?? '');
    return this.isFeeValid(fee) ? fee : null;
  }

  /** Sets every governorate in the group to the typed fee (not saved until "Save"). */
  protected applyBulk(region: GovernorateRegion): void {
    const fee = this.bulkAmount(region);
    if (fee === null) return;
    this.rows.update((list) => list.map((r) => (r.region === region ? { ...r, fee } : r)));
  }

  protected resetShipping(): void {
    this.rows.update((list) =>
      list.map((r) => ({ ...r, fee: r.savedFee, enabled: r.savedEnabled })),
    );
  }

  protected saveShipping(): void {
    if (!this.shippingDirty() || this.shippingInvalid()) return;

    const governorates: GovernorateUpdate[] = this.rows()
      .filter((r) => this.rowChanged(r))
      .map((r) => {
        const update: GovernorateUpdate = { key: r.key };
        if (r.fee !== r.savedFee && r.fee !== null) update.fee = round2(r.fee);
        if (r.enabled !== r.savedEnabled) update.enabled = r.enabled;
        return update;
      });

    this.save('shipping', { governorates }, (data) => this.applyShipping(data.governorates));
  }

  // =====================================================================
  // Payment / store actions
  // =====================================================================
  protected resetPayment(): void {
    const saved = this.savedPayment();
    if (saved) this.paymentForm.reset({ ...saved });
  }

  protected savePayment(): void {
    if (!this.paymentDirty() || this.paymentInvalid()) return;
    this.save('payment', { payment: this.paymentChanges() }, (data) => this.applyPayment(data.payment));
  }

  protected resetStore(): void {
    const saved = this.savedStore();
    if (saved) this.storeForm.reset({ ...saved });
  }

  protected saveStore(): void {
    if (!this.storeDirty() || this.storeInvalid()) return;
    this.save('store', { store: this.storeChanges() }, (data) => this.applyStore(data.store));
  }

  // =====================================================================
  // Shared save
  // =====================================================================
  private save(
    tab: TabId,
    payload: UpdateSettingsPayload,
    onSaved: (data: AdminSettings) => void,
  ): void {
    if (this.savingTab()) return;
    this.savingTab.set(tab);

    this.settingsService
      .update(payload)
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError((err: unknown) => {
          // HTTP errors were already announced by the global interceptor;
          // timeouts / network failures are silent, so tell the admin.
          if (!(err instanceof HttpErrorResponse)) {
            this.toast.error(this.translate.instant('admin.settings.toast.failed'));
          }
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        this.savingTab.set(null);
        if (!res?.success || !res.data) return;

        onSaved(res.data);
        this.toast.success(this.translate.instant(`admin.settings.toast.${tab}`));
      });
  }

  // =====================================================================
  // Template helpers
  // =====================================================================

  /** i18n key of the error to show for a control, or null. */
  protected errorKey(
    control: FormControl<number | null> | FormControl<string>,
    kind: 'deposit' | 'percent' | 'phone' | 'instapay' | 'text',
  ): string | null {
    if (!control.invalid || !(control.touched || control.dirty)) return null;
    const e = control.errors ?? {};

    if (e['required']) return 'admin.settings.errors.required';
    if (e['min'] || e['max']) {
      return kind === 'percent' ? 'admin.settings.errors.percentRange' : 'admin.settings.errors.depositRange';
    }
    if (e['phone']) return 'admin.settings.errors.phone';
    if (e['instapay']) return 'admin.settings.errors.instapay';
    if (e['email']) return 'admin.settings.errors.email';
    if (e['maxlength']) return 'admin.settings.errors.maxlength';
    return null;
  }
}
