import { Directive, ElementRef, Input, OnInit, inject } from '@angular/core';

/**
 * Sets `loading="lazy"` and `decoding="async"` on `<img>` for better
 * performance, and handles the case when `[src]` is bound dynamically.
 *
 * Usage: <img [src]="url" appLazyImage>
 */
@Directive({
  selector: 'img[appLazyImage]',
  standalone: true,
})
export class LazyImageDirective implements OnInit {
  private el = inject(ElementRef<HTMLImageElement>);

  @Input() appLazyImage: 'lazy' | 'eager' = 'lazy';

  ngOnInit(): void {
    const img = this.el.nativeElement;
    img.loading = this.appLazyImage;
    img.decoding = 'async';
  }
}