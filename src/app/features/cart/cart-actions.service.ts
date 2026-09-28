import { Injectable, inject, signal } from '@angular/core';
import { MessageService } from 'primeng/api';

import { CartService } from '../../core/cart/cart.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { MenuItem, MenuOption } from '../../core/models/menu.model';

@Injectable({ providedIn: 'root' })
export class CartActions {
  private readonly cart = inject(CartService);
  private readonly i18n = inject(I18nService);
  private readonly messages = inject(MessageService);

  readonly optionsItem = signal<MenuItem | null>(null);

  add(item: MenuItem, options: MenuOption[] = [], qty = 1): void {
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

  remove(item: MenuItem): void {
    this.cart.decrementItem(item.id);
  }

  openOptions(item: MenuItem): void {
    this.optionsItem.set(item);
  }

  closeOptions(): void {
    this.optionsItem.set(null);
  }
}
