import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { I18nService } from '../../../core/i18n/i18n.service';
import { ShopInfoStore } from '../../../core/shop/shop-info.store';

@Component({
  selector: 'app-shop-status',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @if (shop.info(); as info) {
      <div
        class="animate-rise flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border px-4 py-3 text-sm"
        [class]="
          shop.acceptingOrders()
            ? 'border-emerald-500/20 bg-emerald-500/10'
            : 'border-red-500/20 bg-red-500/10'
        "
        role="status"
      >
        <span
          class="flex items-center gap-2 font-bold"
          [class]="
            shop.acceptingOrders()
              ? 'text-emerald-700 dark:text-emerald-300'
              : 'text-red-600 dark:text-red-400'
          "
        >
          <span class="relative flex h-2.5 w-2.5">
            @if (shop.acceptingOrders()) {
              <span
                class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60"
              ></span>
            }
            <span
              class="relative inline-flex h-2.5 w-2.5 rounded-full"
              [class]="shop.acceptingOrders() ? 'bg-emerald-500' : 'bg-red-500'"
            ></span>
          </span>
          {{ statusLabel() }}
        </span>
        <span class="text-ink-muted flex items-center gap-1.5">
          <i class="pi pi-clock text-xs"></i>
          {{ i18n.t('contact.hoursFrom', { open: info.openTime, close: info.closeTime }) }}
        </span>
        @if (!shop.acceptingOrders()) {
          <span class="text-ink-muted w-full text-xs sm:ml-auto sm:w-auto">
            {{ i18n.error('ONLINE_ORDER_CLOSED') }}
          </span>
        }
      </div>
    }
  `,
})
export class ShopStatus {
  protected readonly i18n = inject(I18nService);
  protected readonly shop = inject(ShopInfoStore);

  protected readonly statusLabel = computed(() => {
    const info = this.shop.info();
    if (info && !info.acceptOnlineOrder) {
      return this.i18n.t('shop.onlineOff');
    }
    return this.i18n.t(info?.openNow ? 'shop.acceptingNow' : 'contact.closedNow');
  });

  constructor() {
    this.shop.ensureLoaded();
  }
}
