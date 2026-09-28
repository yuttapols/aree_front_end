import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';

import { CartService } from '../../core/cart/cart.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { OrderLine } from '../../shared/components/order-line/order-line';
import { QtyStepper } from '../../shared/components/qty-stepper/qty-stepper';
import { SummaryRow } from '../../shared/components/summary-row/summary-row';
import { formatBaht } from '../../shared/utils/price';

@Component({
  selector: 'app-cart-panel',
  imports: [ButtonModule, OrderLine, QtyStepper, SummaryRow],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex h-full flex-col' },
  template: `
    <div class="flex items-center justify-between">
      <h3 class="text-ink text-lg font-bold">{{ i18n.t('cart.title') }}</h3>
      @if (!cart.isEmpty()) {
        <button
          type="button"
          class="text-ink-muted hover:text-accent text-xs transition"
          (click)="cart.clear()"
        >
          {{ i18n.t('cart.clear') }}
        </button>
      }
    </div>

    @if (cart.isEmpty()) {
      <div class="flex flex-1 flex-col items-center justify-center py-10 text-center">
        <span class="bg-brand-soft text-brand mb-3 grid h-16 w-16 place-items-center rounded-full">
          <i class="pi pi-shopping-bag text-2xl"></i>
        </span>
        <p class="text-ink font-medium">{{ i18n.t('cart.empty') }}</p>
        <p class="text-ink-muted mt-1 text-sm">{{ i18n.t('cart.emptyHint') }}</p>
      </div>
    } @else {
      <div class="divide-line mt-2 flex-1 divide-y overflow-y-auto">
        @for (line of cart.lines(); track line.key) {
          <app-order-line [line]="line">
            <app-qty-stepper
              [qty]="line.qty"
              size="sm"
              (increment)="cart.increment(line.key)"
              (decrement)="cart.decrement(line.key)"
            />
          </app-order-line>
        }
      </div>

      <div class="border-line mt-4 flex flex-col gap-2 border-t pt-4">
        <app-summary-row [label]="i18n.t('cart.subtotal')" [value]="formatBaht(cart.subtotal())" />
        <app-summary-row
          [label]="i18n.t('cart.total')"
          [value]="formatBaht(cart.subtotal())"
          [emphasis]="true"
        />
        <p-button
          [label]="i18n.t('cart.checkout')"
          icon="pi pi-arrow-right"
          iconPos="right"
          [rounded]="true"
          [fluid]="true"
          size="large"
          styleClass="mt-2"
          (onClick)="checkout()"
        />
      </div>
    }
  `,
})
export class CartPanel {
  protected readonly i18n = inject(I18nService);
  protected readonly cart = inject(CartService);
  private readonly router = inject(Router);

  protected readonly formatBaht = formatBaht;

  protected checkout(): void {
    this.cart.drawerOpen.set(false);
    this.router.navigateByUrl('/checkout');
  }
}
