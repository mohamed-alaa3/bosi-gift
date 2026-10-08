import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { Router} from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, timeout } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';
import { TranslateService } from '@ngx-translate/core';
import { ProductService } from '../../../../../core/services/product.service';
import { CategoryService } from '../../../../../core/services/category.service';
import { ToastService } from '../../../../../core/services/toast.service';

import { Category, Product, ProductQuery, ObjectId } from '../../../../../core/models';
import { LocalizedPipe } from '../../../../../shared/pipes/localized.pipe';
import { PricePipe } from '../../../../../shared/pipes/price.pipe';
import { SafeImagePipe } from '../../../../../shared/pipes/safe-image.pipe';
import { EmptyStateComponent } from '../../../../../shared/components/empty-state/empty-state.component';
import { LoaderComponent } from '../../../../../shared/components/loader/loader.component';
import { PaginationComponent } from '../../../../../shared/components/pagination/pagination.component';

type LoadState = 'loading' | 'success' | 'empty' | 'error';

const FETCH_TIMEOUT_MS = 8000;
const PAGE_SIZE = 15;

@Component({
  selector: 'app-admin-products-list',
  standalone: true,
  imports: [
    CommonModule,
    TranslatePipe,
    LocalizedPipe,
    PricePipe,
    SafeImagePipe,
    EmptyStateComponent,
    LoaderComponent,
    PaginationComponent,
  ],
  templateUrl: './products-list.component.html',
  styleUrl: './products-list.component.scss',
})
export class AdminProductsListComponent implements OnInit {
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  protected readonly state = signal<LoadState>('loading');
  protected readonly products = signal<Product[]>([]);
  protected readonly categories = signal<Category[]>([]);

  protected readonly searchTerm = signal('');
  protected readonly categoryFilter = signal<ObjectId | ''>('');
  protected readonly stockFilter = signal<'all' | 'in' | 'out'>('all');
  protected readonly page = signal(1);
  protected readonly totalPages = signal(1);
  protected readonly total = signal(0);
  protected readonly deletingId = signal<string | null>(null);

  protected readonly hasFilters = computed(
    () => !!this.searchTerm() || this.categoryFilter() !== '' || this.stockFilter() !== 'all',
  );

  ngOnInit(): void {
    this.loadCategories();
    this.loadProducts();
  }

  private loadCategories(): void {
    this.categoryService
      .list(true)
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        if (res?.success) this.categories.set(res.data ?? []);
      });
  }

  protected loadProducts(): void {
    this.state.set('loading');

    const query: ProductQuery = {
      page: this.page(),
      limit: PAGE_SIZE,
      includeInactive: true,
    };

    const term = this.searchTerm().trim();
    if (term) query.q = term;

    const cat = this.categoryFilter();
    if (cat) query.category = cat;

    const stock = this.stockFilter();
    if (stock === 'in') query.inStock = true;

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

        let items = res.data ?? [];

        // Client-side filter for out-of-stock (backend has no inStock=false)
        if (stock === 'out') {
          items = items.filter((p) => p.stock <= 0);
        }

        this.products.set(items);
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

  protected onSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchTerm.set(target.value);
    this.page.set(1);
    this.loadProducts();
  }

  protected onCategoryChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.categoryFilter.set(target.value);
    this.page.set(1);
    this.loadProducts();
  }

  protected onStockChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.stockFilter.set(target.value as 'all' | 'in' | 'out');
    this.page.set(1);
    this.loadProducts();
  }

  protected clearFilters(): void {
    this.searchTerm.set('');
    this.categoryFilter.set('');
    this.stockFilter.set('all');
    this.page.set(1);
    this.loadProducts();
  }

  protected onPageChange(p: number): void {
    this.page.set(p);
    this.loadProducts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected goToNew(): void {
    this.router.navigate(['/admin/products/new']);
  }

  protected goToEdit(id: string): void {
    this.router.navigate(['/admin/products', id, 'edit']);
  }

  protected remove(product: Product): void {
    if (this.deletingId()) return;
    const ok = window.confirm(`Mark "${product.name.en || product.name.ar}" as inactive?`);
    if (!ok) return;

    this.deletingId.set(product._id);

    this.productService
      .delete(product._id)
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        this.deletingId.set(null);
        if (res?.success) {
          this.toast.success(this.translate.instant('toast.productDeactivated'));
          this.loadProducts();
        }
      });
  }
  protected categoryName(p: Product): string {
    const c = p.category;
    if (c && typeof c === 'object' && 'name' in c) {
      const name = (c as { name: { en: string; ar: string } }).name;
      return name.en || name.ar || '—';
    }
    return '—';
  }
  protected toggleActive(product: Product): void {
    // Uses PATCH with isActive flip
    const newValue = !product.isActive;

    this.productService
      .update(product._id, { isActive: newValue })
      .pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        if (res?.success) {
          this.toast.success(
            this.translate.instant(
              newValue ? 'toast.productActivated' : 'toast.productDeactivated',
            ),
          );
          this.loadProducts();
        }
      });
  }
}
