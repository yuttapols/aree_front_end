import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { finalize } from 'rxjs';

import { OrderListItem } from '../../core/api/models/order.model';
import { OrderApi } from '../../core/api/services/order.api';
import { I18nService } from '../../core/i18n/i18n.service';
import { Crumb } from '../../shared/components/breadcrumbs/breadcrumbs';
import { OrderHistoryRow } from '../../shared/components/order-history-row/order-history-row';
import { CtaLink } from '../../shared/components/cta-link/cta-link';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { LoadingSkeleton } from '../../shared/components/loading-skeleton/loading-skeleton';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { Panel } from '../../shared/components/panel/panel';
import { formatDate, toDateKey } from '../../shared/utils/format';

const PAGE_SIZE = 8;

@Component({
  selector: 'app-profile-orders',
  imports: [
    OrderHistoryRow,
    PaginatorModule,
    CtaLink,
    EmptyState,
    LoadingSkeleton,
    PageHeader,
    Panel,
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
          <div class="flex flex-col gap-6">
            @for (group of groups(); track group.key) {
              <section>
                <h3 class="mb-3 flex items-center gap-3">
                  <span
                    class="bg-brand-soft text-brand inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-bold"
                  >
                    <i class="pi pi-calendar text-xs"></i>{{ group.label }}
                  </span>
                  <span class="text-ink-muted text-xs">{{
                    i18n.t('profile.orders.total', { n: group.orders.length })
                  }}</span>
                  <span class="bg-line h-px flex-1"></span>
                </h3>
                <ul class="grid gap-3 xl:grid-cols-2">
                  @for (order of group.orders; track order.orderNo) {
                    <li><app-order-history-row [order]="order" [showDate]="false" /></li>
                  }
                </ul>
              </section>
            }
          </div>
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
  protected readonly orders = signal<OrderListItem[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(0);
  protected readonly loading = signal(false);

  protected readonly groups = computed(() => {
    const todayKey = toDateKey(new Date());
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = toDateKey(yesterday);
    const groups: { key: string; label: string; orders: OrderListItem[] }[] = [];
    for (const order of this.orders()) {
      const key = toDateKey(new Date(order.createdAt));
      let group = groups.find((candidate) => candidate.key === key);
      if (!group) {
        const label =
          key === todayKey
            ? this.i18n.t('profile.orders.today')
            : key === yesterdayKey
              ? this.i18n.t('profile.orders.yesterday')
              : formatDate(order.createdAt, this.i18n.lang(), 'long');
        group = { key, label, orders: [] };
        groups.push(group);
      }
      group.orders.push(order);
    }
    return groups;
  });

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
