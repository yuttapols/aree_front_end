import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';

import { CartService } from '../../core/cart/cart.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { LineExtras } from '../../shared/components/line-extras/line-extras';
import { ProductImage } from '../../shared/components/product-image/product-image';
import { QtyStepper } from '../../shared/components/qty-stepper/qty-stepper';
import { cartSummaryLines } from '../../shared/utils/order-lines';
import { formatBaht } from '../../shared/utils/price';

@Component({
  selector: 'app-cart-panel',
  imports: [ButtonModule, LineExtras, ProductImage, QtyStepper],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex h-full flex-col' },
  template: `
    <header class="flex items-center gap-3 pb-4">
      <span
        class="from-brand to-accent grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-linear-to-br text-white shadow-md"
      >
        <i class="pi pi-shopping-bag text-lg"></i>
      </span>
      <div class="min-w-0 flex-1">
        <h3 class="font-display text-ink text-xl leading-tight font-bold">
          {{ i18n.t('cart.title') }}
        </h3>
        <p class="text-ink-muted text-sm">{{ i18n.t('cart.itemCount', { n: cart.count() }) }}</p>
      </div>
      @if (!cart.isEmpty()) {
        <button
          type="button"
          class="text-ink-muted inline-flex items-center gap-1.5 rounded-full px-3 min-h-11 text-xs font-semibold transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
          (click)="clearCart()"
        >
          <i class="pi pi-trash text-xs"></i>{{ i18n.t('cart.clear') }}
        </button>
      }
    </header>

    @if (cart.isEmpty()) {
      <div class="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
        <span
          class="bg-brand-soft text-brand animate-float mb-5 grid h-24 w-24 place-items-center rounded-full"
        >
          <i class="pi pi-shopping-bag text-4xl"></i>
        </span>
        <p class="font-display text-ink text-lg font-bold">{{ i18n.t('cart.empty') }}</p>
        <p class="text-ink-muted mt-1 text-sm">{{ i18n.t('cart.emptyHint') }}</p>
        <p-button
          styleClass="mt-6"
          [label]="i18n.t('member.orderNow')"
          icon="pi pi-arrow-right"
          iconPos="right"
          [rounded]="true"
          (onClick)="browseMenu()"
        />
      </div>
    } @else {
      <ul class="-mx-1 flex flex-1 flex-col gap-3 overflow-y-auto px-1 py-1">
        @for (line of cart.lines(); track line.key) {
          <li
            class="border-line bg-card hover:shadow-soft animate-pop flex gap-3 rounded-2xl border p-3 transition"
          >
            <div class="bg-canvas h-20 w-20 shrink-0 overflow-hidden rounded-xl p-1">
              <app-product-image
                class="h-full"
                [src]="line.item.imageUrl"
                [palette]="line.item.palette"
                [label]="i18n.text(line.item.name)"
                imageClass="h-full w-full rounded-lg object-cover"
              />
            </div>
            <div class="flex min-w-0 flex-1 flex-col">
              <div class="flex items-start justify-between gap-2">
                <p class="text-ink line-clamp-2 leading-tight font-bold">
                  {{ i18n.text(line.item.name) }}
                </p>
                <button
                  type="button"
                  class="text-ink-muted -mt-2 -mr-2 grid h-11 w-11 shrink-0 place-items-center rounded-full transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                  [attr.aria-label]="i18n.t('cart.removeItem', { name: i18n.text(line.item.name) })"
                  (click)="cart.remove(line.key)"
                >
                  <i class="pi pi-times text-xs"></i>
                </button>
              </div>
              @if (summaries()[line.key]; as summary) {
                @if (summary.extras || summary.omitted.length) {
                  <p class="text-ink-muted mt-1 line-clamp-2 text-xs">
                    <app-line-extras [line]="summary" />
                  </p>
                }
              }
              <div class="mt-auto flex items-center justify-between gap-2 pt-2">
                <app-qty-stepper
                  [qty]="line.qty"
                  size="sm"
                  [addLabel]="i18n.t('cart.increaseQty', { name: i18n.text(line.item.name) })"
                  [removeLabel]="i18n.t('cart.decreaseQty', { name: i18n.text(line.item.name) })"
                  (increment)="cart.increment(line.key)"
                  (decrement)="cart.decrement(line.key)"
                />
                <span class="font-display text-ink text-lg font-bold tabular-nums">{{
                  formatBaht(line.unitPrice * line.qty)
                }}</span>
              </div>
            </div>
          </li>
        }
      </ul>

      <footer class="bg-canvas -mx-1 mt-4 rounded-3xl p-4">
        <div class="text-ink-muted flex items-center justify-between text-sm">
          <span>{{ i18n.t('cart.subtotal') }}</span>
          <span class="tabular-nums">{{ formatBaht(cart.subtotal()) }}</span>
        </div>
        <div class="mt-2 flex items-baseline justify-between">
          <span class="text-ink font-bold">{{ i18n.t('cart.total') }}</span>
          <span class="font-display text-brand text-3xl font-extrabold tabular-nums">{{
            formatBaht(cart.subtotal())
          }}</span>
        </div>
        <button
          type="button"
          class="from-brand to-accent shadow-lift mt-4 flex h-14 w-full items-center justify-between rounded-2xl bg-linear-to-r px-5 text-lg font-bold text-white transition hover:brightness-110 active:scale-[0.98]"
          (click)="checkout()"
        >
          <span class="flex items-center gap-2">
            <span
              class="grid h-8 min-w-8 place-items-center rounded-full bg-white/20 px-2 text-sm"
              >{{ cart.count() }}</span
            >
            {{ i18n.t('cart.checkout') }}
          </span>
          <i class="pi pi-arrow-right"></i>
        </button>
      </footer>
    }
  `,
})
export class CartPanel {
  protected readonly i18n = inject(I18nService);
  protected readonly cart = inject(CartService);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);

  protected readonly formatBaht = formatBaht;

  protected readonly summaries = computed(() =>
    Object.fromEntries(
      cartSummaryLines(this.cart.lines(), this.i18n).map((summary) => [summary.key, summary]),
    ),
  );

  protected async clearCart(): Promise<void> {
    const confirmed = await this.confirm.ask({
      message: this.i18n.t('cart.clearConfirm'),
      acceptLabel: this.i18n.t('cart.clear'),
      danger: true,
    });
    if (confirmed) {
      this.cart.clear();
    }
  }

  protected browseMenu(): void {
    this.cart.drawerOpen.set(false);
    this.router.navigate(['/'], { fragment: 'menu' });
  }

  protected checkout(): void {
    this.cart.drawerOpen.set(false);
    this.router.navigateByUrl('/checkout');
  }
}
