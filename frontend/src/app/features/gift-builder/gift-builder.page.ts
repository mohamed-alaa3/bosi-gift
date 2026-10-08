import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, of, timeout } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';

import { GiftBuilderService } from './gift-builder.service';
import { GiftBuilderStore } from './gift-builder.store';
import { BuilderStep, GiftBox, Ribbon, WrapStyle } from './gift-builder.types';

import { ProductService } from '../../core/services/product.service';
import { Product } from '../../core/models';

import { BoxPickerComponent } from './components/box-picker/box-picker.component';
import { ItemPickerComponent } from './components/item-picker/item-picker.component';
import { WrapPickerComponent } from './components/wrap-picker/wrap-picker.component';
import { ReviewPanelComponent } from './components/review-panel/review-panel.component';
import { BoxPreviewComponent } from './components/box-preview/box-preview.component';
import { RevealOnScrollDirective } from '../../shared/directives/reveal-on-scroll.directive';

const FETCH_TIMEOUT_MS = 10000;

type LoadState = 'loading' | 'ready' | 'error';

interface StepDef {
  key: BuilderStep;
  num: number;
  labelKey: string;
  icon: string;
}

@Component({
  selector: 'app-gift-builder-page',
  standalone: true,
  imports: [
    CommonModule,
    TranslatePipe,
    BoxPickerComponent,
    ItemPickerComponent,
    WrapPickerComponent,
    ReviewPanelComponent,
    BoxPreviewComponent,
    RevealOnScrollDirective,
  ],
  templateUrl: './gift-builder.page.html',
  styleUrl: './gift-builder.page.scss',
})
export class GiftBuilderPage implements OnInit {
  private giftService = inject(GiftBuilderService);
  private productService = inject(ProductService);
  private store = inject(GiftBuilderStore);
  private destroyRef = inject(DestroyRef);

  protected readonly loadState = signal<LoadState>('loading');
  protected readonly step = signal<BuilderStep>('box');

  // Data
  protected readonly boxes = signal<GiftBox[]>([]);
  protected readonly wrapStyles = signal<WrapStyle[]>([]);
  protected readonly ribbons = signal<Ribbon[]>([]);
  protected readonly products = signal<Product[]>([]);

  // Store refs (for template)
  protected readonly selection = this.store.selection;
  protected readonly box = this.store.box;
  protected readonly items = this.store.items;
  protected readonly wrapStyle = this.store.wrapStyle;
  protected readonly ribbon = this.store.ribbon;
  protected readonly itemCount = this.store.itemCount;
  protected readonly capacity = this.store.capacity;
  protected readonly remaining = this.store.remaining;
  protected readonly isFull = this.store.isFull;
  protected readonly subtotal = this.store.subtotal;

  protected readonly steps: StepDef[] = [
    {
      key: 'box',
      num: 1,
      labelKey: 'giftBuilder.step1',
      icon: 'M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z M3.3 7l8.7 5 8.7-5M12 22V12',
    },
    {
      key: 'items',
      num: 2,
      labelKey: 'giftBuilder.step2',
      icon: 'M12 2 3 7l9 5 9-5-9-5zM3 12l9 5 9-5M3 17l9 5 9-5',
    },
    {
      key: 'wrap',
      num: 3,
      labelKey: 'giftBuilder.step3',
      icon: 'M3 8h18v4H3zM3 12v7a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-7M12 8v12M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5',
    },
    {
      key: 'review',
      num: 4,
      labelKey: 'giftBuilder.step4',
      icon: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
    },
  ];

  protected readonly currentStepNum = computed(() => {
    return this.steps.find((s) => s.key === this.step())?.num ?? 1;
  });

  protected readonly canProceed = computed(() => {
    const s = this.step();
    if (s === 'box') return !!this.box();
    if (s === 'items') return this.itemCount() > 0;
    if (s === 'wrap') return !!this.wrapStyle(); // ribbon is optional
    return true;
  });

  ngOnInit(): void {
    this.loadAll();
  }

  private loadAll(): void {
    this.loadState.set('loading');

    forkJoin({
      boxes: this.giftService.listBoxes().pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
      ),
      wraps: this.giftService.listWrapStyles().pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
      ),
      ribbons: this.giftService.listRibbons().pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
      ),
      products: this.productService.list({ limit: 60 }).pipe(
        timeout(FETCH_TIMEOUT_MS),
        catchError(() => of(null)),
      ),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        this.boxes.set(res.boxes?.success ? res.boxes.data : []);
        this.wrapStyles.set(res.wraps?.success ? res.wraps.data : []);
        this.ribbons.set(res.ribbons?.success ? res.ribbons.data : []);
        this.products.set(res.products?.success ? res.products.data : []);
        this.loadState.set('ready');
      });
  }

  // ---------- Step navigation ----------

  protected goToStep(key: BuilderStep): void {
    // Allow going back freely
    const targetNum = this.steps.find((s) => s.key === key)?.num ?? 1;
    if (targetNum < this.currentStepNum()) {
      this.step.set(key);
      return;
    }

    // Going forward — validate current steps
    if (targetNum >= 2 && !this.box()) return;
    if (targetNum >= 3 && this.itemCount() === 0) return;
    if (targetNum >= 4 && !this.wrapStyle()) return;

    this.step.set(key);
  }

  protected next(): void {
    if (!this.canProceed()) return;
    const current = this.currentStepNum();
    const nextStep = this.steps.find((s) => s.num === current + 1);
    if (nextStep) this.step.set(nextStep.key);
  }

  protected back(): void {
    const current = this.currentStepNum();
    const prevStep = this.steps.find((s) => s.num === current - 1);
    if (prevStep) this.step.set(prevStep.key);
  }

  // ---------- Handlers ----------

  protected onSelectBox(box: GiftBox): void {
    this.store.setBox(box);
    // Auto-advance after a short delay for the animation
    setTimeout(() => this.next(), 400);
  }

  protected onAddItem(product: Product): void {
    this.store.addItem(product);
  }

  protected onRemoveItem(productId: string): void {
    this.store.removeItem(productId);
  }

  protected onSelectWrap(style: WrapStyle): void {
    this.store.setWrapStyle(style);
  }

  protected onSelectRibbon(ribbon: Ribbon): void {
    this.store.setRibbon(ribbon);
  }

  protected onNoteChange(note: string): void {
    this.store.setNote(note);
  }

  protected onReset(): void {
    if (!confirm('Clear the gift box and start over?')) return;
    this.store.reset();
    this.step.set('box');
  }
}
