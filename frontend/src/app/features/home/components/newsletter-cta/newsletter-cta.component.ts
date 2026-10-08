import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { TranslateService } from '@ngx-translate/core';
import { NewsletterService } from '../../../../core/services/newsletter.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-newsletter-cta',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './newsletter-cta.component.html',
  styleUrl: './newsletter-cta.component.scss',
})
export class NewsletterCtaComponent {
  private newsletter = inject(NewsletterService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);

  protected readonly submitting = signal(false);
  protected readonly subscribed = signal(false);

  protected readonly emailControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.email],
  });

  protected submit(): void {
    if (this.emailControl.invalid || this.submitting()) {
      this.emailControl.markAsTouched();
      return;
    }

    this.submitting.set(true);
    const email = this.emailControl.value.trim();

    this.newsletter.subscribe(email).subscribe({
      next: () => {
        this.submitting.set(false);
        this.subscribed.set(true);
        this.emailControl.reset();
        this.toast.success(this.translate.instant('toast.thanksForSubscribingShort'));
      },
      error: () => {
        // error.interceptor already shows a toast
        this.submitting.set(false);
      },
    });
  }
}
