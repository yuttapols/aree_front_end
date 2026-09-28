import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, forkJoin, of } from 'rxjs';

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
        this.categories.set(menu.categories.map(toMenuCategory));
        this.items.set(
          menu.categories.flatMap((category) =>
            category.products.map((product) => toMenuItem(product, category.slug)),
          ),
        );
        this.promotions.set(promotions);
        this.loaded.set(true);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
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
