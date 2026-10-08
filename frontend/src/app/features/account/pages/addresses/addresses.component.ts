import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, timeout } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';
import { TranslateService } from '@ngx-translate/core';
import { AddressService } from '../../../../core/services/address.service';
import { ToastService } from '../../../../core/services/toast.service';

import { Address, AddressPayload } from '../../../../core/models';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LoaderComponent } from '../../../../shared/components/loader/loader.component';
import { RevealOnScrollDirective } from '../../../../shared/directives/reveal-on-scroll.directive';

type LoadState = 'loading' | 'success' | 'empty' | 'error';
type ModalMode = 'closed' | 'add' | 'edit';

const FETCH_TIMEOUT_MS = 8000;

@Component({
  selector: 'app-account-addresses',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslatePipe,
    EmptyStateComponent,
    LoaderComponent,
    RevealOnScrollDirective,
  ],
  templateUrl: './addresses.component.html',
  styleUrl: './addresses.component.scss',
})
export class AccountAddressesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private addressService = inject(AddressService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  protected readonly state = signal<LoadState>('loading');
  protected readonly addresses = signal<Address[]>([]);
  protected readonly modalMode = signal<ModalMode>('closed');
  protected readonly editingAddress = signal<Address | null>(null);
  protected readonly submitting = signal(false);
  protected readonly processingId = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.required]],
    country: ['', [Validators.required]],
    city: ['', [Validators.required]],
    area: [''],
    street: ['', [Validators.required]],
    building: [''],
    apartment: [''],
    postalCode: [''],
    isDefault: [false],
  });

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.state.set('loading');

    this.addressService
      .list()
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        if (!res || !res.success) {
          this.state.set('error');
          return;
        }
        this.addresses.set(res.data ?? []);
        this.state.set((res.data?.length ?? 0) > 0 ? 'success' : 'empty');
      });
  }

  // ---------- Modal ----------
  protected openAdd(): void {
    this.editingAddress.set(null);
    this.form.reset({
      fullName: '',
      phone: '',
      country: '',
      city: '',
      area: '',
      street: '',
      building: '',
      apartment: '',
      postalCode: '',
      isDefault: false,
    });
    this.modalMode.set('add');
  }

  protected openEdit(address: Address): void {
    this.editingAddress.set(address);
    this.form.patchValue({
      fullName: address.fullName,
      phone: address.phone,
      country: address.country,
      city: address.city,
      area: address.area || '',
      street: address.street,
      building: address.building || '',
      apartment: address.apartment || '',
      postalCode: address.postalCode || '',
      isDefault: address.isDefault,
    });
    this.modalMode.set('edit');
  }

  protected closeModal(): void {
    this.modalMode.set('closed');
    this.editingAddress.set(null);
  }

  protected submitForm(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);

    const payload: AddressPayload = {
      fullName: this.form.controls.fullName.value.trim(),
      phone: this.form.controls.phone.value.trim(),
      country: this.form.controls.country.value.trim(),
      city: this.form.controls.city.value.trim(),
      area: this.form.controls.area.value.trim(),
      street: this.form.controls.street.value.trim(),
      building: this.form.controls.building.value.trim(),
      apartment: this.form.controls.apartment.value.trim(),
      postalCode: this.form.controls.postalCode.value.trim(),
      isDefault: this.form.controls.isDefault.value,
    };

    const editing = this.editingAddress();
    const op$ = editing
      ? this.addressService.update(editing._id, payload)
      : this.addressService.create(payload);

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
          this.translate.instant(editing ? 'toast.addressUpdated' : 'toast.addressAdded'),
        );
        this.closeModal();
        this.load();
      });
  }

  // ---------- Row actions ----------
  protected setDefault(address: Address): void {
    if (address.isDefault || this.processingId()) return;
    this.processingId.set(address._id);

    this.addressService
      .setDefault(address._id)
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        this.processingId.set(null);
        if (res?.success) {
          this.toast.success(this.translate.instant('toast.defaultAddressUpdated'));

          this.load();
        }
      });
  }

  protected remove(address: Address): void {
    if (this.processingId()) return;
    if (!confirm(`Delete address for ${address.fullName}?`)) return;

    this.processingId.set(address._id);

    this.addressService
      .delete(address._id)
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        this.processingId.set(null);
        if (res?.success) {
          this.toast.success(this.translate.instant('toast.addressRemoved'));
          this.load();
        }
      });
  }
}
