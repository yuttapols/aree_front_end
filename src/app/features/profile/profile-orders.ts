import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { finalize } from 'rxjs';

import { OrderResponse } from '../../core/api/models/order.model';
import { OrderApi } from '../../core/api/services/order.api';
import { I18nService } from '../../core/i18n/i18n.service';
import { Crumb } from '../../shared/components/breadcrumbs/breadcrumbs';
import { CtaLink } from '../../shared/components/cta-link/cta-link';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { LoadingSkeleton } from '../../shared/components/loading-skeleton/loading-skeleton';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { Panel } from '../../shared/components/panel/panel';
import { StatusTag } from '../../shared/components/status-tag/status-tag';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { ThaiDatePipe } from '../../shared/pipes/thai-date.pipe';

const PAGE_SIZE = 8;

@Component({
  selector: 'app-profile-orders',
  imports: [
    RouterLink,
    PaginatorModule,
    CtaLink,
    EmptyState,
    LoadingSkeleton,
    PageHeader,
    Panel,
    StatusTag,
    MoneyPipe,
    ThaiDatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header [title]="i18n.t('profile.nav.orders')" [crumbs]="crumbs" />

    <div class="px-4 py-6 md:px-8">
      <app-panel
        [heading]="i18n.t('profile.nav.orders')"
        [subtitle]="i18n.t('profile.orders.total', { n: total() })"
      >
        @if (loading() && !orders().length) {
          <app-loading-skeleton variant="list" [count]="5" />
        } @else if (orders().length) {
          <ul class="divide-line divide-y">
            @for (order of orders(); track order.orderNo) {
              <li>
                <a
                  [routerLink]="['/profile/orders', order.orderNo]"
                  class="hover:bg-canvas -mx-2 flex items-center gap-4 rounded-2xl px-2 py-3.5 transition"
                >
                  <span
                    class="bg-brand-soft text-brand grid h-11 w-11 shrink-0 place-items-center rounded-2xl"
                  >
                    <i [class]="order.channel === 'ONLINE' ? 'pi pi-globe' : 'pi pi-shop'"></i>
                  </span>
                  <div class="min-w-0 flex-1">
                    <p class="text-ink truncate text-sm font-semibold">#{{ order.orderNo }}</p>
                    <p class="text-ink-muted truncate text-xs">
                      {{ order.createdAt | thaiDate: i18n.lang() : 'datetime' }} ·
                      {{ i18n.t('member.itemCount', { n: order.items.length }) }}
                    </p>
                  </div>
                  <div class="flex shrink-0 flex-col items-end gap-1">
                    <span class="text-ink text-sm font-bold tabular-nums">{{
                      order.totalAmount | money
                    }}</span>
                    <app-status-tag kind="order" [value]="order.status" />
                  </div>
                  <i class="pi pi-angle-right text-ink-muted"></i>
                </a>
              </li>
            }
          </ul>
          @if (total() > pageSize) {
            <p-paginator
              styleClass="mt-3 !bg-transparent"
              [rows]="pageSize"
              [totalRecords]="total()"
              [first]="page() * pageSize"
              (onPageChange)="onPage($event)"
            />
          }
        } @else {
          <app-empty-state icon="pi pi-inbox" [title]="i18n.t('member.noOrders')">
            <app-cta-link fragment="menu" [label]="i18n.t('member.orderNow')" />
          </app-empty-state>
        }
      </app-panel>
    </div>
  `,
})
export class ProfileOrders {
  protected readonly i18n = inject(I18nService);
  private readonly api = inject(OrderApi);

  protected readonly crumbs: Crumb[] = [
    { labelKey: 'profile.nav.overview', link: '/profile' },
    { labelKey: 'profile.nav.orders' },
  ];
  protected readonly pageSize = PAGE_SIZE;
  protected readonly orders = signal<OrderResponse[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(0);
  protected readonly loading = signal(false);

  constructor() {
    this.load(0);
  }

  protected onPage(event: PaginatorState): void {
    this.load(Math.floor((event.first ?? 0) / PAGE_SIZE));
  }

  private load(page: number): void {
    this.loading.set(true);
    this.api
      .myOrders(page, PAGE_SIZE)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe((response) => {
        this.orders.set(response.items);
        this.total.set(response.totalItems);
        this.page.set(response.page);
      });
  }
}
