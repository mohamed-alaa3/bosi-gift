import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { TranslateService } from '@ngx-translate/core';
import { NewsletterService } from '../../../core/services/newsletter.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, TranslatePipe],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
})
export class FooterComponent {
  private newsletterService = inject(NewsletterService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);
  protected readonly currentYear = new Date().getFullYear();
  protected readonly submitting = signal(false);
  protected readonly subscribed = signal(false);

  protected readonly emailControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.email],
  });

  protected readonly quickLinks = [
    { labelKey: 'footer.aboutUs', path: '/about' },
    { labelKey: 'footer.shopAll', path: '/shop' },
    { labelKey: 'footer.giftCards', path: '/gift-cards' },
    { labelKey: 'footer.shippingPolicy', path: '/shipping-policy' },
    { labelKey: 'footer.returns', path: '/returns-exchanges' },
  ];

  protected readonly socials = [
    {
      name: 'Facebook',
      url: 'https://facebook.com/habibastore',
      path: 'M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z',
    },
    {
      name: 'Instagram',
      url: 'https://instagram.com/habibastore',
      path: 'M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37zM17.5 6.5h.01M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5z',
    },
    {
      name: 'Twitter',
      url: 'https://twitter.com/habibastore',
      path: 'M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z',
    },
  ];

  protected subscribe(): void {
    if (this.emailControl.invalid) {
      this.emailControl.markAsTouched();
      return;
    }

    this.submitting.set(true);
    const email = this.emailControl.value.trim();

    this.newsletterService.subscribe(email).subscribe({
      next: () => {
        this.submitting.set(false);
        this.subscribed.set(true);
        this.emailControl.reset();
this.toast.success(this.translate.instant('toast.thanksForSubscribing'));
      },
      error: () => {
        this.submitting.set(false);
      },
    });
  }
}