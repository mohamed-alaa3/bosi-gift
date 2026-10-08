import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, timeout } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';
import { TranslateService } from '@ngx-translate/core';
import { BannerService } from '../../../../../core/services/banner.service';
import { ToastService } from '../../../../../core/services/toast.service';

import { Banner, BannerPosition } from '../../../../../core/models';
import { LocalizedPipe } from '../../../../../shared/pipes/localized.pipe';
import { SafeImagePipe } from '../../../../../shared/pipes/safe-image.pipe';
import { EmptyStateComponent } from '../../../../../shared/components/empty-state/empty-state.component';
import { LoaderComponent } from '../../../../../shared/components/loader/loader.component';

type LoadState = 'loading' | 'success' | 'empty' | 'error';

const FETCH_TIMEOUT_MS = 8000;

@Component({
  selector: 'app-admin-banners-list',
  standalone: true,
  imports: [
    CommonModule,
    TranslatePipe,
    LocalizedPipe,
    SafeImagePipe,
    EmptyStateComponent,
    LoaderComponent,
  ],
  templateUrl: './banners-list.component.html',
  styleUrl: './banners-list.component.scss',
})
export class AdminBannersListComponent implements OnInit {
  private bannerService = inject(BannerService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private translate = inject(TranslateService);
  protected readonly state = signal<LoadState>('loading');
  protected readonly banners = signal<Banner[]>([]);
  protected readonly positionFilter = signal<BannerPosition | 'all'>('all');
  protected readonly deletingId = signal<string | null>(null);

  protected readonly positionOptions: Array<{ value: BannerPosition | 'all'; labelKey: string }> = [
    { value: 'all', labelKey: 'admin.banners.allPositions' },
    { value: 'hero', labelKey: 'admin.banners.positionHero' },
    { value: 'promo', labelKey: 'admin.banners.positionPromo' },
    { value: 'home-mid', labelKey: 'admin.banners.positionHomeMid' },
  ];

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.state.set('loading');
    const pos = this.positionFilter();

    this.bannerService
      .list(pos === 'all' ? undefined : pos, true)
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
        this.banners.set(res.data ?? []);
        this.state.set((res.data?.length ?? 0) > 0 ? 'success' : 'empty');
      });
  }

  protected setPosition(p: BannerPosition | 'all'): void {
    if (this.positionFilter() === p) return;
    this.positionFilter.set(p);
    this.load();
  }

  protected goToNew(): void {
    this.router.navigate(['/admin/banners/new']);
  }

  protected goToEdit(id: string): void {
    this.router.navigate(['/admin/banners', id, 'edit']);
  }

  protected remove(b: Banner): void {
    if (this.deletingId()) return;
    if (!window.confirm(`Delete banner "${b.title.en || b.title.ar}"?`)) return;

    this.deletingId.set(b._id);

    this.bannerService
      .delete(b._id)
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        this.deletingId.set(null);
        if (res?.success) {
this.toast.success(this.translate.instant('toast.bannerDeleted'));
          this.load();
        }
      });
  }

  protected positionLabel(pos: BannerPosition): string {
    return 'admin.banners.position' + pos.charAt(0).toUpperCase() + pos.slice(1).replace('-', '');
  }
}
