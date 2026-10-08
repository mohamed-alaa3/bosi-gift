import { CommonModule, DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, timeout } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';
import { TranslateService } from '@ngx-translate/core';
import {
  ContactMessage,
  ContactService,
  ContactStatus,
} from '../../../../core/services/contact.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LoaderComponent } from '../../../../shared/components/loader/loader.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';

type LoadState = 'loading' | 'success' | 'empty' | 'error';

const FETCH_TIMEOUT_MS = 8000;
const PAGE_SIZE = 20;

@Component({
  selector: 'app-admin-contact-messages',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    TranslatePipe,
    EmptyStateComponent,
    LoaderComponent,
    PaginationComponent,
  ],
  templateUrl: './contact-messages.component.html',
  styleUrl: './contact-messages.component.scss',
})
export class AdminContactMessagesComponent implements OnInit {
  private contactService = inject(ContactService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  protected readonly state = signal<LoadState>('loading');
  protected readonly messages = signal<ContactMessage[]>([]);
  protected readonly statusFilter = signal<ContactStatus | 'all'>('all');
  protected readonly page = signal(1);
  protected readonly totalPages = signal(1);
  protected readonly total = signal(0);
  protected readonly processingId = signal<string | null>(null);

  // Detail modal
  protected readonly openMessage = signal<ContactMessage | null>(null);

  protected readonly statusOptions: Array<{ value: ContactStatus | 'all'; labelKey: string }> = [
    { value: 'all', labelKey: 'admin.contact.allStatus' },
    { value: 'new', labelKey: 'admin.contact.statusNew' },
    { value: 'read', labelKey: 'admin.contact.statusRead' },
    { value: 'replied', labelKey: 'admin.contact.statusReplied' },
  ];

  protected readonly newCount = computed(
    () => this.messages().filter((m) => m.status === 'new').length,
  );

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.state.set('loading');
    const status = this.statusFilter();

    this.contactService
      .list(status === 'all' ? undefined : status, this.page(), PAGE_SIZE)
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
        this.messages.set(items);
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

  protected setStatus(s: ContactStatus | 'all'): void {
    if (this.statusFilter() === s) return;
    this.statusFilter.set(s);
    this.page.set(1);
    this.load();
  }

  protected onPageChange(p: number): void {
    this.page.set(p);
    this.load();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected openDetail(msg: ContactMessage): void {
    this.openMessage.set(msg);
    // Mark as read if it was 'new'
    if (msg.status === 'new') {
      this.updateStatus(msg, 'read', false);
    }
  }

  protected closeDetail(): void {
    this.openMessage.set(null);
  }

  protected updateStatus(
    msg: ContactMessage,
    status: ContactStatus,
    showToast: boolean = true,
  ): void {
    if (this.processingId()) return;
    this.processingId.set(msg._id);

    this.contactService
      .updateStatus(msg._id, status)
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        this.processingId.set(null);
        if (res?.success) {
          if (showToast) this.toast.success('Status updated');if (showToast) this.toast.success(this.translate.instant('toast.statusUpdated'));          // Update the open message too if same
          if (this.openMessage()?._id === msg._id) {
            this.openMessage.set(res.data);
          }
          this.load();
        }
      });
  }

  protected remove(msg: ContactMessage): void {
    if (this.processingId()) return;
    if (!window.confirm(`Delete message from ${msg.name}?`)) return;

    this.processingId.set(msg._id);

    this.contactService
      .delete(msg._id)
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        this.processingId.set(null);
        if (res?.success) {
this.toast.success(this.translate.instant('toast.messageDeleted'));
          this.closeDetail();
          this.load();
        }
      });
  }

  protected statusClass(status: ContactStatus): string {
    return `is-${status}`;
  }

  protected replyViaEmail(msg: ContactMessage): void {
    window.location.href = `mailto:${msg.email}?subject=Re: ${encodeURIComponent(msg.subject || 'Your message')}`;
  }
}
