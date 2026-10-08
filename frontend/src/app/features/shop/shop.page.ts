import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  HostListener,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, timeout } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';

import { ProductService } from '../../core/services/product.service';
import { CategoryService } from '../../core/services/category.service';
import { Product, ProductQuery, Category } from '../../core/models';
import {
  OCCASIONS,
  OCCASION_SLUGS,
  RECIPIENTS,
  RECIPIENT_SLUGS,
} from '../../core/constants/gift-taxonomy';

import {
  FilterSidebarComponent,
  ShopFilters,
} from './components/filter-sidebar/filter-sidebar.component';
import {
  SortDropdownComponent,
  SortOption,
} from './components/sort-dropdown/sort-dropdown.component';
import { ProductGridComponent } from './components/product-grid/product-grid.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { SkeletonCardComponent } from '../../shared/components/skeleton-card/skeleton-card.component';
import { RevealOnScrollDirective } from '../../shared/directives/reveal-on-scroll.directive';

type LoadState = 'loading' | 'success' | 'empty' | 'error';

const FETCH_TIMEOUT_MS = 8000;
const DEFAULT_LIMIT = 12;
const DESKTOP_BREAKPOINT = 1024;

@Component({
  selector: 'app-shop-page',
  standalone: true,
  imports: [
    CommonModule,
    TranslatePipe,
    FilterSidebarComponent,
    SortDropdownComponent,
    ProductGridComponent,
    PaginationComponent,
    EmptyStateComponent,
    SkeletonCardComponent,
    RevealOnScrollDirective,
  ],
  templateUrl: './shop.page.html',
  styleUrl: './shop.page.scss',
})
export class ShopPage implements OnInit {
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  protected readonly state = signal<LoadState>('loading');
  protected readonly products = signal<Product[]>([]);
  protected readonly categories = signal<Category[]>([]);

  // Pagination meta
  protected readonly currentPage = signal(1);
  protected readonly pageSize = signal(DEFAULT_LIMIT);
  protected readonly total = signal(0);
  protected readonly totalPages = signal(1);

  // Active filters
  protected readonly filters = signal<ShopFilters>({});
  protected readonly sort = signal<SortOption>('newest');

  // Mobile filters drawer
  protected readonly filtersOpen = signal(false);

  // Skeleton placeholders
  protected readonly skeletons = Array.from({ length: DEFAULT_LIMIT }, (_, i) => i);

  protected readonly hasFilters = computed(() => {
    const f = this.filters();
    return !!(
      f.search ||
      f.category ||
      f.minPrice != null ||
      f.maxPrice != null ||
      f.rating != null ||
      f.inStock ||
      f.onSale ||
      f.recipient ||
      f.occasion ||
      f.trending ||
      f.dailyOffer ||
      f.readyBox
    );
  });

  /** Removable chips for the active gift-discovery filters (mobile-friendly). */
  protected readonly activeChips = computed(() => {
    const f = this.filters();
    const chips: { key: keyof ShopFilters; emoji: string; labelKey: string }[] = [];
    const rec = RECIPIENTS.find((r) => r.slug === f.recipient);
    if (rec) chips.push({ key: 'recipient', emoji: rec.emoji, labelKey: rec.labelKey });
    const occ = OCCASIONS.find((o) => o.slug === f.occasion);
    if (occ) chips.push({ key: 'occasion', emoji: occ.emoji, labelKey: occ.labelKey });
    if (f.trending) chips.push({ key: 'trending', emoji: '🔥', labelKey: 'shop.trending' });
    if (f.dailyOffer) chips.push({ key: 'dailyOffer', emoji: '🏷️', labelKey: 'shop.dailyOffers' });
    if (f.readyBox) chips.push({ key: 'readyBox', emoji: '🎁', labelKey: 'shop.readyBoxes' });
    if (f.onSale) chips.push({ key: 'onSale', emoji: '💸', labelKey: 'shop.onSale' });
    return chips;
  });

  protected readonly activeFiltersCount = computed(() => {
    const f = this.filters();
    let n = 0;
    if (f.search) n++;
    if (f.category) n++;
    if (f.minPrice != null) n++;
    if (f.maxPrice != null) n++;
    if (f.rating != null) n++;
    if (f.inStock) n++;
    if (f.onSale) n++;
    if (f.recipient) n++;
    if (f.occasion) n++;
    if (f.trending) n++;
    if (f.dailyOffer) n++;
    if (f.readyBox) n++;
    return n;
  });

  // --- Drawer safety ---
  // When the viewport grows to desktop size, the mobile drawer must not
  // stay "open" in state — otherwise shrinking back would reveal it
  // unexpectedly. This also handles orientation changes on phones.
  @HostListener('window:resize')
  protected onWindowResize(): void {
    if (
      typeof window !== 'undefined' &&
      window.innerWidth >= DESKTOP_BREAKPOINT &&
      this.filtersOpen()
    ) {
      this.filtersOpen.set(false);
    }
  }

