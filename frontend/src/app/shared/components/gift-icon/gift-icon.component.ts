import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type GiftIconName =
  | 'gift'
  | 'heart'
  | 'balloon'
  | 'flower'
  | 'teddy'
  | 'cap'
  | 'rings'
  | 'sparkle'
  | 'house';

/**
 * Lightweight decorative SVG icon set for the gift-shop atmosphere.
 * Colours come from the existing Bosi Gift CSS variables.
 */
@Component({
  selector: 'app-gift-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  template: `
    <svg viewBox="0 0 64 64" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg" focusable="false">
      @switch (name()) {
        @case ('gift') {
          <rect x="10" y="29" width="44" height="27" rx="4" fill="var(--brand-coral)" />
          <rect x="7" y="21" width="50" height="12" rx="4" fill="var(--brand-primary)" />
          <rect x="29" y="21" width="6" height="35" fill="#fff" fill-opacity=".9" />
          <path d="M32 21c-3-11-15-11-15-5 0 5 9 6 15 5Z" fill="var(--brand-pink)" />
          <path d="M32 21c3-11 15-11 15-5 0 5-9 6-15 5Z" fill="var(--brand-pink)" />
          <circle cx="32" cy="20" r="3.5" fill="var(--brand-primary)" />
        }
        @case ('heart') {
          <path d="M32 55C13 40 7 30 7 21a12.5 12.5 0 0 1 25-3 12.5 12.5 0 0 1 25 3c0 9-6 19-25 34Z" fill="var(--brand-primary)" />
          <path d="M16 20c0-4 3-7 7-7" stroke="#fff" stroke-opacity=".55" stroke-width="3" stroke-linecap="round" />
        }
        @case ('balloon') {
          <ellipse cx="32" cy="26" rx="17" ry="21" fill="var(--brand-coral)" />
          <ellipse cx="25" cy="17" rx="4" ry="7" fill="#fff" fill-opacity=".35" transform="rotate(20 25 17)" />
          <path d="M28 46h8l-4 5Z" fill="var(--brand-primary)" />
          <path d="M32 51c-5 4 4 7 0 12" stroke="var(--brand-ink)" stroke-opacity=".6" stroke-width="2" stroke-linecap="round" />
        }
        @case ('flower') {
          <g fill="var(--brand-pink)">
            <circle cx="32" cy="16" r="10" />
            <circle cx="47" cy="27" r="10" />
            <circle cx="41" cy="44" r="10" />
            <circle cx="23" cy="44" r="10" />
            <circle cx="17" cy="27" r="10" />
          </g>
          <circle cx="32" cy="32" r="8" fill="var(--brand-coral)" />
        }
        @case ('teddy') {
          <circle cx="15" cy="17" r="9" fill="#D9A27B" />
          <circle cx="49" cy="17" r="9" fill="#D9A27B" />
          <circle cx="15" cy="17" r="4.5" fill="#F3D3BA" />
          <circle cx="49" cy="17" r="4.5" fill="#F3D3BA" />
          <circle cx="32" cy="34" r="21" fill="#D9A27B" />
          <ellipse cx="32" cy="41" rx="10" ry="8" fill="#F3D3BA" />
          <circle cx="24" cy="30" r="2.6" fill="var(--brand-ink)" />
          <circle cx="40" cy="30" r="2.6" fill="var(--brand-ink)" />
          <ellipse cx="32" cy="38" rx="3.4" ry="2.4" fill="var(--brand-ink)" />
          <path d="M32 41v3m-4 0c2 2 6 2 8 0" stroke="var(--brand-ink)" stroke-width="1.6" stroke-linecap="round" />
          <path d="M22 55l10-4 10 4-10 4Z" fill="var(--brand-primary)" />
        }
        @case ('cap') {
          <path d="M32 12 60 26 32 40 4 26Z" fill="var(--brand-secondary)" />
          <path d="M16 34v11c0 6 32 6 32 0V34l-16 8Z" fill="var(--brand-secondary-hover)" />
          <path d="M56 28v15" stroke="var(--brand-coral)" stroke-width="3" stroke-linecap="round" />
          <circle cx="56" cy="46" r="3.5" fill="var(--brand-coral)" />
        }
        @case ('rings') {
          <circle cx="23" cy="40" r="14" stroke="var(--brand-pink)" stroke-width="6" />
          <circle cx="41" cy="40" r="14" stroke="var(--brand-primary)" stroke-width="6" />
          <path d="M23 8l6 7-6 8-6-8Z" fill="var(--brand-secondary-soft)" stroke="var(--brand-secondary)" stroke-width="2" stroke-linejoin="round" />
        }
        @case ('sparkle') {
          <path d="M28 4c2 15 7 20 22 22-15 2-20 7-22 22-2-15-7-20-22-22 15-2 20-7 22-22Z" fill="var(--brand-coral)" />
          <path d="M50 38c1 7 3 9 10 10-7 1-9 3-10 10-1-7-3-9-10-10 7-1 9-3 10-10Z" fill="var(--brand-pink)" />
        }
        @case ('house') {
          <path d="M7 31 32 10l25 21v22a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2Z" fill="var(--brand-secondary-soft)" stroke="var(--brand-secondary)" stroke-width="3" stroke-linejoin="round" />
          <path d="M32 47c-8-6-10-9-10-12a5 5 0 0 1 10-1 5 5 0 0 1 10 1c0 3-2 6-10 12Z" fill="var(--brand-primary)" />
        }
      }
    </svg>
  `,
})
export class GiftIconComponent {
  readonly name = input.required<GiftIconName>();
}
