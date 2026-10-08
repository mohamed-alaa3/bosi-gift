import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { catchError, of, timeout } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';

import { ProductService } from '../../../../../core/services/product.service';
import { CategoryService } from '../../../../../core/services/category.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { TranslateService } from '@ngx-translate/core';
import { Category, ProductOption, ProductPayload } from '../../../../../core/models';
import { LocalizedPipe } from '../../../../../shared/pipes/localized.pipe';
import { SafeImagePipe } from '../../../../../shared/pipes/safe-image.pipe';
import { OCCASIONS, RECIPIENTS } from '../../../../../core/constants/gift-taxonomy';
import { LoaderComponent } from '../../../../../shared/components/loader/loader.component';

type WizardStep = 1 | 2 | 3 | 4;
type FormMode = 'create' | 'edit';

const FETCH_TIMEOUT_MS = 10000;

interface ImageItem {
  file?: File;
  url: string;
  isExisting: boolean;
}

@Component({
  selector: 'app-admin-product-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    TranslatePipe,
    LocalizedPipe,
    SafeImagePipe,
    LoaderComponent,
  ],
  templateUrl: './product-form.component.html',
  styleUrl: './product-form.component.scss',
})
export class AdminProductFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  protected readonly step = signal<WizardStep>(1);
  protected readonly mode = signal<FormMode>('create');
  protected readonly productId = signal<string | null>(null);
  protected readonly loading = signal(false);
  protected readonly submitting = signal(false);

  protected readonly categories = signal<Category[]>([]);
  protected readonly images = signal<ImageItem[]>([]);
  protected readonly options = signal<ProductOption[]>([]);

  protected readonly basicForm = this.fb.nonNullable.group({
    nameEn: ['', [Validators.required, Validators.maxLength(120)]],
    nameAr: ['', [Validators.required, Validators.maxLength(120)]],
    descriptionEn: ['', [Validators.required, Validators.maxLength(3000)]],
    descriptionAr: ['', [Validators.required, Validators.maxLength(3000)]],
    shortDescriptionEn: ['', [Validators.maxLength(300)]],
    shortDescriptionAr: ['', [Validators.maxLength(300)]],
  });

  protected readonly pricingForm = this.fb.nonNullable.group({
    price: [0, [Validators.required, Validators.min(0)]],
    discountPrice: [<number | null>null],
    category: ['', [Validators.required]],
    stock: [0, [Validators.required, Validators.min(0)]],
    sku: [''],
    isFeatured: [false],
    isActive: [true],
    isReadyGiftBox: [false],
    isDailyOffer: [false],
    dailyOfferStart: [''],
    dailyOfferEnd: [''],
  });

  // Gift discovery metadata (optional)
  protected readonly recipientOptions = RECIPIENTS;
  protected readonly occasionOptions = OCCASIONS;
  protected readonly recipients = signal<string[]>([]);
  protected readonly occasions = signal<string[]>([]);

  protected toggleRecipient(slug: string): void {
    this.recipients.update((l) => (l.includes(slug) ? l.filter((s) => s !== slug) : [...l, slug]));
  }

  protected toggleOccasion(slug: string): void {
    this.occasions.update((l) => (l.includes(slug) ? l.filter((s) => s !== slug) : [...l, slug]));
  }

  /** ISO → value for <input type="datetime-local"> (local time). */
  private toLocalInput(iso?: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  private fromLocalInput(value: string): string | null {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }

  protected readonly steps = [
    { num: 1, labelKey: 'admin.products.step1' },
    { num: 2, labelKey: 'admin.products.step2' },
    { num: 3, labelKey: 'admin.products.step3' },
    { num: 4, labelKey: 'admin.products.step4' },
  ];

  // Form validity/value are not signals, so mirror them with toSignal;
  // otherwise computed() caches the first (invalid) result forever.
  private readonly basicStatus = toSignal(this.basicForm.statusChanges, {
    initialValue: this.basicForm.status,
  });
  private readonly pricingStatus = toSignal(this.pricingForm.statusChanges, {
    initialValue: this.pricingForm.status,
  });
  private readonly pricingValue = toSignal(this.pricingForm.valueChanges, {
    initialValue: this.pricingForm.getRawValue(),
  });

  protected readonly canProceed = computed(() => {
    const s = this.step();
    if (s === 1) return this.basicStatus() === 'VALID';
    if (s === 2) return this.pricingStatus() === 'VALID' && !this.hasDiscountError();
    if (s === 3) return this.images().length > 0;
    return true;
  });

  protected readonly hasDiscountError = computed(() => {
    const p = this.pricingValue();
    if (p.discountPrice == null || p.discountPrice <= 0) return false;
    return p.discountPrice >= (p.price ?? 0);
  });

  ngOnInit(): void {
    this.loadCategories();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.mode.set('edit');
      this.productId.set(id);
      this.loadProduct(id);
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

  private loadProduct(id: string): void {
    this.loading.set(true);

    this.productService
      .getByIdOrSlug(id)
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        this.loading.set(false);
        if (!res?.success || !res.data) {
          this.toast.error(this.translate.instant('toast.productNotFound'));
          this.router.navigate(['/admin/products']);
          return;
        }

        const p = res.data;

        this.basicForm.patchValue({
          nameEn: p.name.en || '',
          nameAr: p.name.ar || '',
          descriptionEn: p.description.en || '',
          descriptionAr: p.description.ar || '',
          shortDescriptionEn: p.shortDescription?.en || '',
          shortDescriptionAr: p.shortDescription?.ar || '',
        });

        const categoryId = typeof p.category === 'object' ? p.category._id : p.category;

        this.pricingForm.patchValue({
          price: p.price,
          discountPrice: p.discountPrice ?? null,
          category: categoryId as string,
          stock: p.stock,
          sku: p.sku || '',
          isFeatured: p.isFeatured,
          isActive: p.isActive,
          isReadyGiftBox: !!p.isReadyGiftBox,
          isDailyOffer: !!p.isDailyOffer,
          dailyOfferStart: this.toLocalInput(p.dailyOfferStart),
          dailyOfferEnd: this.toLocalInput(p.dailyOfferEnd),
        });
        this.recipients.set([...(p.recipients ?? [])]);
        this.occasions.set([...(p.occasions ?? [])]);

        const urls = p.imageUrls?.length ? p.imageUrls : p.images;
        this.images.set(urls.map((url) => ({ url, isExisting: true })));

        this.options.set(p.options ? [...p.options] : []);
      });
  }

  protected next(): void {
    if (!this.canProceed()) {
      this.markStepTouched();
      return;
    }
    const s = this.step();
    if (s < 4) this.step.set((s + 1) as WizardStep);
  }

  protected back(): void {
    const s = this.step();
    if (s > 1) this.step.set((s - 1) as WizardStep);
  }

  protected goToStep(n: WizardStep): void {
    if (n === this.step()) return;
    if (n < this.step()) {
      this.step.set(n);
      return;
    }
    for (let i = 1; i < n; i++) {
      if (i === 1 && !this.basicForm.valid) return;
      if (i === 2 && (!this.pricingForm.valid || this.hasDiscountError())) return;
      if (i === 3 && this.images().length === 0) return;
    }
    this.step.set(n);
  }

  private markStepTouched(): void {
    const s = this.step();
    if (s === 1) this.basicForm.markAllAsTouched();
    if (s === 2) this.pricingForm.markAllAsTouched();
  }

  protected onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);

    const current = this.images().filter((i) => i.isExisting).length;
    const remaining = 5 - current;
    const accepted = files.slice(0, Math.max(0, remaining));

    const newItems: ImageItem[] = [];

    for (const file of accepted) {
      if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
        this.toast.error(this.translate.instant('toast.fileNotSupported', { name: file.name }));
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        this.toast.error(this.translate.instant('toast.fileTooLarge', { name: file.name }));
        continue;
      }
      newItems.push({
        file,
        url: URL.createObjectURL(file),
        isExisting: false,
      });
    }

    if (newItems.length === 0 && files.length > 0) {
      input.value = '';
      return;
    }

    this.images.update((list) => [...list, ...newItems]);
    input.value = '';
  }

  protected removeImage(index: number): void {
    this.images.update((list) => list.filter((_, i) => i !== index));
  }

  protected makePrimary(index: number): void {
    if (index === 0) return;
    this.images.update((list) => {
      const copy = [...list];
      const [item] = copy.splice(index, 1);
      copy.unshift(item);
      return copy;
    });
  }

  protected moveImage(from: number, to: number): void {
    this.images.update((list) => {
      const copy = [...list];
      const [item] = copy.splice(from, 1);
      copy.splice(to, 0, item);
      return copy;
    });
  }

  protected addOption(): void {
    this.options.update((list) => [
      ...list,
      {
        name: { en: '', ar: '' },
        values: [{ name: { en: '', ar: '' } }],
      },
    ]);
  }

  protected removeOption(optionIndex: number): void {
    this.options.update((list) => list.filter((_, i) => i !== optionIndex));
  }

  protected updateOptionName(optionIndex: number, lang: 'en' | 'ar', value: string): void {
    this.options.update((list) => {
      const copy = [...list];
      const opt = { ...copy[optionIndex] };
      opt.name = { ...opt.name, [lang]: value };
      copy[optionIndex] = opt;
      return copy;
    });
  }

  protected addOptionValue(optionIndex: number): void {
    this.options.update((list) => {
      const copy = [...list];
      const opt = { ...copy[optionIndex] };
      opt.values = [...opt.values, { name: { en: '', ar: '' } }];
      copy[optionIndex] = opt;
      return copy;
    });
  }

  protected removeOptionValue(optionIndex: number, valueIndex: number): void {
    this.options.update((list) => {
      const copy = [...list];
      const opt = { ...copy[optionIndex] };
      opt.values = opt.values.filter((_, i) => i !== valueIndex);
      copy[optionIndex] = opt;
      return copy;
    });
  }

  protected updateOptionValue(
    optionIndex: number,
    valueIndex: number,
    lang: 'en' | 'ar',
    value: string,
  ): void {
    this.options.update((list) => {
      const copy = [...list];
      const opt = { ...copy[optionIndex] };
      const values = [...opt.values];
      values[valueIndex] = {
        name: { ...values[valueIndex].name, [lang]: value },
      };
      opt.values = values;
      copy[optionIndex] = opt;
      return copy;
    });
  }

  protected submit(): void {
    if (this.submitting()) return;
    if (!this.basicForm.valid || !this.pricingForm.valid || this.images().length === 0) {
      this.toast.error(this.translate.instant('toast.productCompleteAllSteps'));
      return;
    }
    if (this.hasDiscountError()) {
      this.toast.error(this.translate.instant('toast.productDiscountPriceError'));
      return;
    }

    this.submitting.set(true);

    const basic = this.basicForm.getRawValue();
    const pricing = this.pricingForm.getRawValue();

    const payload: ProductPayload = {
      name: { en: basic.nameEn.trim(), ar: basic.nameAr.trim() },
      description: {
        en: basic.descriptionEn.trim(),
        ar: basic.descriptionAr.trim(),
      },
      shortDescription:
        basic.shortDescriptionEn || basic.shortDescriptionAr
          ? {
              en: basic.shortDescriptionEn.trim(),
              ar: basic.shortDescriptionAr.trim(),
            }
          : undefined,
      price: Number(pricing.price),
      discountPrice:
        pricing.discountPrice != null && pricing.discountPrice > 0
          ? Number(pricing.discountPrice)
          : null,
      category: pricing.category,
      stock: Number(pricing.stock),
      sku: pricing.sku.trim() || undefined,
      isFeatured: pricing.isFeatured,
      isActive: pricing.isActive,
      recipients: this.recipients(),
      occasions: this.occasions(),
      isReadyGiftBox: pricing.isReadyGiftBox,
      isDailyOffer: pricing.isDailyOffer,
      dailyOfferStart: this.fromLocalInput(pricing.dailyOfferStart),
      dailyOfferEnd: this.fromLocalInput(pricing.dailyOfferEnd),
      options: this.cleanOptions(),
    };

    const newFiles = this.images()
      .filter((i) => !i.isExisting && i.file)
      .map((i) => i.file as File);

    const id = this.productId();

    const op$ = id
      ? this.productService.update(id, payload, newFiles.length ? newFiles : undefined)
      : this.productService.create(payload, newFiles);

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
          this.translate.instant(id ? 'toast.productUpdated' : 'toast.productCreated'),
        );
        this.router.navigate(['/admin/products']);
      });
  }

  private cleanOptions(): ProductOption[] | undefined {
    const opts = this.options()
      .map((opt) => ({
        name: {
          en: opt.name.en.trim(),
          ar: opt.name.ar.trim(),
        },
        values: opt.values
          .map((v) => ({
            name: {
              en: v.name.en.trim(),
              ar: v.name.ar.trim(),
            },
          }))
          .filter((v) => v.name.en || v.name.ar),
      }))
      .filter((opt) => (opt.name.en || opt.name.ar) && opt.values.length > 0);

    return opts.length > 0 ? opts : undefined;
  }

  protected getFormLabel(): string {
    return this.mode() === 'create' ? 'admin.products.addProduct' : 'admin.products.editProduct';
  }

  protected isFieldInvalid(form: 'basic' | 'pricing', field: string): boolean {
    let ctrl: AbstractControl | null = null;
    if (form === 'basic') {
      ctrl = this.basicForm.get(field);
    } else {
      ctrl = this.pricingForm.get(field);
    }
    return !!ctrl && ctrl.touched && ctrl.invalid;
  }
}