  // Close the drawer with the Escape key for a11y.
  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.filtersOpen()) {
      this.filtersOpen.set(false);
    }
  }

  ngOnInit(): void {
    // Read initial state from query params (deep-link friendly)
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const nextFilters: ShopFilters = {};
      const category = params.get('category');
      const minPrice = params.get('minPrice');
      const maxPrice = params.get('maxPrice');
      const rating = params.get('rating');
      const inStock = params.get('inStock');
      const onSale = params.get('onSale');

      if (category) nextFilters.category = category;
      if (minPrice) nextFilters.minPrice = Number(minPrice);
      if (maxPrice) nextFilters.maxPrice = Number(maxPrice);
      if (rating) nextFilters.rating = Number(rating);
      if (inStock === 'true') nextFilters.inStock = true;
      if (onSale === 'true') nextFilters.onSale = true;

      // Gift discovery params (unknown slugs are ignored)
      const recipient = params.get('recipient');
      const occasion = params.get('occasion');
      if (recipient && RECIPIENT_SLUGS.includes(recipient)) nextFilters.recipient = recipient;
      if (occasion && OCCASION_SLUGS.includes(occasion)) nextFilters.occasion = occasion;
      if (params.get('trending') === 'true') nextFilters.trending = true;
      if (params.get('dailyOffer') === 'true') nextFilters.dailyOffer = true;
      if (params.get('readyBox') === 'true') nextFilters.readyBox = true;

      const sortParam = params.get('sort') as SortOption | null;
      if (sortParam) this.sort.set(sortParam);

      const page = Number(params.get('page') ?? 1) || 1;
      this.currentPage.set(page);
      const q = params.get('q');
      if (q) nextFilters.search = q;
      this.filters.set(nextFilters);
      this.loadProducts();
    });

    this.loadCategories();
  }

  // When filters or sort change → reset page + reload
  // (we call this explicitly in handlers, not via effect, to keep it simple)

  private loadCategories(): void {
    this.categoryService
      .list()
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        if (res?.success) {
          this.categories.set(res.data ?? []);
        }
      });
    // Products are loaded by the queryParamMap subscription (single request).
  }

  protected removeChip(key: keyof ShopFilters): void {
    const next = { ...this.filters() };
    delete next[key];
    this.onFiltersChange(next);
  }

  protected loadProducts(): void {
    this.state.set('loading');

    const f = this.filters();

    const query: ProductQuery = {
      page: this.currentPage(),
      limit: this.pageSize(),
      sort: this.sort(),
      // Map our internal `search` to the backend's `q`
      q: f.search,
      category: f.category,
      minPrice: f.minPrice,
      maxPrice: f.maxPrice,
      rating: f.rating,
      inStock: f.inStock,
      onSale: f.onSale,
      recipient: f.recipient,
      occasion: f.occasion,
      trending: f.trending,
      dailyOffer: f.dailyOffer,
      readyBox: f.readyBox,
    };

    this.productService
      .list(query)
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
        const meta = res.meta;

        this.products.set(items);
        if (meta) {
          this.total.set(meta.total);
          this.totalPages.set(meta.totalPages);
        } else {
          this.total.set(items.length);
          this.totalPages.set(1);
        }

        this.state.set(items.length > 0 ? 'success' : 'empty');
      });
  }

  // --- Handlers ---

  protected onFiltersChange(next: ShopFilters): void {
    this.filters.set(next);
    this.currentPage.set(1);
    this.syncUrl();
    this.loadProducts();
  }

  protected onSortChange(next: SortOption): void {
    this.sort.set(next);
    this.currentPage.set(1);
    this.syncUrl();
    this.loadProducts();
  }

  protected onPageChange(page: number): void {
    this.currentPage.set(page);
    this.syncUrl();
    this.loadProducts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected clearFilters(): void {
    this.filters.set({});
    this.currentPage.set(1);
    this.syncUrl();
    this.loadProducts();
  }

  protected toggleFiltersDrawer(): void {
    this.filtersOpen.update((v) => !v);
  }

  protected closeFiltersDrawer(): void {
    this.filtersOpen.set(false);
  }

  private syncUrl(): void {
    const f = this.filters();
    const queryParams: Record<string, string | number | null> = {
      q: f.search ?? null,
      category: f.category ?? null,
      minPrice: f.minPrice ?? null,
      maxPrice: f.maxPrice ?? null,
      rating: f.rating ?? null,
      inStock: f.inStock ? 'true' : null,
      onSale: f.onSale ? 'true' : null,
      recipient: f.recipient ?? null,
      occasion: f.occasion ?? null,
      trending: f.trending ? 'true' : null,
      dailyOffer: f.dailyOffer ? 'true' : null,
      readyBox: f.readyBox ? 'true' : null,
      sort: this.sort() !== 'newest' ? this.sort() : null,
      page: this.currentPage() > 1 ? this.currentPage() : null,
    };

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
