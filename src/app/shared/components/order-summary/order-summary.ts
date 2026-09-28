import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';

import { AppliedPromotion } from '../../../core/api/models/order.model';
import { I18nService } from '../../../core/i18n/i18n.service';
import { MoneyPipe } from '../../pipes/money.pipe';
import { SummaryLine } from '../../utils/order-lines';

@Component({
  selector: 'app-order-summary',
  imports: [MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @if (showLines()) {
      <ul class="divide-line divide-y">
        @for (line of lines(); track line.key) {
          <li class="flex items-start justify-between gap-3 py-3">
            <div class="min-w-0 flex-1">
              <p class="text-ink text-sm font-semibold">
                {{ line.name }} <span class="text-ink-muted font-normal">×{{ line.qty }}</span>
              </p>
              <p class="text-ink-muted mt-0.5 text-xs">
                {{ line.extras || i18n.t('checkout.noExtras') }}
              </p>
              @if (line.note) {
                <p class="text-accent mt-0.5 text-xs">{{ line.note }}</p>
              }
              <div class="mt-2 empty:hidden"><ng-content select="[lineActions]" /></div>
            </div>
            <span class="text-ink text-sm font-bold tabular-nums">{{
              line.total | money: false
            }}</span>
          </li>
        }
      </ul>
    }

    <dl
      class="border-line flex flex-col gap-2 text-sm"
      [class]="showLines() ? 'mt-2 border-t pt-4' : ''"
    >
      <div class="text-ink-muted flex justify-between">
        <dt>{{ i18n.t('cart.subtotal') }}</dt>
        <dd class="tabular-nums">{{ subtotal() | money }}</dd>
      </div>
      @for (promotion of discountPromotions(); track promotion.promotionId) {
        <div class="flex justify-between text-emerald-600 dark:text-emerald-400">
          <dt class="min-w-0 truncate">
            <i class="pi pi-tag mr-1 text-xs"></i>{{ i18n.pick(promotion.name, promotion.nameEn) }}
          </dt>
          <dd class="tabular-nums">-{{ promotion.discountAmount | money }}</dd>
        </div>
      }
      @if (pointDiscount() > 0) {
        <div class="flex justify-between text-emerald-600 dark:text-emerald-400">
          <dt>
            <i class="pi pi-star mr-1 text-xs"></i
            >{{ i18n.t('summary.pointDiscount', { n: pointsRedeemed() }) }}
          </dt>
          <dd class="tabular-nums">-{{ pointDiscount() | money }}</dd>
        </div>
      }
      @if (pickupLabel()) {
        <div class="text-ink-muted flex justify-between">
          <dt>{{ i18n.t('checkout.pickup') }}</dt>
          <dd>{{ pickupLabel() }}</dd>
        </div>
      }
      <div class="text-ink mt-2 flex items-baseline justify-between">
        <dt class="text-lg font-bold">{{ i18n.t('cart.total') }}</dt>
        <dd class="font-display text-2xl font-bold tabular-nums">{{ total() | money }}</dd>
      </div>
      @for (promotion of multiplierPromotions(); track promotion.promotionId) {
        <div class="text-accent flex justify-between text-xs font-semibold">
          <dt>
            <i class="pi pi-bolt mr-1 text-xs"></i>{{ i18n.pick(promotion.name, promotion.nameEn) }}
          </dt>
          <dd>x{{ promotion.pointMultiplier }}</dd>
        </div>
      }
      @if (pointsToEarn() > 0) {
        <div
          class="bg-accent-soft text-accent mt-1 flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold"
        >
          <dt>
            <i class="pi pi-star-fill mr-1 text-[0.65rem]"></i
            >{{ pointsLabel() || i18n.t('summary.pointsToEarn') }}
          </dt>
          <dd>+{{ pointsToEarn() }}</dd>
        </div>
      }
    </dl>
  `,
})
export class OrderSummary {
  protected readonly i18n = inject(I18nService);

  readonly lines = input<SummaryLine[]>([]);
  readonly showLines = input(true);
  readonly subtotal = input.required<number>();
  readonly total = input.required<number>();
  readonly promotions = input<AppliedPromotion[]>([]);
  readonly pointDiscount = input(0);
  readonly pointsRedeemed = input(0);
  readonly pointsToEarn = input(0);
  readonly pointsLabel = input<string | null>(null);
  readonly pickupLabel = input<string | null>(null);

  protected discountPromotions(): AppliedPromotion[] {
    return this.promotions().filter((promotion) => promotion.discountAmount > 0);
  }

  protected multiplierPromotions(): AppliedPromotion[] {
    return this.promotions().filter((promotion) => (promotion.pointMultiplier ?? 0) > 1);
  }
}
