import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, finalize, of } from 'rxjs';

import { PointTransactionResponse } from '../../core/api/models/loyalty.model';
import { UserApi } from '../../core/api/services/user.api';
import { I18nService } from '../../core/i18n/i18n.service';
import { Crumb } from '../../shared/components/breadcrumbs/breadcrumbs';
import { DataTable, TableColumn, TablePage } from '../../shared/components/data-table/data-table';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { Panel } from '../../shared/components/panel/panel';
import { StatCard } from '../../shared/components/stat-card/stat-card';
import { StatusTag } from '../../shared/components/status-tag/status-tag';
import { formatDate, formatNumber } from '../../shared/utils/format';

const PAGE_SIZE = 10;

@Component({
  selector: 'app-profile-points',
  imports: [DataTable, PageHeader, Panel, StatCard, StatusTag],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header [title]="i18n.t('profile.nav.points')" [crumbs]="crumbs" />

    <div class="flex flex-col gap-5 px-4 py-6 md:px-8">
      @if (summary(); as current) {
        <div class="grid gap-4 sm:grid-cols-3">
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
            icon="pi pi-clock"
            [label]="i18n.t('points.expiringSoon')"
            [value]="format(current.expiringPoints)"
            [caption]="
              current.expiringAt
                ? i18n.t('points.expiresOn', { date: date(current.expiringAt) })
                : i18n.t('points.noneExpiring')
            "
          />
        </div>

        <app-panel [heading]="i18n.t('points.rules')">
          <ul class="text-ink grid gap-2 text-sm sm:grid-cols-2">
            <li>
              <i class="pi pi-plus-circle text-brand mr-2"></i
              >{{ i18n.t('points.rule.earn', { n: current.earnBahtPerPoint }) }}
            </li>
            <li>
              <i class="pi pi-gift text-brand mr-2"></i
              >{{ i18n.t('points.rule.redeem', { n: current.redeemPointsPerBaht }) }}
            </li>
            <li>
              <i class="pi pi-sliders-h text-brand mr-2"></i
              >{{
                i18n.t('points.rule.limit', {
                  min: current.redeemMinPoints,
                  max: current.redeemMaxPercent,
                })
              }}
            </li>
            <li>
              <i class="pi pi-calendar text-brand mr-2"></i
              >{{ i18n.t('points.rule.expire', { n: current.expireDays }) }}
            </li>
          </ul>
        </app-panel>
      }

      <app-panel [heading]="i18n.t('points.history')">
        <app-data-table
          [rows]="transactions()"
          [columns]="columns()"
          [loading]="loading()"
          [total]="total()"
          [page]="page()"
          [pageSize]="pageSize"
          [emptyTitle]="i18n.t('points.empty')"
          minWidth="40rem"
          (pageChange)="load($event)"
        >
          <ng-template #cell let-row let-column="column">
            @switch (column.key) {
              @case ('type') {
                <app-status-tag kind="pointType" [value]="row.type" />
              }
              @case ('points') {
                <span
                  class="font-bold tabular-nums"
                  [class]="
                    row.points > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
                  "
                >
                  {{ row.points > 0 ? '+' : '' }}{{ row.points }}
                </span>
              }
            }
          </ng-template>
        </app-data-table>
      </app-panel>
    </div>
  `,
})
export class ProfilePoints {
  protected readonly i18n = inject(I18nService);
  private readonly api = inject(UserApi);

  protected readonly crumbs: Crumb[] = [
    { labelKey: 'profile.nav.overview', link: '/profile' },
    { labelKey: 'profile.nav.points' },
  ];
  protected readonly pageSize = PAGE_SIZE;
  protected readonly format = formatNumber;

  protected readonly summary = toSignal(this.api.myPoints().pipe(catchError(() => of(null))));
  protected readonly transactions = signal<PointTransactionResponse[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(0);
  protected readonly loading = signal(false);

  protected readonly columns = computed<TableColumn<PointTransactionResponse>[]>(() => [
    {
      key: 'createdAt',
      label: this.i18n.t('common.date'),
      value: (row) => this.date(row.createdAt, true),
    },
    { key: 'type', label: this.i18n.t('points.type'), custom: true },
    { key: 'points', label: this.i18n.t('points.points'), align: 'right', custom: true },
    { key: 'balanceAfter', label: this.i18n.t('points.balanceAfter'), align: 'right' },
    {
      key: 'orderNo',
      label: this.i18n.t('points.reference'),
      value: (row) => row.orderNo ?? row.remark ?? '-',
    },
    {
      key: 'expiresAt',
      label: this.i18n.t('points.expiresAt'),
      value: (row) => (row.expiresAt ? this.date(row.expiresAt) : '-'),
    },
  ]);

  constructor() {
    this.load({ page: 0, size: PAGE_SIZE });
  }

  protected date(value: string, withTime = false): string {
    return formatDate(value, this.i18n.lang(), withTime ? 'datetime' : 'date');
  }

  protected load(event: TablePage): void {
    this.loading.set(true);
    this.api
      .myPointTransactions(event.page, event.size)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe((response) => {
        this.transactions.set(response.items);
        this.total.set(response.totalItems);
        this.page.set(response.page);
      });
  }
}
