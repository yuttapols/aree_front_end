import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, forkJoin, map, of, shareReplay, tap } from 'rxjs';

import { PromotionResponse } from '../api/models/loyalty.model';
import { CatalogApi } from '../api/services/catalog.api';
import { PromotionApi } from '../api/services/promotion.api';
import { MenuCategory, MenuItem } from '../models/menu.model';
import { toMenuCategory, toMenuItem } from './catalog.mapper';

@Injectable({ providedIn: 'root' })
export class CatalogStore {
  private readonly catalogApi = inject(CatalogApi);
  private readonly promotionApi = inject(PromotionApi);

  readonly categories = signal<MenuCategory[]>([]);
  readonly items = signal<MenuItem[]>([]);
  readonly promotions = signal<PromotionResponse[]>([]);
  readonly loading = signal(false);
  readonly loaded = signal(false);

  readonly itemsById = computed(() => new Map(this.items().map((item) => [item.id, item])));
  readonly itemsByCode = computed(() => new Map(this.items().map((item) => [item.code, item])));

  private readonly optionRequests = new Map<string, Observable<MenuItem>>();

  load(force = false): void {
    if ((this.loaded() && !force) || this.loading()) {
      return;
    }
    this.loading.set(true);
    forkJoin({
      menu: this.catalogApi.menu(),
      promotions: this.promotionApi.publicList().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ menu, promotions }) => {
        const sections = Array.isArray(menu) ? menu : [];
        this.categories.set(sections.map((section) => toMenuCategory(section.category)));
        this.items.set(
          sections.flatMap((section) =>
            section.products.map((product) => toMenuItem(product, section.category.slug)),
          ),
        );
        this.promotions.set(promotions);
        this.loaded.set(true);
        this.loading.set(false);
      },
      error: () => {
        this.loaded.set(true);
        this.loading.set(false);
      },
    });
  }

  withOptions(item: MenuItem): Observable<MenuItem> {
    if (item.optionsLoaded) {
      return of(item);
    }
    let request = this.optionRequests.get(item.id);
    if (!request) {
      request = this.catalogApi.publicProduct(item.productId).pipe(
        map((detail) => toMenuItem(detail, item.categoryId, item.promotionIds)),
        tap((detailed) => this.replaceItem(detailed)),
        finalize(() => this.optionRequests.delete(item.id)),
        shareReplay(1),
      );
      this.optionRequests.set(item.id, request);
    }
    return request;
  }

  loadOptionsFor(itemIds: string[]): Observable<unknown> {
    const pending = itemIds
      .map((id) => this.byId(id))
      .filter((item): item is MenuItem => !!item && !item.optionsLoaded);
    if (!pending.length) {
      return of(null);
    }
    return forkJoin(pending.map((item) => this.withOptions(item).pipe(catchError(() => of(item)))));
  }

  private replaceItem(detailed: MenuItem): void {
    this.items.update((items) => items.map((item) => (item.id === detailed.id ? detailed : item)));
  }

  refresh(): void {
    this.load(true);
  }

  byId(id: string): MenuItem | undefined {
    return this.itemsById().get(id);
  }

  byCode(code: string): MenuItem | undefined {
    return this.itemsByCode().get(code);
  }
}
