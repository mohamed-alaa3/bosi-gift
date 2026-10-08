import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, timeout } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';
import { TranslateService } from '@ngx-translate/core';
import {
  AdminGiftBoxService,
  AdminGiftBoxPayload,
} from '../../../../../core/services/admin-gift-box.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { LoaderComponent } from '../../../../../shared/components/loader/loader.component';
type FormMode = 'create' | 'edit';

const FETCH_TIMEOUT_MS = 10000;

@Component({
  selector: 'app-admin-gift-box-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslatePipe, LoaderComponent],
  templateUrl: './gift-box-form.component.html',
  styleUrl: './gift-box-form.component.scss',
})
export class AdminGiftBoxFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private giftBoxService = inject(AdminGiftBoxService);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  protected readonly mode = signal<FormMode>('create');
  protected readonly boxId = signal<string | null>(null);
  protected readonly loading = signal(false);
  protected readonly submitting = signal(false);
  protected readonly selectedImage = signal<File | null>(null);
  protected readonly previewUrl = signal<string>('');

  protected readonly form = this.fb.nonNullable.group({
    nameEn: ['', [Validators.required, Validators.maxLength(80)]],
    nameAr: ['', [Validators.required, Validators.maxLength(80)]],
    descriptionEn: ['', [Validators.maxLength(500)]],
    descriptionAr: ['', [Validators.maxLength(500)]],
    basePrice: [0, [Validators.required, Validators.min(0)]],
    capacity: [5, [Validators.required, Validators.min(1), Validators.max(50)]],
    isActive: [true],
    sortOrder: [0],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.mode.set('edit');
      this.boxId.set(id);
      this.loadBox(id);
    }
  }

  private loadBox(id: string): void {
    this.loading.set(true);

    this.giftBoxService
      .getById(id)
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        this.loading.set(false);
        if (!res?.success || !res.data) {
this.toast.error(this.translate.instant('toast.giftBoxNotFound'));
          this.router.navigate(['/admin/gift-boxes']);
          return;
        }

        const b = res.data;
        this.form.patchValue({
          nameEn: b.name.en || '',
          nameAr: b.name.ar || '',
          descriptionEn: b.description.en || '',
          descriptionAr: b.description.ar || '',
          basePrice: b.basePrice,
          capacity: b.capacity,
          isActive: b.isActive,
          sortOrder: b.sortOrder ?? 0,
        });

        this.previewUrl.set(b.imageUrl || b.image || '');
      });
  }

  protected onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
this.toast.error(this.translate.instant('toast.invalidImageType'));
      input.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
  this.toast.error(this.translate.instant('toast.imageTooLarge'));
      input.value = '';
      return;
    }

    this.selectedImage.set(file);

    const reader = new FileReader();
    reader.onload = () => this.previewUrl.set(String(reader.result));
    reader.readAsDataURL(file);
  }

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const id = this.boxId();
    if (this.mode() === 'create' && !this.selectedImage()) {
this.toast.error(this.translate.instant('toast.chooseGiftBoxImage'));
      return;
    }

    this.submitting.set(true);
    const v = this.form.getRawValue();

    const payload: AdminGiftBoxPayload = {
      name: { en: v.nameEn.trim(), ar: v.nameAr.trim() },
      description: { en: v.descriptionEn.trim(), ar: v.descriptionAr.trim() },
      basePrice: Number(v.basePrice),
      capacity: Number(v.capacity),
      isActive: v.isActive,
      sortOrder: Number(v.sortOrder) || 0,
    };

    const image = this.selectedImage() ?? undefined;

    const op$ = id
      ? this.giftBoxService.update(id, payload, image)
      : this.giftBoxService.create(payload, image!);

    op$
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        this.submitting.set(false);
        if (!res?.success) return;

this.toast.success(this.translate.instant(id ? 'toast.giftBoxUpdated' : 'toast.giftBoxCreated'));
        this.router.navigate(['/admin/gift-boxes']);
      });
  }

  protected getFormLabel(): string {
    return this.mode() === 'create' ? 'admin.giftBoxes.addBox' : 'admin.giftBoxes.editBox';
  }
}
