import { isPlatformBrowser } from '@angular/common';
import { Component, HostListener, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { map } from 'rxjs';

import { environment } from '../../../../environments/environment';

/** Scroll distance (px) after which the button fades in. */
const SHOW_AFTER_PX = 200;

/**
 * Floating WhatsApp button (storefront only).
 *
 * Mounted in MainLayoutComponent, so it never renders on /admin/* or /auth/*
 * (those routes live outside the main layout).
 */
@Component({
  selector: 'app-whatsapp-button',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './whatsapp-button.component.html',
  styleUrl: './whatsapp-button.component.scss',
})
export class WhatsappButtonComponent {
  private readonly translate = inject(TranslateService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** True once the page has been scrolled past SHOW_AFTER_PX. */
  protected readonly visible = signal(false);

  /** Localized pre-filled message; re-emits when the language changes. */
  private readonly message = toSignal(
    this.translate
      .stream('whatsapp.message')
      .pipe(map((value): string => (typeof value === 'string' ? value : ''))),
    { initialValue: '' },
  );

  /** wa.me deep link with the URL-encoded message. */
  protected readonly href = computed(() => {
    const base = `https://wa.me/${environment.whatsappNumber}`;
    const text = this.message();
    return text ? `${base}?text=${encodeURIComponent(text)}` : base;
  });

  constructor() {
    // Handle pages that load already scrolled (e.g. reload mid-page).
    this.updateVisibility();
  }

  @HostListener('window:scroll')
  protected onWindowScroll(): void {
    this.updateVisibility();
  }

  private updateVisibility(): void {
    if (!this.isBrowser) return;
    this.visible.set((window.scrollY || 0) > SHOW_AFTER_PX);
  }
}
