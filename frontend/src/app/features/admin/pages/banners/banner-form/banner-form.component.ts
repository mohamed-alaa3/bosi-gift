import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, timeout } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';
import { TranslateService } from '@ngx-translate/core';
import { BannerService } from '../../../../../core/services/banner.service';
import { ToastService } from '../../../../../core/services/toast.service';

import { BannerPayload, BannerPosition } from '../../../../../core/models';
import { LoaderComponent } from '../../../../../shared/components/loader/loader.component';

type FormMode = 'create' | 'edit';

const FETCH_TIMEOUT_MS = 10000;

@Component({
  selector: 'app-admin-banner-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslatePipe, LoaderComponent],
  templateUrl: './banner-form.component.html',
  styleUrl: './banner-form.component.scss',
})
export class AdminBannerFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private bannerService = inject(BannerService);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  protected readonly mode = signal<FormMode>('create');
  protected readonly bannerId = signal<string | null>(null);
  protected readonly loading = signal(false);
  protected readonly submitting = signal(false);
  protected readonly selectedImage = signal<File | null>(null);
  protected readonly previewUrl = signal<string>('');

  protected readonly positionOptions: Array<{ value: BannerPosition; labelKey: string }> = [
    { value: 'hero', labelKey: 'admin.banners.positionHero' },
    { value: 'promo', labelKey: 'admin.banners.positionPromo' },
    { value: 'home-mid', labelKey: 'admin.banners.positionHomeMid' },
  ];

  protected readonly form = this.fb.nonNullable.group({
    titleEn: ['', [Validators.required]],
    titleAr: ['', [Validators.required]],
    subtitleEn: [''],
    subtitleAr: [''],
    buttonTextEn: [''],
    buttonTextAr: [''],
    buttonLink: [''],
    position: ['hero' as BannerPosition, [Validators.required]],
    isActive: [true],
    sortOrder: [0],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.mode.set('edit');
      this.bannerId.set(id);
      this.loadBanner(id);
    }
  }

  private loadBanner(id: string): void {
    this.loading.set(true);

    this.bannerService
      .getById(id)
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        this.loading.set(false);
        if (!res?.success || !res.data) {
          this.toast.error(this.translate.instant('toast.bannerNotFound'));
          this.router.navigate(['/admin/banners']);
          return;
        }

        const b = res.data;
        this.form.patchValue({
          titleEn: b.title.en || '',
          titleAr: b.title.ar || '',
          subtitleEn: b.subtitle?.en || '',
          subtitleAr: b.subtitle?.ar || '',
          buttonTextEn: b.buttonText?.en || '',
          buttonTextAr: b.buttonText?.ar || '',
          buttonLink: b.buttonLink || '',
          position: b.position,
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

    const id = this.bannerId();
    if (this.mode() === 'create' && !this.selectedImage()) {
this.toast.error(this.translate.instant('toast.chooseBannerImage'));
      return;
    }

    this.submitting.set(true);
    const v = this.form.getRawValue();

    const payload: BannerPayload = {
      title: { en: v.titleEn.trim(), ar: v.titleAr.trim() },
      subtitle: { en: v.subtitleEn.trim(), ar: v.subtitleAr.trim() },
      buttonText: { en: v.buttonTextEn.trim(), ar: v.buttonTextAr.trim() },
      buttonLink: v.buttonLink.trim(),
      position: v.position,
      isActive: v.isActive,
      sortOrder: Number(v.sortOrder) || 0,
    };

    const image = this.selectedImage() ?? undefined;

    const op$ = id
      ? this.bannerService.update(id, payload, image)
      : this.bannerService.create(payload, image!);

    op$
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        this.submitting.set(false);
        if (!res?.success) return;

this.toast.success(this.translate.instant(id ? 'toast.bannerUpdated' : 'toast.bannerCreated'));
        this.router.navigate(['/admin/banners']);
      });
  }

  protected getFormLabel(): string {
    return this.mode() === 'create' ? 'admin.banners.addBanner' : 'admin.banners.editBanner';
  }
}
