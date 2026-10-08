import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, timeout } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';
import { TranslateService } from '@ngx-translate/core';
import {
  AdminWrapStyleService,
  AdminWrapStyle,
} from '../../../../../core/services/admin-wrap-style.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { LocalizedPipe } from '../../../../../shared/pipes/localized.pipe';
import { PricePipe } from '../../../../../shared/pipes/price.pipe';
import { SafeImagePipe } from '../../../../../shared/pipes/safe-image.pipe';
import { EmptyStateComponent } from '../../../../../shared/components/empty-state/empty-state.component';
import { LoaderComponent } from '../../../../../shared/components/loader/loader.component';

type LoadState = 'loading' | 'success' | 'empty' | 'error';

const FETCH_TIMEOUT_MS = 8000;

@Component({
  selector: 'app-admin-wrap-styles-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TranslatePipe,
    LocalizedPipe,
    PricePipe,
    SafeImagePipe,
    EmptyStateComponent,
    LoaderComponent,
  ],
  templateUrl: './wrap-styles-list.component.html',
  styleUrl: './wrap-styles-list.component.scss',
})
export class AdminWrapStylesListComponent implements OnInit {
  private wrapService = inject(AdminWrapStyleService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  protected readonly state = signal<LoadState>('loading');
  protected readonly styles = signal<AdminWrapStyle[]>([]);
  protected readonly deletingId = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.state.set('loading');

    this.wrapService
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
        this.styles.set(res.data ?? []);
        this.state.set((res.data?.length ?? 0) > 0 ? 'success' : 'empty');
      });
  }

  protected remove(style: AdminWrapStyle): void {
    if (this.deletingId()) return;
    const name = style.name.en || style.name.ar || 'this wrap style';
    if (!window.confirm(`Delete "${name}"?`)) return;

    this.deletingId.set(style._id);

    this.wrapService
      .delete(style._id)
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        this.deletingId.set(null);
        if (res?.success) {
          this.toast.success(this.translate.instant('toast.wrapStyleDeleted'));
          this.load();
        }
      });
  }
}
