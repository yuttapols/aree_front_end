import { Injectable, computed, effect, inject, signal } from '@angular/core';

import { readJson, writeJson } from '../../shared/utils/storage';
import { sumOptionPrices } from '../../shared/utils/price';
import { CartItemRequest } from '../api/models/order.model';
import { CatalogStore } from '../catalog/catalog.store';
import { CartLine, MenuItem, MenuOption } from '../models/menu.model';

const STORAGE_KEY = 'roti.cart';

interface StoredLine {
  itemId: string;
  optionIds: string[];
  qty: number;
}

export function cartLineKey(item: MenuItem, options: MenuOption[]): string {
  return [item.id, ...options.map((option) => option.id).sort()].join('|');
}

export function toCartItemRequests(lines: CartLine[]): CartItemRequest[] {
  return lines.map((line) => ({
    productId: line.item.productId,
    quantity: line.qty,
    optionItemIds: line.options.map((option) => option.optionItemId),
  }));
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly catalog = inject(CatalogStore);
  private readonly hydrated = signal(false);
  private hydrating = false;

  readonly lines = signal<CartLine[]>([]);
  readonly drawerOpen = signal(false);

  readonly count = computed(() => this.lines().reduce((total, line) => total + line.qty, 0));
  readonly subtotal = computed(() =>
    this.lines().reduce((total, line) => total + line.unitPrice * line.qty, 0),
  );
  readonly isEmpty = computed(() => this.lines().length === 0);
  readonly requestItems = computed(() => toCartItemRequests(this.lines()));

  private readonly qtyByItem = computed(() => {
    const map = new Map<string, number>();
    for (const line of this.lines()) {
      map.set(line.item.id, (map.get(line.item.id) ?? 0) + line.qty);
    }
    return map;
  });

  constructor() {
    this.catalog.load();
    effect(() => {
      if (this.catalog.loaded() && !this.hydrating && !this.hydrated()) {
        this.hydrate();
      }
    });
    effect(() => {
      if (this.hydrated()) {
        writeJson(
          STORAGE_KEY,
          this.lines().map<StoredLine>((line) => ({
            itemId: line.item.id,
            optionIds: line.options.map((option) => option.id),
            qty: line.qty,
          })),
        );
      }
    });
  }

  qtyOf(itemId: string): number {
    return this.qtyByItem().get(itemId) ?? 0;
  }

  add(item: MenuItem, options: MenuOption[] = [], qty = 1): void {
    const key = cartLineKey(item, options);
    this.lines.update((lines) => {
      const existing = lines.find((line) => line.key === key);
      if (existing) {
        return lines.map((line) => (line.key === key ? { ...line, qty: line.qty + qty } : line));
      }
      const unitPrice = item.price + sumOptionPrices(options);
      return [...lines, { key, item, options, qty, unitPrice }];
    });
  }

  increment(key: string): void {
    this.changeQty(key, 1);
  }

  decrement(key: string): void {
    this.changeQty(key, -1);
  }

  decrementItem(itemId: string): void {
    const last = this.lines()
      .filter((line) => line.item.id === itemId)
      .at(-1);
    if (last) {
      this.decrement(last.key);
    }
  }

  clear(): void {
    this.lines.set([]);
  }

  private changeQty(key: string, delta: number): void {
    this.lines.update((lines) =>
      lines
        .map((line) => (line.key === key ? { ...line, qty: line.qty + delta } : line))
        .filter((line) => line.qty > 0),
    );
  }

  private hydrate(): void {
    this.hydrating = true;
    const stored = this.readStored();
    const needsOptions = stored
      .filter((entry) => entry.optionIds?.length)
      .map((entry) => String(entry.itemId));
    this.catalog.loadOptionsFor(needsOptions).subscribe({
      complete: () => {
        this.lines.set(this.restore(stored));
        this.hydrated.set(true);
        this.hydrating = false;
      },
    });
  }

  private readStored(): StoredLine[] {
    const stored = readJson(STORAGE_KEY);
    return Array.isArray(stored) ? (stored as StoredLine[]) : [];
  }

  private restore(stored: StoredLine[]): CartLine[] {
    return stored.flatMap((entry) => {
      const item = this.catalog.byId(String(entry.itemId));
      if (!item || item.soldOut || !(entry.qty > 0)) {
        return [];
      }
      if (!item.optionsLoaded && entry.optionIds?.length) {
        return [];
      }
      const allOptions = item.optionGroups.flatMap((group) => group.options);
      const options = (entry.optionIds ?? [])
        .map((id) => allOptions.find((option) => option.id === id))
        .filter((option): option is MenuOption => option !== undefined);
      const valid = item.optionGroups.every((group) => {
        const count = options.filter((option) => option.groupId === group.id).length;
        return count >= group.minSelect && count <= group.maxSelect;
      });
      if (!valid) {
        return [];
      }
      return [
        {
          key: cartLineKey(item, options),
          item,
          options,
          qty: Math.floor(entry.qty),
          unitPrice: item.price + sumOptionPrices(options),
        },
      ];
    });
  }
}
