import { Injectable, computed, signal } from '@angular/core';

import { CustomerResponse } from '../../../core/api/models/user.model';
import { cartLineKey, toCartItemRequests } from '../../../core/cart/cart.service';
import { CartLine, MenuItem, MenuOption } from '../../../core/models/menu.model';
import { sumOptionPrices } from '../../../shared/utils/price';

@Injectable()
export class PosStore {
  readonly lines = signal<CartLine[]>([]);
  readonly member = signal<CustomerResponse | null>(null);
  readonly promoCode = signal<string | null>(null);
  readonly redeemPoints = signal(0);
  readonly note = signal('');

  readonly count = computed(() => this.lines().reduce((total, line) => total + line.qty, 0));
  readonly subtotal = computed(() =>
    this.lines().reduce((total, line) => total + line.unitPrice * line.qty, 0),
  );
  readonly requestItems = computed(() => toCartItemRequests(this.lines()));

  qtyOf(itemId: string): number {
    return this.lines()
      .filter((line) => line.item.id === itemId)
      .reduce((total, line) => total + line.qty, 0);
  }

  add(item: MenuItem, options: MenuOption[] = [], qty = 1): void {
    const key = cartLineKey(item, options);
    this.lines.update((lines) =>
      lines.some((line) => line.key === key)
        ? lines.map((line) => (line.key === key ? { ...line, qty: line.qty + qty } : line))
        : [...lines, { key, item, options, qty, unitPrice: item.price + sumOptionPrices(options) }],
    );
  }

  change(key: string, delta: number): void {
    this.lines.update((lines) =>
      lines
        .map((line) => (line.key === key ? { ...line, qty: line.qty + delta } : line))
        .filter((line) => line.qty > 0),
    );
  }

  setMember(member: CustomerResponse | null): void {
    this.member.set(member);
    this.redeemPoints.set(0);
  }

  reset(): void {
    this.lines.set([]);
    this.member.set(null);
    this.promoCode.set(null);
    this.redeemPoints.set(0);
    this.note.set('');
  }
}
