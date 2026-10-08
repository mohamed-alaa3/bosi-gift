import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, timeout } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';
import { TranslateService } from '@ngx-translate/core';
import { ContactService } from '../../core/services/contact.service';
import { ToastService } from '../../core/services/toast.service';
import { RevealOnScrollDirective } from '../../shared/directives/reveal-on-scroll.directive';

const FETCH_TIMEOUT_MS = 10000;

@Component({
  selector: 'app-contact-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe, RevealOnScrollDirective],
  templateUrl: './contact.page.html',
  styleUrl: './contact.page.scss',
})
export class ContactPage {
  private fb = inject(FormBuilder);
  private contactService = inject(ContactService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  protected readonly submitting = signal(false);
  protected readonly submitted = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    subject: [''],
    message: ['', [Validators.required, Validators.minLength(10)]],
  });

  protected readonly contactInfo = [
    {
      id: 'address',
      icon: 'M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z M12 10a2 2 0 1 0 0 .01',
      titleKey: 'contact.addressTitle',
      valueKey: 'contact.address',
      href: null as string | null,
    },
    {
      id: 'phone',
      icon: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z',
      titleKey: 'contact.phoneTitle',
      valueKey: 'contact.phone',
      href: 'tel:+15551234567',
    },
    {
      id: 'email',
      icon: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6',
      titleKey: 'contact.emailTitle',
      valueKey: 'contact.emailAddress',
      href: 'mailto:hello@habibastore.com',
    },
  ];

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const v = this.form.getRawValue();

    this.contactService
      .send({
        name: v.name.trim(),
        email: v.email.trim(),
        subject: v.subject.trim() || undefined,
        message: v.message.trim(),
      })
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        this.submitting.set(false);
        if (res?.success) {
          this.submitted.set(true);
          this.form.reset();
          this.toast.success(this.translate.instant('toast.messageSent'));
        }
      });
  }

  protected sendAnother(): void {
    this.submitted.set(false);
  }
}
