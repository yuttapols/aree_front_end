import { Injectable, inject, signal } from '@angular/core';
import { MessageService } from 'primeng/api';

import { OrderItemResponse } from '../../core/api/models/order.model';
import { CartService } from '../../core/cart/cart.service';
import { CatalogStore } from '../../core/catalog/catalog.store';
import { I18nService } from '../../core/i18n/i18n.service';
import { MenuItem, MenuOption } from '../../core/models/menu.model';
import { isSelectionValid } from '../../shared/utils/options';

export interface ReorderResult {
  added: number;
  skipped: number;
}

@Injectable({ providedIn: 'root' })
export class CartActions {
  private readonly cart = inject(CartService);
  private readonly i18n = inject(I18nService);
  private readonly messages = inject(MessageService);
  private readonly catalog = inject(CatalogStore);

  readonly optionsItem = signal<MenuItem | null>(null);

  add(item: MenuItem, options: MenuOption[] = [], qty = 1): void {
    if (!item.optionsLoaded) {
      this.catalog.withOptions(item).subscribe((detailed) => this.add(detailed, options, qty));
      return;
    }
    if (!options.length && item.optionGroups.some((group) => group.minSelect > 0)) {
      this.openOptions(item);
      return;
    }
    this.cart.add(item, options, qty);
    this.messages.add({
      severity: 'success',
      summary: this.i18n.t('toast.added'),
      detail: `${this.i18n.text(item.name)} ×${qty}`,
      life: 1600,
    });
  }

  reorder(orderItems: OrderItemResponse[]): ReorderResult {
    let added = 0;
    for (const orderItem of orderItems) {
      const item = this.catalog.byId(String(orderItem.productId));
      if (item && !item.optionsLoaded && orderItem.options.length) {
        continue;
      }
      if (!item || item.soldOut) {
        continue;
      }
      const options = this.resolveOptions(item, orderItem);
      if (!options) {
        continue;
      }
      this.cart.add(item, options, orderItem.quantity);
      added += 1;
    }
    return { added, skipped: orderItems.length - added };
  }

  remove(item: MenuItem): void {
    this.cart.decrementItem(item.id);
  }

  openOptions(item: MenuItem): void {
    this.catalog.withOptions(item).subscribe((detailed) => this.optionsItem.set(detailed));
  }

  closeOptions(): void {
    this.optionsItem.set(null);
  }

  private resolveOptions(item: MenuItem, orderItem: OrderItemResponse): MenuOption[] | null {
    const available = new Map(
      item.optionGroups
        .flatMap((group) => group.options)
        .map((option) => [option.optionItemId, option]),
    );
    const options = orderItem.options.map((option) => available.get(option.optionItemId));
    if (options.some((option) => option !== undefined && !option.available)) {
      return null;
    }
    if (options.some((option) => option === undefined)) {
      return null;
    }
    const resolved = options as MenuOption[];
    return isSelectionValid(item.optionGroups, resolved) ? resolved : null;
  }
}
