import { CommonModule, DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, timeout } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';
import { TranslateService } from '@ngx-translate/core';
import {
  NewsletterService,
  NewsletterSubscriber,
} from '../../../../core/services/newsletter.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LoaderComponent } from '../../../../shared/components/loader/loader.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';

type LoadState = 'loading' | 'success' | 'empty' | 'error';
type StatusFilter = 'all' | 'active' | 'inactive';

const FETCH_TIMEOUT_MS = 8000;
const PAGE_SIZE = 20;

@Component({
  selector: 'app-admin-newsletter',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    TranslatePipe,
    EmptyStateComponent,
    LoaderComponent,
    PaginationComponent,
  ],
  templateUrl: './newsletter.component.html',
  styleUrl: './newsletter.component.scss',
})
export class AdminNewsletterComponent implements OnInit {
  private newsletterService = inject(NewsletterService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  protected readonly state = signal<LoadState>('loading');
  protected readonly subscribers = signal<NewsletterSubscriber[]>([]);
  protected readonly statusFilter = signal<StatusFilter>('all');
  protected readonly searchTerm = signal('');
  protected readonly page = signal(1);
  protected readonly totalPages = signal(1);
  protected readonly total = signal(0);
  protected readonly processingId = signal<string | null>(null);
  protected readonly copiedEmail = signal<string | null>(null);

  protected readonly filteredSubscribers = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return this.subscribers();
    return this.subscribers().filter((s) => s.email.toLowerCase().includes(term));
  });

  protected readonly activeCount = computed(
    () => this.subscribers().filter((s) => s.isActive).length,
  );

  protected readonly statusOptions: Array<{ value: StatusFilter; labelKey: string }> = [
    { value: 'all', labelKey: 'admin.newsletter.allStatus' },
    { value: 'active', labelKey: 'admin.newsletter.activeOnly' },
    { value: 'inactive', labelKey: 'admin.newsletter.inactiveOnly' },
  ];

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.state.set('loading');

    const status = this.statusFilter();
    const isActiveParam = status === 'all' ? undefined : status === 'active';

    this.newsletterService
      .list(isActiveParam, this.page(), PAGE_SIZE)
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
        this.subscribers.set(items);
        if (res.meta) {
          this.total.set(res.meta.total);
          this.totalPages.set(res.meta.totalPages);
        } else {
          this.total.set(items.length);
          this.totalPages.set(1);
        }
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
  }

  protected onPageChange(p: number): void {
    this.page.set(p);
    this.load();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected toggleActive(sub: NewsletterSubscriber): void {
    if (this.processingId()) return;
    this.processingId.set(sub._id);

    this.newsletterService
      .updateStatus(sub._id, !sub.isActive)
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        this.processingId.set(null);
        if (res?.success) {
          this.toast.success(
            this.translate.instant(
              sub.isActive ? 'toast.subscriberMarkedInactive' : 'toast.subscriberMarkedActive',
            ),
          );
          this.load();
        }
      });
  }

  protected remove(sub: NewsletterSubscriber): void {
    if (this.processingId()) return;
    if (!window.confirm(`Remove ${sub.email} from the list?`)) return;

    this.processingId.set(sub._id);

    this.newsletterService
      .delete(sub._id)
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        this.processingId.set(null);
        if (res?.success) {
          this.toast.success(this.translate.instant('toast.subscriberRemoved'));
          this.load();
        }
      });
  }

  protected copyEmail(email: string): void {
    navigator.clipboard?.writeText(email).then(
      () => {
        this.copiedEmail.set(email);
        this.toast.success(this.translate.instant('toast.emailCopied'));
        setTimeout(() => this.copiedEmail.set(null), 1500);
      },
      () => this.toast.error(this.translate.instant('toast.emailCopyFailed')),
    );
  }
}
