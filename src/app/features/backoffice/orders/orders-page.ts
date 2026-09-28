import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { finalize } from 'rxjs';

import {
  OrderChannel,
  OrderQuery,
  OrderResponse,
  OrderStatus,
} from '../../../core/api/models/order.model';
import { OrderApi } from '../../../core/api/services/order.api';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslationKey } from '../../../core/i18n/translations';
import { Crumb } from '../../../shared/components/breadcrumbs/breadcrumbs';
import {
  DataTable,
  TableColumn,
  TablePage,
} from '../../../shared/components/data-table/data-table';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { Panel } from '../../../shared/components/panel/panel';
import { SearchBox } from '../../../shared/components/search-box/search-box';
import { StatusTag } from '../../../shared/components/status-tag/status-tag';
import { formatDate, formatMoney, toDateKey } from '../../../shared/utils/format';

const PAGE_SIZE = 10;
const STATUSES: OrderStatus[] = [
  'PENDING_PAYMENT',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'COMPLETED',
  'CANCELLED',
];
const CHANNELS: OrderChannel[] = ['WALK_IN', 'ONLINE'];

@Component({
  selector: 'app-orders-page',
  imports: [
    FormsModule,
    DatePickerModule,
    SelectModule,
    DataTable,
    PageHeader,
    Panel,
    SearchBox,
    StatusTag,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header [title]="i18n.t('bo.nav.orders')" [crumbs]="crumbs" />

    <div class="px-4 py-6 md:px-8">
      <app-panel
        [heading]="i18n.t('bo.nav.orders')"
        [subtitle]="i18n.t('bo.orders.total', { n: total() })"
      >
        <div class="mb-4 grid gap-3 md:grid-cols-4">
          <app-search-box
            [placeholder]="i18n.t('bo.orders.search')"
            [clearLabel]="i18n.t('search.clear')"
            (search)="patch({ keyword: $event })"
          />
          <p-datepicker
            [ngModel]="date()"
            (ngModelChange)="date.set($event); patch({ date: $event ? key($event) : null })"
            dateFormat="dd/mm/yy"
            [showIcon]="true"
            [showClear]="true"
            [fluid]="true"
            [placeholder]="i18n.t('common.date')"
          />
          <p-select
            [options]="statusOptions()"
            optionLabel="label"
            optionValue="value"
            [showClear]="true"
            [fluid]="true"
            [placeholder]="i18n.t('common.status')"
            [ngModel]="query().status"
            (ngModelChange)="patch({ status: $event })"
          />
          <p-select
            [options]="channelOptions()"
            optionLabel="label"
            optionValue="value"
            [showClear]="true"
            [fluid]="true"
            [placeholder]="i18n.t('bo.orders.channel')"
            [ngModel]="query().channel"
            (ngModelChange)="patch({ channel: $event })"
          />
        </div>
        <app-data-table
          [rows]="orders()"
          [columns]="columns()"
          [loading]="loading()"
          [total]="total()"
          [page]="query().page"
          [pageSize]="query().size"
          [clickable]="true"
          [emptyTitle]="i18n.t('bo.orders.empty')"
          (pageChange)="onPage($event)"
          (rowClick)="open($event)"
        >
          <ng-template #cell let-row let-column="column">
            @switch (column.key) {
              @case ('queueNo') {
                <span class="font-display text-accent text-xl font-extrabold">{{
                  row.queueNo
                }}</span>
              }
              @case ('channel') {
                <app-status-tag kind="channel" [value]="row.channel" />
              }
              @case ('status') {
                <app-status-tag kind="order" [value]="row.status" />
              }
            }
          </ng-template>
        </app-data-table>
      </app-panel>
    </div>
  `,
})
export class OrdersPage {
  protected readonly i18n = inject(I18nService);
  private readonly api = inject(OrderApi);
  private readonly router = inject(Router);

  protected readonly crumbs: Crumb[] = [
    { labelKey: 'bo.title', link: '/backoffice' },
    { labelKey: 'bo.nav.orders' },
  ];

  protected readonly query = signal<OrderQuery>({
    page: 0,
    size: PAGE_SIZE,
    status: null,
    channel: null,
    date: null,
    keyword: '',
  });
  protected readonly date = signal<Date | null>(null);
  protected readonly orders = signal<OrderResponse[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly key = toDateKey;

  protected readonly statusOptions = computed(() =>
    STATUSES.map((value) => ({
      value,
      label: this.i18n.t(`status.order.${value}` as TranslationKey),
    })),
  );
  protected readonly channelOptions = computed(() =>
    CHANNELS.map((value) => ({
      value,
      label: this.i18n.t(`status.channel.${value}` as TranslationKey),
    })),
  );

  protected readonly columns = computed<TableColumn<OrderResponse>[]>(() => [
    { key: 'queueNo', label: this.i18n.t('bo.orders.queue'), width: '5rem', custom: true },
    { key: 'orderNo', label: this.i18n.t('bo.orders.orderNo') },
    {
      key: 'createdAt',
      label: this.i18n.t('common.time'),
      value: (row) => formatDate(row.createdAt, this.i18n.lang(), 'datetime'),
    },
    {
      key: 'customerName',
      label: this.i18n.t('bo.orders.customer'),
      value: (row) => row.customerName ?? this.i18n.t('bo.walkInGuest'),
    },
    { key: 'channel', label: this.i18n.t('bo.orders.channel'), custom: true },
    {
      key: 'totalAmount',
      label: this.i18n.t('cart.total'),
      align: 'right',
      value: (row) => formatMoney(row.totalAmount),
    },
    { key: 'status', label: this.i18n.t('common.status'), custom: true },
  ]);

  constructor() {
    this.load();
  }

  protected patch(patch: Partial<OrderQuery>): void {
    this.query.update((query) => ({ ...query, ...patch, page: 0 }));
    this.load();
  }

  protected onPage(event: TablePage): void {
    this.query.update((query) => ({ ...query, page: event.page, size: event.size }));
    this.load();
  }

  protected open(order: OrderResponse): void {
    this.router.navigate(['/backoffice/orders', order.id]);
  }

  private load(): void {
    this.loading.set(true);
    this.api
      .orders(this.query())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe((response) => {
        this.orders.set(response.items);
        this.total.set(response.totalItems);
      });
  }
}
