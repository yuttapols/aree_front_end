import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';

import { CartService } from '../../core/cart/cart.service';
import { CatalogStore } from '../../core/catalog/catalog.store';
import { I18nService } from '../../core/i18n/i18n.service';
import { ALL_CATEGORIES, MenuFilterService } from '../../core/menu/menu-filter.service';
import { Footer } from '../../layout/footer/footer';
import { LoadingSkeleton } from '../../shared/components/loading-skeleton/loading-skeleton';
import { ShopStatus } from '../../shared/components/shop-status/shop-status';
import { formatBaht } from '../../shared/utils/price';
import { CartActions } from '../cart/cart-actions.service';
import { CategoryStrip } from './components/category-strip';
import { HeroCarousel } from './components/hero-carousel';
import {
  ItemOptionsDialog,
  OptionsResult,
} from '../../shared/components/item-options-dialog/item-options-dialog';
import { MenuSection } from './components/menu-section';
import { OfferBanner } from './components/offer-banner';
import { SearchBar } from './components/search-bar';

@Component({
  selector: 'app-landing-page',
  imports: [
    SearchBar,
    HeroCarousel,
    CategoryStrip,
    OfferBanner,
    MenuSection,
    Footer,
    ItemOptionsDialog,
    LoadingSkeleton,
    ShopStatus,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto flex max-w-6xl flex-col gap-6 px-4 pt-5 pb-16 md:gap-10 md:px-6 md:pt-8">
      <app-hero-carousel />
      <app-shop-status />
      <section id="menu" class="flex scroll-mt-24 flex-col gap-5">
        <app-search-bar />
        @if (catalog.loaded()) {
          <app-category-strip />
          <app-menu-section />
        } @else {
          <app-loading-skeleton variant="card" [count]="8" />
        }
      </section>
      <app-offer-banner />
    </div>
    <app-footer />

    <app-item-options-dialog
      [item]="actions.optionsItem()"
      (added)="addWithOptions($event)"
      (closed)="actions.closeOptions()"
    />

    @if (!cart.isEmpty()) {
      <div class="animate-pop fixed inset-x-4 bottom-4 z-30 lg:hidden">
        <button
          type="button"
          class="bg-brand text-on-brand flex w-full items-center justify-between rounded-full px-5 py-3.5 font-semibold shadow-xl transition active:scale-[0.98]"
          (click)="cart.drawerOpen.set(true)"
        >
          <span class="flex items-center gap-2">
            <span
              class="bg-accent grid h-7 min-w-7 place-items-center rounded-full px-1.5 text-sm text-white"
            >
              {{ cart.count() }}
            </span>
            {{ i18n.t('cart.view') }}
          </span>
          <span>{{ formatBaht(cart.subtotal()) }}</span>
        </button>
      </div>
    }
  `,
})
export class LandingPage {
  protected readonly i18n = inject(I18nService);
  protected readonly cart = inject(CartService);
  protected readonly actions = inject(CartActions);
  protected readonly catalog = inject(CatalogStore);
  private readonly filter = inject(MenuFilterService);

  readonly categorySlug = input<string>();

  protected readonly formatBaht = formatBaht;

  constructor() {
    this.catalog.load();
    effect(() => {
      const slug = this.categorySlug();
      if (slug && this.catalog.categories().some((category) => category.id === slug)) {
        this.filter.category.set(slug);
      } else if (!slug) {
        this.filter.category.set(ALL_CATEGORIES);
      }
    });
  }

  protected addWithOptions(result: OptionsResult): void {
    this.actions.add(result.item, result.options, result.qty);
    this.actions.closeOptions();
  }
}
