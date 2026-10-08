import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * Thin, moving benefits strip shown above the header on the main layout.
 * It lives in normal page flow (scrolls away); the fixed header is offset
 * by --announce-h only while the page is at the top (see _gift-flow.scss).
 *
 * Seamless loop: the track holds two identical groups and slides by exactly
 * one group. RTL slides the opposite way (see keyframes). The 2nd group is
 * aria-hidden so screen readers announce the message once.
 * `prefers-reduced-motion`: no movement — a single static, centred message.
 */
@Component({
  selector: 'app-announcement-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  template: `
    <div class="announce" role="region" [attr.aria-label]="'announcement.label' | translate">
      <div class="announce__track">
        @for (g of groups; track g) {
          <div class="announce__group" [attr.aria-hidden]="g > 0 ? 'true' : null">
            @for (r of repeats; track r) {
              <span class="announce__set" [class.announce__set--extra]="r > 0">
                @for (k of keys; track k; let last = $last) {
                  <span class="announce__item">{{ k | translate }}</span>
                  <span class="announce__dot" aria-hidden="true">·</span>
                }
              </span>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    :host { display: block; }

    .announce {
      display: flex;
      align-items: center;
      height: var(--announce-h, 36px);
      overflow: hidden;
      color: #fff;
      font-size: 0.8125rem;
      font-weight: 600;
      letter-spacing: 0.01em;
      background: linear-gradient(90deg, var(--brand-primary), var(--brand-outline), var(--brand-primary));
    }

    .announce__track {
      display: flex;
      flex: none;
      width: max-content;
      animation: announce-scroll 36s linear infinite;
    }

    :host-context([dir='rtl']) .announce__track { animation-name: announce-scroll-rtl; }

    /* Don't make people chase moving text */
    .announce:hover .announce__track { animation-play-state: paused; }

    .announce__group { display: flex; flex: none; align-items: center; }
    .announce__set { display: inline-flex; align-items: center; }
    .announce__item { padding-inline: 0.9rem; white-space: nowrap; }
    .announce__dot { opacity: 0.7; font-weight: 700; }

    @keyframes announce-scroll {
      from { transform: translateX(0); }
      to { transform: translateX(-50%); }
    }

    @keyframes announce-scroll-rtl {
      from { transform: translateX(0); }
      to { transform: translateX(50%); }
    }

    @media (max-width: 480px) {
      .announce { font-size: 0.75rem; }
      .announce__track { animation-duration: 30s; }
    }

    @media (prefers-reduced-motion: reduce) {
      .announce { justify-content: center; }
      .announce__track { animation: none; width: auto; flex-wrap: wrap; justify-content: center; }
      .announce__group[aria-hidden='true'],
      .announce__set--extra { display: none; }
      /* no trailing separator when static */
      .announce__group .announce__set .announce__dot:last-child { display: none; }
    }
  `,
})
export class AnnouncementBarComponent {
  protected readonly keys = ['announcement.item1', 'announcement.item2', 'announcement.item3'];
  protected readonly groups = [0, 1];
  // Each group must be wider than the viewport for a gap-free loop.
  protected readonly repeats = [0, 1, 2, 3, 4];
}
