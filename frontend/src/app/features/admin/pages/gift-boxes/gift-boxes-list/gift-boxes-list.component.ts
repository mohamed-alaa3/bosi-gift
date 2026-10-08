import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, timeout } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';
import { TranslateService } from '@ngx-translate/core';
import {
  AdminGiftBoxService,
  AdminGiftBox,
} from '../../../../../core/services/admin-gift-box.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { LocalizedPipe } from '../../../../../shared/pipes/localized.pipe';
import { PricePipe } from '../../../../../shared/pipes/price.pipe';
import { SafeImagePipe } from '../../../../../shared/pipes/safe-image.pipe';
import { EmptyStateComponent } from '../../../../../shared/components/empty-state/empty-state.component';
import { LoaderComponent } from '../../../../../shared/components/loader/loader.component';
type LoadState = 'loading' | 'success' | 'empty' | 'error';

const FETCH_TIMEOUT_MS = 8000;

@Component({
  selector: 'app-admin-gift-boxes-list',
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
  templateUrl: './gift-boxes-list.component.html',
  styleUrl: './gift-boxes-list.component.scss',
})
export class AdminGiftBoxesListComponent implements OnInit {
  private giftBoxService = inject(AdminGiftBoxService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  protected readonly state = signal<LoadState>('loading');
  protected readonly boxes = signal<AdminGiftBox[]>([]);
  protected readonly deletingId = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.state.set('loading');

    this.giftBoxService
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
        this.boxes.set(res.data ?? []);
        this.state.set((res.data?.length ?? 0) > 0 ? 'success' : 'empty');
      });
  }

  protected remove(box: AdminGiftBox): void {
    if (this.deletingId()) return;
    const name = box.name.en || box.name.ar || 'this gift box';
    if (!window.confirm(`Delete "${name}"?`)) return;

    this.deletingId.set(box._id);

    this.giftBoxService
      .delete(box._id)
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        this.deletingId.set(null);
        if (res?.success) {
          this.toast.success(this.translate.instant('toast.giftBoxDeleted'));
          this.load();
        }
      });
  }
}
