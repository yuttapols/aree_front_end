import { Injectable, inject } from '@angular/core';

import { OrderItemResponse } from '../../core/api/models/order.model';
import { CatalogStore } from '../../core/catalog/catalog.store';
import { I18nService } from '../../core/i18n/i18n.service';
import { SummaryLine, orderSummaryLines } from '../utils/order-lines';

@Injectable({ providedIn: 'root' })
export class OrderLinesService {
  private readonly catalog = inject(CatalogStore);
  private readonly i18n = inject(I18nService);
  private readonly requested = new Set<string>();

  summarize(items: OrderItemResponse[]): SummaryLine[] {
    const ids = items.map((item) => String(item.productId));
    queueMicrotask(() => this.ensureOptions(ids));
    return orderSummaryLines(items, this.i18n, (productId) => {
      const product = this.catalog.byId(String(productId));
      return product?.optionsLoaded ? product.optionGroups : undefined;
    });
  }

  private ensureOptions(ids: string[]): void {
    this.catalog.load();
    if (!this.catalog.loaded()) {
      return;
    }
    const pending = ids.filter((id) => !this.requested.has(id) && this.catalog.byId(id));
    if (!pending.length) {
      return;
    }
    pending.forEach((id) => this.requested.add(id));
    this.catalog.loadOptionsFor(pending).subscribe();
  }
}
