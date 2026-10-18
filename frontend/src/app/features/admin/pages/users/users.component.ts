import { CommonModule, DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, timeout } from 'rxjs';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { AdminUser } from '../../../../core/models';
import { AuthStore } from '../../../../core/stores/auth.store';
import { ToastService } from '../../../../core/services/toast.service';
import { UserService } from '../../../../core/services/user.service';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LoaderComponent } from '../../../../shared/components/loader/loader.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';

type LoadState = 'loading' | 'success' | 'empty' | 'error';
type StatusFilter = 'all' | 'active' | 'suspended';
type UserAction = 'suspend' | 'reactivate' | 'delete';

const FETCH_TIMEOUT_MS = 8000;
const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 350;

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    TranslatePipe,
    ConfirmDialogComponent,
    EmptyStateComponent,
    LoaderComponent,
    PaginationComponent,
  ],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss',
})
export class AdminUsersComponent implements OnInit {
  private userService = inject(UserService);
  private authStore = inject(AuthStore);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  protected readonly state = signal<LoadState>('loading');
  protected readonly users = signal<AdminUser[]>([]);
  protected readonly statusFilter = signal<StatusFilter>('all');
  protected readonly searchTerm = signal('');
  protected readonly page = signal(1);
  protected readonly totalPages = signal(1);
  protected readonly total = signal(0);
  protected readonly processingId = signal<string | null>(null);

  /** Pending confirmation (null = dialog closed). */
  protected readonly pending = signal<{ user: AdminUser; action: UserAction } | null>(null);

  protected readonly statusOptions: Array<{ value: StatusFilter; labelKey: string }> = [
    { value: 'all', labelKey: 'admin.users.allStatus' },
    { value: 'active', labelKey: 'admin.users.activeOnly' },
    { value: 'suspended', labelKey: 'admin.users.suspendedOnly' },
  ];

  protected readonly currentUserId = computed(() => this.authStore.user()?._id ?? null);

  protected readonly dialog = computed(() => {
    const p = this.pending();
    if (!p) return null;
    const name = p.user.name;
    const map = {
      suspend: { t: 'admin.users.suspendTitle', m: 'admin.users.suspendMessage', c: 'admin.users.suspend', v: 'danger' as const },
      reactivate: { t: 'admin.users.reactivateTitle', m: 'admin.users.reactivateMessage', c: 'admin.users.reactivate', v: 'primary' as const },
      delete: { t: 'admin.users.deleteTitle', m: 'admin.users.deleteMessage', c: 'admin.users.delete', v: 'danger' as const },
    }[p.action];
    return {
      title: this.translate.instant(map.t),
      message: this.translate.instant(map.m, { name }),
      confirmText: this.translate.instant(map.c),
      variant: map.v,
    };
  });

  private searchTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => clearTimeout(this.searchTimer));
    this.load();
  }

  protected load(): void {
    this.state.set('loading');

    this.userService
      .list({
        page: this.page(),
        limit: PAGE_SIZE,
        search: this.searchTerm(),
        status: this.statusFilter(),
      })
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
        const items = res.data ?? [];
        this.users.set(items);
        this.total.set(res.meta?.total ?? items.length);
        this.totalPages.set(res.meta?.totalPages ?? 1);
        this.state.set(items.length > 0 ? 'success' : 'empty');
      });
  }

  protected setStatus(s: StatusFilter): void {
    if (this.statusFilter() === s) return;
    this.statusFilter.set(s);
    this.page.set(1);
    this.load();
  }

  protected onSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.page.set(1);
      this.load();
    }, SEARCH_DEBOUNCE_MS);
  }

  protected onPageChange(p: number): void {
    this.page.set(p);
    this.load();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** Admins (incl. yourself) are protected on the server too; the UI just hides the actions. */
  protected canManage(u: AdminUser): boolean {
    return u.role !== 'admin' && u._id !== this.currentUserId();
  }

  protected ask(user: AdminUser, action: UserAction): void {
    if (this.processingId() || !this.canManage(user)) return;
    this.pending.set({ user, action });
  }

  protected cancel(): void {
    this.pending.set(null);
  }

  protected confirm(): void {
    const p = this.pending();
    if (!p || this.processingId()) return;
    this.pending.set(null);
    this.processingId.set(p.user._id);

    const request$ =
      p.action === 'delete'
        ? this.userService.delete(p.user._id)
        : this.userService.setStatus(p.user._id, p.action === 'reactivate');

    request$
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        this.processingId.set(null);
        if (!res?.success) {
          // The HTTP interceptor already surfaced the server's message.
          this.toast.error(this.translate.instant('toast.userActionFailed'));
          return;
        }
        const key = {
          suspend: 'toast.userSuspended',
          reactivate: 'toast.userReactivated',
          delete: 'toast.userDeleted',
        }[p.action];
        this.toast.success(this.translate.instant(key));

        // Deleting the last row of a page → step back one page.
        if (p.action === 'delete' && this.users().length === 1 && this.page() > 1) {
          this.page.update((n) => n - 1);
        }
        this.load();
      });
  }
}
