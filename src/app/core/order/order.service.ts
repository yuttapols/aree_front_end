import { Injectable, inject, signal } from '@angular/core';

import { CartService } from '../cart/cart.service';
import { MemberService } from '../member/member.service';
import { CartLine } from '../models/menu.model';

export interface PlacedOrder {
  orderNo: string;
  recipientName: string;
  queue: number;
  total: number;
  pointsEarned: number;
  lines: CartLine[];
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly cart = inject(CartService);
  private readonly member = inject(MemberService);

  readonly lastOrder = signal<PlacedOrder | null>(null);

  placeOrder(recipientName: string): PlacedOrder {
    const orderNo = `RT-${1000 + Math.floor(Math.random() * 9000)}`;
    const total = this.cart.subtotal();
    const pointsEarned = this.member.recordOrder({
      orderNo,
      itemCount: this.cart.count(),
      total,
    });
    const order: PlacedOrder = {
      orderNo,
      recipientName,
      queue: 1 + Math.floor(Math.random() * 99),
      total,
      pointsEarned,
      lines: this.cart.lines(),
    };
    this.lastOrder.set(order);
    this.cart.clear();
    return order;
  }
}
