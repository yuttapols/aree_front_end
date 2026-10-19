import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';

import { OrderResponse, OrderStatus } from '../../core/api/models/order.model';
import { OrderApi } from '../../core/api/services/order.api';
import { CatalogStore } from '../../core/catalog/catalog.store';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/translations';
import { Crumb } from '../../shared/components/breadcrumbs/breadcrumbs';
import { LoadingSkeleton } from '../../shared/components/loading-skeleton/loading-skeleton';
import { OrderSummary } from '../../shared/components/order-summary/order-summary';
import { OrderTimeline } from '../../shared/components/order-timeline/order-timeline';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { Panel } from '../../shared/components/panel/panel';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { ThaiDatePipe } from '../../shared/pipes/thai-date.pipe';
import { OrderLinesService } from '../../shared/services/order-lines.service';
import { CartActions } from '../cart/cart-actions.service';

const STATUS_ICONS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'pi pi-hourglass',
  CONFIRMED: 'pi pi-hourglass',
  PREPARING: 'pi pi-spin pi-cog',
  READY: 'pi pi-bell',
  COMPLETED: 'pi pi-check-circle',
  CANCELLED: 'pi pi-times-circle',
};

@Component({
  selector: 'app-profile-order-detail',
  imports: [
    RouterLink,
    ButtonModule,
    LoadingSkeleton,
    OrderSummary,
    OrderTimeline,
    PageHeader,
    Panel,
    MoneyPipe,
    ThaiDatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header [title]="i18n.t('profile.orders.detail')" [crumbs]="crumbs()" />

    <div class="px-4 py-6 md:px-8">
      @if (order(); as current) {
        <div class="flex flex-col gap-5">
          <section
            class="bg-royal shadow-lift animate-rise relative overflow-hidden rounded-[2rem] p-6 text-white md:p-8"
          >
            <i
              class="pi pi-receipt pointer-events-none absolute -top-8 -right-4 text-[10rem] text-white/10"
            ></i>
            <div class="relative flex flex-wrap items-center justify-between gap-6">
              <div class="flex items-center gap-5">
                <span
                  class="grid h-24 w-24 shrink-0 place-items-center rounded-full bg-white/15 ring-4 ring-white/10"
                >
                  <span class="text-center leading-none">
                    <span class="block text-xs font-semibold text-white/70">{{
                      i18n.t('bo.orders.queue')
                    }}</span>
                    <span class="font-display text-accent block text-5xl font-extrabold">{{
                      current.queueNo
                    }}</span>
                  </span>
                </span>
                <div class="min-w-0">
                  <h2 class="font-display truncate text-2xl font-bold md:text-3xl">
                    #{{ current.orderNo }}
                  </h2>
                  <p class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/75">
                    <span class="inline-flex items-center gap-1.5"
                      ><i class="pi pi-calendar text-xs"></i
                      >{{ current.createdAt | thaiDate: i18n.lang() : 'datetime' }}</span
                    >
                    <span
                      class="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5"
                      ><i
                        class="text-xs"
                        [class]="current.channel === 'ONLINE' ? 'pi pi-globe' : 'pi pi-shop'"
                      ></i
                      >{{ i18n.t(channelKey()) }}</span
                    >
                  </p>
                  <span
                    class="mt-3 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-bold"
                    [class]="statusPill()"
                  >
                    <i [class]="statusIcon()"></i>{{ i18n.t(statusKey()) }}
                  </span>
                </div>
              </div>
              <div class="text-right">
                <p class="text-sm text-white/70">{{ i18n.t('cart.total') }}</p>
                <p
                  class="font-display text-4xl font-extrabold tabular-nums md:text-5xl"
                  [class.line-through]="current.status === 'CANCELLED'"
                >
                  {{ current.totalAmount | money }}
                </p>
                @if (current.pointsEarned) {
                  <span
                    class="bg-accent mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold text-white"
                  >
                    <i class="pi pi-star-fill text-xs"></i
                    >{{ i18n.t('profile.orders.earned', { n: current.pointsEarned }) }}
                  </span>
                }
              </div>
            </div>
          </section>

          <div class="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div class="flex flex-col gap-5">
              <app-panel
                icon="pi pi-shopping-bag"
                [heading]="i18n.t('profile.orders.items', { n: itemCount() })"
              >
                <app-order-summary
                  [lines]="lines()"
                  [subtotal]="current.subtotal"
                  [total]="current.totalAmount"
                  [promotions]="current.appliedPromotions"
                  [pointDiscount]="current.pointDiscount"
                  [pointsRedeemed]="current.pointsRedeemed"
                  [pointsToEarn]="current.pointsEarned ? 0 : current.pointsToEarn"
                  [pointsLabel]="i18n.t('track.pointsOnPickup')"
                />
                @if (current.note) {
                  <p class="bg-canvas text-ink-muted mt-4 rounded-xl px-3 py-2 text-sm">
                    <i class="pi pi-comment mr-1"></i>{{ current.note }}
                  </p>
                }
              </app-panel>

              @if (paidPayments().length) {
                <app-panel icon="pi pi-wallet" [heading]="i18n.t('profile.orders.payment')">
                  <ul class="flex flex-col gap-2">
                    @for (payment of paidPayments(); track payment.id) {
                      <li class="bg-canvas flex items-center gap-3 rounded-2xl px-4 py-3">
                        <span
                          class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
                          ><i class="pi pi-check"></i
                        ></span>
                        <div class="min-w-0 flex-1">
                          <p class="text-ink font-semibold">
                            {{ i18n.pick(payment.methodName, payment.methodNameEn) }}
                          </p>
                          @if (payment.paidAt) {
                            <p class="text-ink-muted text-xs">
                              {{ payment.paidAt | thaiDate: i18n.lang() : 'datetime' }}
                            </p>
                          }
                        </div>
                        <span class="font-display text-ink text-lg font-bold tabular-nums">{{
                          payment.amount | money
                        }}</span>
                      </li>
                    }
                  </ul>
                </app-panel>
              }

              <div class="flex flex-wrap gap-3">
                <p-button
                  [label]="i18n.t('profile.orders.reorder')"
                  icon="pi pi-replay"
                  [rounded]="true"
                  size="large"
                  [disabled]="!catalog.loaded()"
                  (onClick)="reorder(current)"
                />
                @if (
                  current.channel === 'ONLINE' &&
                  current.status !== 'COMPLETED' &&
                  current.status !== 'CANCELLED'
                ) {
                  <a
                    pButton
                    [routerLink]="['/track', current.trackingToken]"
                    [label]="i18n.t('profile.orders.track')"
                    icon="pi pi-map"
                    [rounded]="true"
                    [outlined]="true"
                    size="large"
                  ></a>
                }
              </div>
            </div>

            <app-panel
              class="lg:sticky lg:top-24"
              icon="pi pi-history"
              [heading]="i18n.t('track.timeline')"
            >
              <app-order-timeline [order]="current" />
            </app-panel>
          </div>
        </div>
      } @else {
        <app-loading-skeleton variant="list" [count]="4" />
      }
    </div>
  `,
})
export class ProfileOrderDetail {
  protected readonly i18n = inject(I18nService);
  private readonly orderLines = inject(OrderLinesService);
  protected readonly catalog = inject(CatalogStore);
  private readonly api = inject(OrderApi);
  private readonly cartActions = inject(CartActions);
  private readonly messages = inject(MessageService);
  private readonly router = inject(Router);

  readonly orderNo = input.required<string>();

  protected readonly order = signal<OrderResponse | null>(null);
  protected readonly lines = computed(() => this.orderLines.summarize(this.order()?.items ?? []));
  protected readonly itemCount = computed(() =>
    (this.order()?.items ?? []).reduce((total, item) => total + item.quantity, 0),
  );
  protected readonly paidPayments = computed(() =>
    (this.order()?.payments ?? []).filter((payment) => payment.status === 'PAID'),
  );
  protected readonly statusKey = computed(
    () => `status.order.${this.order()?.status ?? 'PENDING_PAYMENT'}` as TranslationKey,
  );
  protected readonly channelKey = computed(
    () => `status.channel.${this.order()?.channel ?? 'ONLINE'}` as TranslationKey,
  );
  protected readonly statusIcon = computed(
    () => STATUS_ICONS[this.order()?.status ?? 'PENDING_PAYMENT'],
  );
  protected readonly statusPill = computed(() => {
    const status = this.order()?.status;
    if (status === 'COMPLETED' || status === 'READY') {
      return 'bg-emerald-400/25 text-emerald-100 ring-1 ring-emerald-300/40';
    }
    if (status === 'CANCELLED') {
      return 'bg-red-400/25 text-red-100 ring-1 ring-red-300/40';
    }
    return 'bg-amber-400/25 text-amber-100 ring-1 ring-amber-300/40';
  });
  protected readonly crumbs = computed<Crumb[]>(() => [
    { labelKey: 'profile.nav.overview', link: '/profile' },
    { labelKey: 'profile.nav.orders', link: '/profile/orders' },
    { labelKey: 'profile.orders.detail' },
  ]);

  constructor() {
    this.catalog.load();
    effect(() => {
      this.api.myOrder(this.orderNo()).subscribe((order) => this.order.set(order));
    });
  }

  protected reorder(order: OrderResponse): void {
    const result = this.cartActions.reorder(order.items);
    if (!result.added) {
      this.messages.add({ severity: 'warn', summary: this.i18n.t('profile.orders.reorderNone') });
      return;
    }
    this.messages.add({
      severity: result.skipped ? 'warn' : 'success',
      summary: this.i18n.t('toast.added'),
      detail: result.skipped
        ? this.i18n.t('profile.orders.reorderSkipped', { n: result.skipped })
        : undefined,
    });
    this.router.navigateByUrl('/checkout');
  }
}
