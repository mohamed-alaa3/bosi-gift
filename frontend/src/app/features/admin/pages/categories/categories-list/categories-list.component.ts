import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, timeout } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';
import { TranslateService } from '@ngx-translate/core';
import { CategoryService } from '../../../../../core/services/category.service';
import { ToastService } from '../../../../../core/services/toast.service';

import { Category, CategoryPayload } from '../../../../../core/models';
import { LocalizedPipe } from '../../../../../shared/pipes/localized.pipe';
import { SafeImagePipe } from '../../../../../shared/pipes/safe-image.pipe';
import { EmptyStateComponent } from '../../../../../shared/components/empty-state/empty-state.component';
import { LoaderComponent } from '../../../../../shared/components/loader/loader.component';

type LoadState = 'loading' | 'success' | 'empty' | 'error';
type ModalMode = 'closed' | 'add' | 'edit';

const FETCH_TIMEOUT_MS = 8000;

@Component({
  selector: 'app-admin-categories-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslatePipe,
    LocalizedPipe,
    SafeImagePipe,
    EmptyStateComponent,
    LoaderComponent,
  ],
  templateUrl: './categories-list.component.html',
  styleUrl: './categories-list.component.scss',
})
export class AdminCategoriesListComponent implements OnInit {
  private fb = inject(FormBuilder);
  private categoryService = inject(CategoryService);
  private toast = inject(ToastService);
  private destroyRef = inject(DestroyRef);
  private translate = inject(TranslateService);
  protected readonly state = signal<LoadState>('loading');
  protected readonly categories = signal<Category[]>([]);
  protected readonly modalMode = signal<ModalMode>('closed');
  protected readonly editing = signal<Category | null>(null);
  protected readonly submitting = signal(false);
  protected readonly deletingId = signal<string | null>(null);
  protected readonly selectedImage = signal<File | null>(null);
  protected readonly previewUrl = signal<string>('');

  protected readonly form = this.fb.nonNullable.group({
    nameEn: ['', [Validators.required]],
    nameAr: ['', [Validators.required]],
    descriptionEn: [''],
    descriptionAr: [''],
    sortOrder: [0],
    isActive: [true],
  });

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.state.set('loading');

    this.categoryService
      .list(true)
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
        this.categories.set(res.data ?? []);
        this.state.set((res.data?.length ?? 0) > 0 ? 'success' : 'empty');
      });
  }

  // ---------- Modal ----------
  protected openAdd(): void {
    this.editing.set(null);
    this.form.reset({
      nameEn: '',
      nameAr: '',
      descriptionEn: '',
      descriptionAr: '',
      sortOrder: 0,
      isActive: true,
    });
    this.selectedImage.set(null);
    this.previewUrl.set('');
    this.modalMode.set('add');
  }

  protected openEdit(cat: Category): void {
    this.editing.set(cat);
    this.form.patchValue({
      nameEn: cat.name.en || '',
      nameAr: cat.name.ar || '',
      descriptionEn: cat.description.en || '',
      descriptionAr: cat.description.ar || '',
      sortOrder: cat.sortOrder ?? 0,
      isActive: cat.isActive,
    });
    this.selectedImage.set(null);
    this.previewUrl.set(cat.imageUrl || cat.image || '');
    this.modalMode.set('edit');
  }

  protected closeModal(): void {
    this.modalMode.set('closed');
    this.editing.set(null);
    this.selectedImage.set(null);
    this.previewUrl.set('');
  }

  protected onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
this.toast.error(this.translate.instant('toast.invalidImageType'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
this.toast.error(this.translate.instant('toast.imageTooLarge'));
      return;
    }

    this.selectedImage.set(file);

    // Preview
    const reader = new FileReader();
    reader.onload = () => this.previewUrl.set(String(reader.result));
    reader.readAsDataURL(file);
  }

  protected submitForm(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const v = this.form.getRawValue();

    const payload: CategoryPayload = {
      name: { en: v.nameEn.trim(), ar: v.nameAr.trim() },
      description: { en: v.descriptionEn.trim(), ar: v.descriptionAr.trim() },
      isActive: v.isActive,
      sortOrder: Number(v.sortOrder) || 0,
    };

    const image = this.selectedImage() ?? undefined;
    const editing = this.editing();

    const op$ = editing
      ? this.categoryService.update(editing._id, payload, image)
      : this.categoryService.create(payload, image);

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
  this.translate.instant(editing ? 'toast.categoryUpdated' : 'toast.categoryCreated'),
);
        this.closeModal();
        this.load();
      });
  }

  protected remove(cat: Category): void {
    if (this.deletingId()) return;
    if (
      !window.confirm(
        `Delete "${cat.name.en || cat.name.ar}"? This only works if no products use it.`,
      )
    )
      return;

    this.deletingId.set(cat._id);

    this.categoryService
      .delete(cat._id)
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        this.deletingId.set(null);
        if (res?.success) {
this.toast.success(this.translate.instant('toast.categoryDeleted'));
          this.load();
        }
      });
  }
}
