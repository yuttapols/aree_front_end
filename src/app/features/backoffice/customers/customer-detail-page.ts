import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { finalize } from 'rxjs';

import { PointTransactionResponse } from '../../../core/api/models/loyalty.model';
import { OrderResponse } from '../../../core/api/models/order.model';
import { CustomerResponse } from '../../../core/api/models/user.model';
import { UserApi } from '../../../core/api/services/user.api';
import { AuthStore } from '../../../core/auth/auth.store';
import { I18nService } from '../../../core/i18n/i18n.service';
import { Avatar } from '../../../shared/components/avatar/avatar';
import { Crumb } from '../../../shared/components/breadcrumbs/breadcrumbs';
import {
  DataTable,
  TableColumn,
  TablePage,
} from '../../../shared/components/data-table/data-table';
import { LoadingSkeleton } from '../../../shared/components/loading-skeleton/loading-skeleton';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { Panel } from '../../../shared/components/panel/panel';
import { StatCard } from '../../../shared/components/stat-card/stat-card';
import { StatusTag } from '../../../shared/components/status-tag/status-tag';
import { formatDate, formatMoney, formatNumber, formatPhone } from '../../../shared/utils/format';

const PAGE_SIZE = 8;

@Component({
  selector: 'app-customer-detail-page',
  imports: [
    FormsModule,
    ButtonModule,
    DialogModule,
    InputNumberModule,
    InputTextModule,
    Avatar,
    DataTable,
    LoadingSkeleton,
    PageHeader,
    Panel,
    StatCard,
    StatusTag,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header [title]="i18n.t('bo.customers.detail')" [crumbs]="crumbs" />

    <div class="flex flex-col gap-5 px-4 py-6 md:px-8">
      @if (customer(); as current) {
        <div
          class="bg-card border-line shadow-soft flex flex-wrap items-center gap-4 rounded-3xl border p-5"
        >
          <app-avatar [url]="current.avatarUrl" [name]="current.nickname" size="xlarge" />
          <div class="min-w-0 flex-1">
            <h2 class="font-display text-ink text-2xl font-bold">{{ current.nickname }}</h2>
            <p class="text-ink-muted text-sm">
              {{ current.memberCode }} · {{ phone(current.phone) }}
              @if (current.email) {
                · {{ current.email }}
              }
            </p>
            <p class="text-ink-muted text-xs">
              {{ i18n.t('member.joinedAt') }} {{ date(current.createdAt) }}
            </p>
          </div>
          <app-status-tag kind="userStatus" [value]="current.status" />
          @if (auth.isAdmin()) {
            <p-button
              [label]="i18n.t('bo.customers.adjustPoints')"
              icon="pi pi-sliders-h"
              [rounded]="true"
              [outlined]="true"
              (onClick)="adjustOpen.set(true)"
            />
          }
        </div>

        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <app-stat-card
            icon="pi pi-star-fill"
            tone="accent"
            [label]="i18n.t('points.balance')"
            [value]="format(current.pointsBalance)"
          />
          <app-stat-card
            icon="pi pi-chart-line"
            [label]="i18n.t('points.lifetime')"
            [value]="format(current.lifetimePoints)"
          />
          <app-stat-card
            icon="pi pi-receipt"
            [label]="i18n.t('member.stat.orders')"
            [value]="format(current.orderCount)"
          />
          <app-stat-card
            icon="pi pi-wallet"
            tone="accent"
            [label]="i18n.t('member.stat.spent')"
            [value]="money(current.totalSpent)"
          />
        </div>

        <div class="grid gap-5 xl:grid-cols-2">
          <app-panel [heading]="i18n.t('profile.nav.orders')">
            <app-data-table
              [rows]="orders()"
              [columns]="orderColumns()"
              [total]="orderTotal()"
              [page]="orderPage()"
              [pageSize]="pageSize"
              [clickable]="true"
              [emptyTitle]="i18n.t('member.noOrders')"
              minWidth="30rem"
              (pageChange)="loadOrders($event)"
              (rowClick)="openOrder($event)"
            >
              <ng-template #cell let-row let-column="column">
                <app-status-tag kind="order" [value]="row.status" />
              </ng-template>
            </app-data-table>
          </app-panel>
          <app-panel [heading]="i18n.t('points.history')">
            <app-data-table
              [rows]="points()"
              [columns]="pointColumns()"
              [total]="pointTotal()"
              [page]="pointPage()"
              [pageSize]="pageSize"
              [emptyTitle]="i18n.t('points.empty')"
              minWidth="30rem"
              (pageChange)="loadPoints($event)"
            >
              <ng-template #cell let-row let-column="column">
                @if (column.key === 'type') {
                  <app-status-tag kind="pointType" [value]="row.type" />
                } @else {
                  <span
                    class="font-bold"
                    [class]="
                      row.points > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
                    "
                  >
                    {{ row.points > 0 ? '+' : '' }}{{ row.points }}
                  </span>
                }
              </ng-template>
            </app-data-table>
          </app-panel>
        </div>
      } @else {
        <app-loading-skeleton variant="list" [count]="4" />
      }
    </div>

    <p-dialog
      [visible]="adjustOpen()"
      (visibleChange)="adjustOpen.set($event)"
      [modal]="true"
      [draggable]="false"
      [header]="i18n.t('bo.customers.adjustPoints')"
      [style]="{ width: '26rem' }"
      [breakpoints]="{ '640px': '94vw' }"
    >
      <div class="flex flex-col gap-4">
        <div>
          <label class="text-ink mb-1 block text-sm font-semibold" for="adjust-points"
            >{{ i18n.t('points.points') }} *</label
          >
          <p-inputnumber
            inputId="adjust-points"
            [showButtons]="true"
            [fluid]="true"
            [ngModel]="adjustPoints()"
            (ngModelChange)="adjustPoints.set($event ?? 0)"
          />
          <p class="text-ink-muted mt-1 text-xs">{{ i18n.t('bo.customers.adjustHint') }}</p>
        </div>
        <div>
          <label class="text-ink mb-1 block text-sm font-semibold" for="adjust-remark"
            >{{ i18n.t('bo.customers.remark') }} *</label
          >
          <input
            pInputText
            id="adjust-remark"
            class="w-full rounded-xl"
            [ngModel]="adjustRemark()"
            (ngModelChange)="adjustRemark.set($event)"
          />
        </div>
      </div>
      <ng-template #footer>
        <p-button
          [label]="i18n.t('common.cancel')"
          [text]="true"
          (onClick)="adjustOpen.set(false)"
        />
        <p-button
          [label]="i18n.t('common.save')"
          [rounded]="true"
          [loading]="saving()"
          [disabled]="!adjustPoints() || !adjustRemark().trim()"
          (onClick)="adjust()"
        />
      </ng-template>
    </p-dialog>
  `,
})
export class CustomerDetailPage {
  protected readonly i18n = inject(I18nService);
  protected readonly auth = inject(AuthStore);
  private readonly api = inject(UserApi);
  private readonly router = inject(Router);
  private readonly messages = inject(MessageService);

  readonly id = input.required<string>();

  protected readonly crumbs: Crumb[] = [
    { labelKey: 'bo.title', link: '/backoffice' },
    { labelKey: 'bo.nav.customers', link: '/backoffice/customers' },
    { labelKey: 'bo.customers.detail' },
  ];
  protected readonly pageSize = PAGE_SIZE;
  protected readonly format = formatNumber;
  protected readonly phone = formatPhone;

  protected readonly customer = signal<CustomerResponse | null>(null);
  protected readonly orders = signal<OrderResponse[]>([]);
  protected readonly orderTotal = signal(0);
  protected readonly orderPage = signal(0);
  protected readonly points = signal<PointTransactionResponse[]>([]);
  protected readonly pointTotal = signal(0);
  protected readonly pointPage = signal(0);
  protected readonly adjustOpen = signal(false);
  protected readonly adjustPoints = signal(0);
  protected readonly adjustRemark = signal('');
  protected readonly saving = signal(false);

  protected readonly orderColumns = computed<TableColumn<OrderResponse>[]>(() => [
    { key: 'orderNo', label: this.i18n.t('bo.orders.orderNo') },
    {
      key: 'createdAt',
      label: this.i18n.t('common.date'),
      value: (row) => this.date(row.createdAt),
    },
    {
      key: 'totalAmount',
      label: this.i18n.t('cart.total'),
      align: 'right',
      value: (row) => formatMoney(row.totalAmount),
    },
    { key: 'status', label: this.i18n.t('common.status'), custom: true },
  ]);

  protected readonly pointColumns = computed<TableColumn<PointTransactionResponse>[]>(() => [
    {
      key: 'createdAt',
      label: this.i18n.t('common.date'),
      value: (row) => this.date(row.createdAt),
    },
    { key: 'type', label: this.i18n.t('points.type'), custom: true },
    { key: 'points', label: this.i18n.t('points.points'), align: 'right', custom: true },
    {
      key: 'remark',
      label: this.i18n.t('points.reference'),
      value: (row) => row.orderNo ?? row.remark ?? '-',
    },
  ]);

  constructor() {
    effect(() => {
      const id = Number(this.id());
      this.api.customer(id).subscribe((customer) => this.customer.set(customer));
      this.loadOrders({ page: 0, size: PAGE_SIZE });
      this.loadPoints({ page: 0, size: PAGE_SIZE });
    });
  }

  protected date(value: string): string {
    return formatDate(value, this.i18n.lang());
  }

  protected money(value: number): string {
    return formatMoney(value, false);
  }

  protected loadOrders(event: TablePage): void {
    this.api.customerOrders(Number(this.id()), event.page, event.size).subscribe((response) => {
      this.orders.set(response.items);
      this.orderTotal.set(response.totalItems);
      this.orderPage.set(response.page);
    });
  }

  protected loadPoints(event: TablePage): void {
    this.api.customerPoints(Number(this.id()), event.page, event.size).subscribe((response) => {
      this.points.set(response.items);
      this.pointTotal.set(response.totalItems);
      this.pointPage.set(response.page);
    });
  }

  protected openOrder(order: OrderResponse): void {
    this.router.navigate(['/backoffice/orders', order.id]);
  }

  protected adjust(): void {
    const id = Number(this.id());
    this.saving.set(true);
    this.api
      .adjustPoints(id, { points: this.adjustPoints(), remark: this.adjustRemark().trim() })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe(() => {
        this.adjustOpen.set(false);
        this.adjustPoints.set(0);
        this.adjustRemark.set('');
        this.messages.add({ severity: 'success', summary: this.i18n.t('common.saved') });
        this.api.customer(id).subscribe((customer) => this.customer.set(customer));
        this.loadPoints({ page: 0, size: PAGE_SIZE });
      });
  }
}
