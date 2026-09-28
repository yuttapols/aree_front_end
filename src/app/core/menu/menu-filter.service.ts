import { Injectable, computed, inject, signal } from '@angular/core';

import { CatalogStore } from '../catalog/catalog.store';
import { MenuItem } from '../models/menu.model';

export type MenuSort = 'recommended' | 'priceAsc' | 'priceDesc' | 'rating';

export const ALL_CATEGORIES = 'all';

const SORTERS: Record<MenuSort, (a: MenuItem, b: MenuItem) => number> = {
  recommended: (a, b) => Number(b.recommended) - Number(a.recommended),
  priceAsc: (a, b) => a.price - b.price,
  priceDesc: (a, b) => b.price - a.price,
  rating: (a, b) => b.rating - a.rating,
};

@Injectable({ providedIn: 'root' })
export class MenuFilterService {
  private readonly catalog = inject(CatalogStore);

  readonly category = signal(ALL_CATEGORIES);
  readonly query = signal('');
  readonly sort = signal<MenuSort>('recommended');
  readonly hideSoldOut = signal(false);

  readonly isFiltered = computed(
    () => this.query().trim() !== '' || this.sort() !== 'recommended' || this.hideSoldOut(),
  );

  readonly items = computed(() => {
    const category = this.category();
    const query = this.query().trim().toLowerCase();
    const hideSoldOut = this.hideSoldOut();
    return this.catalog
      .items()
      .filter((item) => category === ALL_CATEGORIES || item.categoryId === category)
      .filter((item) => !hideSoldOut || !item.soldOut)
      .filter((item) => !query || this.matches(item, query))
      .sort(SORTERS[this.sort()]);
  });

  reset(): void {
    this.query.set('');
    this.sort.set('recommended');
    this.hideSoldOut.set(false);
  }

  private matches(item: MenuItem, query: string): boolean {
    return [item.name.th, item.name.en, item.description.th, item.description.en, item.code].some(
      (text) => text.toLowerCase().includes(query),
    );
  }
}
