import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, timeout } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';
import { TranslateService } from '@ngx-translate/core';
import {
  AdminRibbonService,
  AdminRibbonPayload,
} from '../../../../../core/services/admin-ribbon.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { LoaderComponent } from '../../../../../shared/components/loader/loader.component';

type FormMode = 'create' | 'edit';

const FETCH_TIMEOUT_MS = 10000;

const HEX_REGEX = /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/;

@Component({
  selector: 'app-admin-ribbon-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslatePipe, LoaderComponent],
  templateUrl: './ribbon-form.component.html',
  styleUrl: './ribbon-form.component.scss',
})
export class AdminRibbonFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private ribbonService = inject(AdminRibbonService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  protected readonly mode = signal<FormMode>('create');
  protected readonly ribbonId = signal<string | null>(null);
  protected readonly loading = signal(false);
  protected readonly submitting = signal(false);
  protected readonly selectedImage = signal<File | null>(null);
  protected readonly previewUrl = signal<string>('');

  protected readonly form = this.fb.nonNullable.group({
    nameEn: ['', [Validators.required, Validators.maxLength(80)]],
    nameAr: ['', [Validators.required, Validators.maxLength(80)]],
    color: ['#D4AF37', [Validators.required, Validators.pattern(HEX_REGEX)]],
    price: [0, [Validators.required, Validators.min(0)]],
    isActive: [true],
    sortOrder: [0],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.mode.set('edit');
      this.ribbonId.set(id);
      this.loadRibbon(id);
    }
  }

  private loadRibbon(id: string): void {
    this.loading.set(true);

    this.ribbonService
      .getById(id)
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        this.loading.set(false);
        if (!res?.success || !res.data) {
          this.toast.error(this.translate.instant('toast.ribbonNotFound'));
          this.router.navigate(['/admin/ribbons']);
          return;
        }

        const r = res.data;
        this.form.patchValue({
          nameEn: r.name.en || '',
          nameAr: r.name.ar || '',
          color: r.color || '#D4AF37',
          price: r.price,
          isActive: r.isActive,
          sortOrder: r.sortOrder ?? 0,
        });

        this.previewUrl.set(r.imageUrl || r.image || '');
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

    this.submitting.set(true);
    const v = this.form.getRawValue();

    const payload: AdminRibbonPayload = {
      name: { en: v.nameEn.trim(), ar: v.nameAr.trim() },
      color: v.color,
      price: Number(v.price),
      isActive: v.isActive,
      sortOrder: Number(v.sortOrder) || 0,
    };

    const image = this.selectedImage() ?? undefined;
    const id = this.ribbonId();

    const op$ = id
      ? this.ribbonService.update(id, payload, image)
      : this.ribbonService.create(payload, image);

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
          this.translate.instant(id ? 'toast.ribbonUpdated' : 'toast.ribbonCreated'),
        );
        this.router.navigate(['/admin/ribbons']);
      });
  }

  protected getFormLabel(): string {
    return this.mode() === 'create' ? 'admin.ribbons.addRibbon' : 'admin.ribbons.editRibbon';
  }
}
