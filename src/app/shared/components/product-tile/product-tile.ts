import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';

import { I18nService } from '../../../core/i18n/i18n.service';
import { MenuItem } from '../../../core/models/menu.model';
import { FoodPlate } from '../food-plate/food-plate';
import { Price } from '../price/price';

@Component({
  selector: 'app-product-tile',
  imports: [FoodPlate, Price],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <button
      type="button"
      class="bg-card border-line group relative flex h-full w-full flex-col rounded-2xl border p-2.5 text-left transition hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:grayscale"
      [disabled]="item().soldOut"
      [attr.aria-label]="i18n.text(item().name)"
      (click)="pick.emit(item())"
    >
      @if (qty() > 0) {
        <span
          class="bg-accent animate-pop absolute top-2 right-2 z-10 grid h-6 min-w-6 place-items-center rounded-full px-1.5 text-xs font-bold text-white"
        >
          {{ qty() }}
        </span>
      }
      <span class="bg-card-muted block aspect-square overflow-hidden rounded-xl p-2">
        @if (item().imageUrl) {
          <img [src]="item().imageUrl" alt="" class="h-full w-full rounded-lg object-cover" />
        } @else {
          <app-food-plate class="h-full w-full" [palette]="item().palette" />
        }
      </span>
      <span class="text-ink mt-2 line-clamp-2 text-xs font-semibold leading-snug">
        {{ i18n.text(item().name) }}
      </span>
      <app-price
        class="mt-auto pt-1"
        size="sm"
        [amount]="item().price"
        [original]="item().originalPrice"
      />
    </button>
  `,
})
export class ProductTile {
  protected readonly i18n = inject(I18nService);

  readonly item = input.required<MenuItem>();
  readonly qty = input(0);

  readonly pick = output<MenuItem>();
}
