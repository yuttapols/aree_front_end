import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { CartService } from '../../../core/cart/cart.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { FavoritesService } from '../../../core/menu/favorites.service';
import { MenuItem } from '../../../core/models/menu.model';
import { Chip, ChipTone } from '../../../shared/components/chip/chip';
import { FoodPlate } from '../../../shared/components/food-plate/food-plate';
import { Price } from '../../../shared/components/price/price';
import { QtyStepper } from '../../../shared/components/qty-stepper/qty-stepper';
import { Rating } from '../../../shared/components/rating/rating';
import { discountPercent } from '../../../shared/utils/price';
import { CartActions } from '../../cart/cart-actions.service';

@Component({
  selector: 'app-menu-card',
  imports: [Chip, FoodPlate, Price, QtyStepper, Rating],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <article
      class="bg-card shadow-soft flex h-full flex-col rounded-3xl p-3 transition duration-200"
      [class.hover:-translate-y-1]="!soldOut()"
      [class.ring-2]="qty() > 0"
      [class.ring-accent]="qty() > 0"
    >
      <div class="flex h-7 items-center justify-between">
        @if (chip(); as chip) {
          <app-chip [tone]="chip.tone">{{ chip.label }}</app-chip>
        } @else {
          <span></span>
        }
        <button
          type="button"
          class="grid h-8 w-8 place-items-center rounded-full transition active:scale-75"
          [class]="favorite() ? 'text-accent' : 'text-ink-muted hover:text-accent'"
          [attr.aria-label]="i18n.t('popular.favorite')"
          [attr.aria-pressed]="favorite()"
          (click)="favorites.toggle(item().id)"
        >
          <i [class]="favorite() ? 'pi pi-heart-fill animate-pop' : 'pi pi-heart'"></i>
        </button>
      </div>

      <button
        type="button"
        class="bg-card-muted group mt-2 aspect-[4/3] rounded-2xl p-4 disabled:cursor-not-allowed md:p-6"
        [class.opacity-50]="soldOut()"
        [class.grayscale]="soldOut()"
        [disabled]="soldOut()"
        [attr.aria-label]="name()"
        (click)="actions.openOptions(item())"
      >
        @if (item().imageUrl) {
          <img
            [src]="item().imageUrl"
            [alt]="name()"
            class="mx-auto h-full w-full rounded-xl object-cover transition duration-300 group-enabled:group-hover:scale-105"
          />
        } @else {
          <app-food-plate
            class="mx-auto h-full transition duration-300 group-enabled:group-hover:scale-105 group-enabled:group-hover:rotate-6"
            [palette]="item().palette"
            [label]="name()"
          />
        }
      </button>

      <h3 class="mt-3 line-clamp-1 font-bold" [class]="soldOut() ? 'text-ink-muted' : 'text-ink'">
        {{ name() }}
      </h3>
      <p class="text-ink-muted mt-0.5 line-clamp-2 min-h-8 text-xs">
        {{ soldOut() ? i18n.t('menu.soldOutToday') : i18n.text(item().description) }}
      </p>
      <app-rating class="mt-2" [value]="item().rating" [count]="item().reviews" />

      <div class="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
        <app-price
          [amount]="item().price"
          [original]="item().originalPrice"
          [class.opacity-50]="soldOut()"
        />
        <app-qty-stepper
          class="ml-auto"
          [qty]="qty()"
          size="sm"
          [disabled]="soldOut()"
          [addLabel]="name()"
          (increment)="actions.add(item())"
          (decrement)="actions.remove(item())"
        />
      </div>
    </article>
  `,
})
export class MenuCard {
  protected readonly i18n = inject(I18nService);
  protected readonly actions = inject(CartActions);
  protected readonly favorites = inject(FavoritesService);
  private readonly cart = inject(CartService);

  readonly item = input.required<MenuItem>();

  protected readonly name = computed(() => this.i18n.text(this.item().name));
  protected readonly soldOut = computed(() => this.item().soldOut ?? false);
  protected readonly qty = computed(() => this.cart.qtyOf(this.item().id));
  protected readonly favorite = computed(() => this.favorites.has(this.item().id));

  protected readonly chip = computed<{ tone: ChipTone; label: string } | null>(() => {
    const item = this.item();
    if (item.soldOut) {
      return { tone: 'dark', label: this.i18n.t('menu.soldOut') };
    }
    const discount = discountPercent(item.price, item.originalPrice);
    if (discount > 0) {
      return { tone: 'brand', label: this.i18n.t('menu.save', { n: discount }) };
    }
    if (item.promotionIds.length) {
      return { tone: 'accent', label: this.i18n.t('menu.promo') };
    }
    if (item.badge) {
      return {
        tone: item.badge === 'bestseller' ? 'brand' : 'accent',
        label: this.i18n.t(`menu.badge.${item.badge}`),
      };
    }
    return null;
  });
}
