import { Injectable, signal, computed } from '@angular/core';

/**
 * Global UI state: drawers, mobile menu, search visibility.
 * Replaces ad-hoc booleans scattered across components.
 */
@Injectable({ providedIn: 'root' })
export class UiStore {
  private readonly _cartDrawerOpen = signal<boolean>(false);
  private readonly _mobileMenuOpen = signal<boolean>(false);
  private readonly _searchOpen = signal<boolean>(false);
  private readonly _filtersDrawerOpen = signal<boolean>(false);

  readonly cartDrawerOpen = this._cartDrawerOpen.asReadonly();
  readonly mobileMenuOpen = this._mobileMenuOpen.asReadonly();
  readonly searchOpen = this._searchOpen.asReadonly();
  readonly filtersDrawerOpen = this._filtersDrawerOpen.asReadonly();

  readonly anyOverlayOpen = computed(
    () =>
      this._cartDrawerOpen() ||
      this._mobileMenuOpen() ||
      this._searchOpen() ||
      this._filtersDrawerOpen()
  );

  // Cart drawer
  openCartDrawer(): void {
    this._cartDrawerOpen.set(true);
  }
  closeCartDrawer(): void {
    this._cartDrawerOpen.set(false);
  }
  toggleCartDrawer(): void {
    this._cartDrawerOpen.update((v) => !v);
  }

  // Mobile menu
  openMobileMenu(): void {
    this._mobileMenuOpen.set(true);
  }
  closeMobileMenu(): void {
    this._mobileMenuOpen.set(false);
  }
  toggleMobileMenu(): void {
    this._mobileMenuOpen.update((v) => !v);
  }

  // Search
  openSearch(): void {
    this._searchOpen.set(true);
  }
  closeSearch(): void {
    this._searchOpen.set(false);
  }
  toggleSearch(): void {
    this._searchOpen.update((v) => !v);
  }

  // Filters drawer (mobile shop page)
  openFiltersDrawer(): void {
    this._filtersDrawerOpen.set(true);
  }
  closeFiltersDrawer(): void {
    this._filtersDrawerOpen.set(false);
  }
  toggleFiltersDrawer(): void {
    this._filtersDrawerOpen.update((v) => !v);
  }

  /**
   * Close all overlays at once (e.g. on route change).
   */
  closeAll(): void {
    this._cartDrawerOpen.set(false);
    this._mobileMenuOpen.set(false);
    this._searchOpen.set(false);
    this._filtersDrawerOpen.set(false);
  }
}