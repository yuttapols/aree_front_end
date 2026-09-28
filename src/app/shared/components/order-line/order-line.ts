import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { I18nService } from '../../../core/i18n/i18n.service';
import { CartLine } from '../../../core/models/menu.model';
import { Price } from '../price/price';

@Component({
  selector: 'app-order-line',
  imports: [Price],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex items-start justify-between gap-3 py-4' },
  template: `
    <div class="min-w-0 flex-1">
      <p class="text-ink font-semibold">
        {{ i18n.text(line().item.name) }}
        <span class="text-ink-muted font-normal">×{{ line().qty }}</span>
      </p>
      <p class="text-ink-muted mt-0.5 text-xs">{{ extras() }}</p>
      <div class="mt-2 empty:hidden"><ng-content /></div>
    </div>
    <app-price [amount]="line().unitPrice * line().qty" size="sm" />
  `,
})
export class OrderLine {
  protected readonly i18n = inject(I18nService);

  readonly line = input.required<CartLine>();

  protected readonly extras = computed(() => {
    const options = this.line().options;
    if (options.length === 0) {
      return this.i18n.t('checkout.noExtras');
    }
    return options
      .map((option) => {
        const name = this.i18n.text(option.name);
        return option.price > 0 ? `+ ${name} (+${option.price} ฿)` : `+ ${name}`;
      })
      .join(', ');
  });
}
