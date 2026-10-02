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

import { OrderResponse } from '../../core/api/models/order.model';
import { OrderApi } from '../../core/api/services/order.api';
import { CatalogStore } from '../../core/catalog/catalog.store';
import { I18nService } from '../../core/i18n/i18n.service';
import { Crumb } from '../../shared/components/breadcrumbs/breadcrumbs';
import { LoadingSkeleton } from '../../shared/components/loading-skeleton/loading-skeleton';
import { OrderSummary } from '../../shared/components/order-summary/order-summary';
import { OrderTimeline } from '../../shared/components/order-timeline/order-timeline';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { Panel } from '../../shared/components/panel/panel';
import { StatusTag } from '../../shared/components/status-tag/status-tag';
import { ThaiDatePipe } from '../../shared/pipes/thai-date.pipe';
import { orderSummaryLines } from '../../shared/utils/order-lines';
import { CartActions } from '../cart/cart-actions.service';

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
    StatusTag,
    ThaiDatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header [title]="i18n.t('profile.orders.detail')" [crumbs]="crumbs()" />

    <div class="px-4 py-6 md:px-8">
      @if (order(); as current) {
        <div class="grid items-start gap-5 lg:grid-cols-[1fr_20rem]">
          <app-panel
            [heading]="'#' + current.orderNo"
            [subtitle]="current.createdAt | thaiDate: i18n.lang() : 'datetime'"
          >
            <div panelActions class="flex items-center gap-2">
              <app-status-tag kind="channel" [value]="current.channel" />
              <app-status-tag kind="order" [value]="current.status" />
            </div>
            <app-order-summary
              [lines]="lines()"
              [subtotal]="current.subtotal"
              [total]="current.totalAmount"
              [promotions]="current.appliedPromotions"
              [pointDiscount]="current.pointDiscount"
              [pointsRedeemed]="current.pointsRedeemed"
              [pointsToEarn]="current.pointsEarned || current.pointsToEarn"
              [pointsLabel]="
                current.pointsEarned ? i18n.t('track.pointsEarned') : i18n.t('track.pointsOnPickup')
              "
            />
            <p-button
              styleClass="mt-5 mr-2"
              [label]="i18n.t('profile.orders.reorder')"
              icon="pi pi-replay"
              [rounded]="true"
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
                class="mt-5"
                [routerLink]="['/track', current.trackingToken]"
                [label]="i18n.t('profile.orders.track')"
                icon="pi pi-map"
                [rounded]="true"
                [outlined]="true"
              ></a>
            }
          </app-panel>
          <app-panel [heading]="i18n.t('track.timeline')">
            <p class="text-ink-muted mb-3 text-xs">
              {{ i18n.t('success.queue') }} {{ current.queueNo }}
            </p>
            <app-order-timeline [order]="current" />
          </app-panel>
        </div>
      } @else {
        <app-loading-skeleton variant="list" [count]="4" />
      }
    </div>
  `,
})
export class ProfileOrderDetail {
  protected readonly i18n = inject(I18nService);
  protected readonly catalog = inject(CatalogStore);
  private readonly api = inject(OrderApi);
  private readonly cartActions = inject(CartActions);
  private readonly messages = inject(MessageService);
  private readonly router = inject(Router);

  readonly orderNo = input.required<string>();

  protected readonly order = signal<OrderResponse | null>(null);
  protected readonly lines = computed(() =>
    orderSummaryLines(this.order()?.items ?? [], this.i18n),
  );
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
