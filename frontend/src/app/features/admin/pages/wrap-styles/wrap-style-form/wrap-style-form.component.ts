import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, timeout } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';
import { TranslateService } from '@ngx-translate/core';
import {
  AdminWrapStyleService,
  AdminWrapStylePayload,
} from '../../../../../core/services/admin-wrap-style.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { LoaderComponent } from '../../../../../shared/components/loader/loader.component';

type FormMode = 'create' | 'edit';

const FETCH_TIMEOUT_MS = 10000;

@Component({
  selector: 'app-admin-wrap-style-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslatePipe, LoaderComponent],
  templateUrl: './wrap-style-form.component.html',
  styleUrl: './wrap-style-form.component.scss',
})
export class AdminWrapStyleFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private wrapService = inject(AdminWrapStyleService);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  protected readonly mode = signal<FormMode>('create');
  protected readonly styleId = signal<string | null>(null);
  protected readonly loading = signal(false);
  protected readonly submitting = signal(false);
  protected readonly selectedImage = signal<File | null>(null);
  protected readonly previewUrl = signal<string>('');

  protected readonly form = this.fb.nonNullable.group({
    nameEn: ['', [Validators.required, Validators.maxLength(80)]],
    nameAr: ['', [Validators.required, Validators.maxLength(80)]],
    descriptionEn: ['', [Validators.maxLength(500)]],
    descriptionAr: ['', [Validators.maxLength(500)]],
    price: [0, [Validators.required, Validators.min(0)]],
    isActive: [true],
    sortOrder: [0],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.mode.set('edit');
      this.styleId.set(id);
      this.loadStyle(id);
    }
  }

  private loadStyle(id: string): void {
    this.loading.set(true);

    this.wrapService
      .getById(id)
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        this.loading.set(false);
        if (!res?.success || !res.data) {
          this.toast.error(this.translate.instant('toast.wrapStyleNotFound'));
          this.router.navigate(['/admin/wrap-styles']);
          return;
        }

        const s = res.data;
        this.form.patchValue({
          nameEn: s.name.en || '',
          nameAr: s.name.ar || '',
          descriptionEn: s.description.en || '',
          descriptionAr: s.description.ar || '',
          price: s.price,
          isActive: s.isActive,
          sortOrder: s.sortOrder ?? 0,
        });

        this.previewUrl.set(s.imageUrl || s.image || '');
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

    const id = this.styleId();
    if (this.mode() === 'create' && !this.selectedImage()) {
      this.toast.error(this.translate.instant('toast.chooseWrapStyleImage'));
      return;
    }

    this.submitting.set(true);
    const v = this.form.getRawValue();

    const payload: AdminWrapStylePayload = {
      name: { en: v.nameEn.trim(), ar: v.nameAr.trim() },
      description: { en: v.descriptionEn.trim(), ar: v.descriptionAr.trim() },
      price: Number(v.price),
      isActive: v.isActive,
      sortOrder: Number(v.sortOrder) || 0,
    };

    const image = this.selectedImage() ?? undefined;

    const op$ = id
      ? this.wrapService.update(id, payload, image)
      : this.wrapService.create(payload, image!);

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
          this.translate.instant(id ? 'toast.wrapStyleUpdated' : 'toast.wrapStyleCreated'),
        );
        this.router.navigate(['/admin/wrap-styles']);
      });
  }

  protected getFormLabel(): string {
    return this.mode() === 'create' ? 'admin.wrapStyles.addStyle' : 'admin.wrapStyles.editStyle';
  }
}
