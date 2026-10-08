import {
  Directive,
  ElementRef,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  inject,
  input,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type RevealVariant = 'up' | 'fade' | 'scale' | 'from-start' | 'from-end';

/**
 * Reveals an element (or the children of a group) with a short, subtle
 * animation the first time it enters the viewport.
 *
 * - Uses IntersectionObserver only — no scroll listeners.
 * - The animation itself lives in styles/_animations.scss (`.reveal`,
 *   `.reveal-group`, `.is-visible`); this directive only toggles classes.
 * - Elements stay in flow while hidden (opacity only) → no layout shift.
 * - prefers-reduced-motion, SSR and browsers without IntersectionObserver
 *   all reveal immediately.
 * - A new directive instance is created whenever a component/@if block is
 *   (re)created, so content re-enters on route navigation and state changes.
 *
 * Apply it to block-level section containers — not to component host tags
 * (those are `display: inline` by default) and not to every small element.
 *
 * Usage:
 *   <section appRevealOnScroll>…</section>
 *   <div appRevealOnScroll variant="fade">…</div>
 *   <div appRevealOnScroll variant="scale" [delay]="120">…</div>
 *   <ul appRevealOnScroll [stagger]="true">…children animate in sequence…</ul>
 *
 * Variants: 'up' (default) | 'fade' | 'scale' | 'from-start' | 'from-end'.
 * 'from-start' / 'from-end' follow the writing direction (mirrored in RTL).
 */
@Directive({
  selector: '[appRevealOnScroll]',
  standalone: true,
})
export class RevealOnScrollDirective implements OnInit, OnDestroy {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly platformId = inject(PLATFORM_ID);

  readonly variant = input<RevealVariant>('up');
  /** Extra delay in ms (applied through a CSS variable — no timers). */
  readonly delay = input<number>(0);
  /**
   * Intersection ratio needed to trigger. 0 (default) means "as soon as any
   * part enters the observed area", which is the only value that is safe for
   * tall elements (e.g. long legal pages) that can never be 15% visible.
   */
  readonly threshold = input<number>(0);
  /** false → hide again when the element leaves the viewport. */
  readonly once = input<boolean>(true);
  /** true → the container stays put and its direct children animate in sequence. */
  readonly stagger = input<boolean>(false);

  private observer: IntersectionObserver | null = null;

  ngOnInit(): void {
    const node = this.el.nativeElement;

    // SSR: nothing to observe — keep the content visible.
    if (!isPlatformBrowser(this.platformId)) {
      node.classList.add('is-visible');
      return;
    }

    // `.reveal-group` animates the children; `.reveal` animates the element.
    node.classList.add(this.stagger() ? 'reveal-group' : 'reveal');

    const variant = this.variant();
    if (variant !== 'up') {
      node.classList.add(`reveal-${variant}`);
    }

    const delay = Math.max(0, this.delay());
    if (delay > 0) {
      node.style.setProperty('--reveal-delay', `${delay}ms`);
    }

    // Reduced motion / no IntersectionObserver → reveal right away.
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion || typeof IntersectionObserver === 'undefined') {
      node.classList.add('is-visible');
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            if (this.once()) {
              this.observer?.unobserve(entry.target);
            }
          } else if (!this.once()) {
            entry.target.classList.remove('is-visible');
          }
        }
      },
      {
        threshold: this.threshold(),
        // Trigger slightly before the element reaches the very bottom edge.
        rootMargin: '0px 0px -40px 0px',
      },
    );

    this.observer.observe(node);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.observer = null;
  }
}
