import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { finalize } from 'rxjs';

import { CustomerResponse } from '../../../core/api/models/user.model';
import { UserApi } from '../../../core/api/services/user.api';
import { I18nService } from '../../../core/i18n/i18n.service';
import { Avatar } from '../../../shared/components/avatar/avatar';
import { Crumb } from '../../../shared/components/breadcrumbs/breadcrumbs';
import { DataTable, TableColumn } from '../../../shared/components/data-table/data-table';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { Panel } from '../../../shared/components/panel/panel';
import { QuickRegisterDialog } from '../../../shared/components/quick-register-dialog/quick-register-dialog';
import { SearchBox } from '../../../shared/components/search-box/search-box';
import { formatDate, formatMoney, formatNumber, formatPhone } from '../../../shared/utils/format';

const PAGE_SIZE = 10;

@Component({
  selector: 'app-customers-page',
  imports: [ButtonModule, Avatar, DataTable, PageHeader, Panel, QuickRegisterDialog, SearchBox],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header [title]="i18n.t('bo.nav.customers')" [crumbs]="crumbs" />

    <div class="px-4 py-6 md:px-8">
      <app-panel
        [heading]="i18n.t('bo.nav.customers')"
        [subtitle]="i18n.t('bo.customers.total', { n: total() })"
      >
        <p-button
          panelActions
          [label]="i18n.t('memberLookup.quickRegister')"
          icon="pi pi-user-plus"
          [rounded]="true"
          (onClick)="registerOpen.set(true)"
        />
        <app-search-box
          class="mb-4 block max-w-md"
          [placeholder]="i18n.t('bo.customers.search')"
          [clearLabel]="i18n.t('search.clear')"
          (search)="search($event)"
        />
        <app-data-table
          [rows]="customers()"
          [columns]="columns()"
          [loading]="loading()"
          [total]="total()"
          [page]="page()"
          [pageSize]="pageSize"
          [clickable]="true"
          [emptyTitle]="i18n.t('bo.customers.empty')"
          (pageChange)="load($event.page)"
          (rowClick)="open($event)"
        >
          <ng-template #cell let-row let-column="column">
            @if (column.key === 'nickname') {
              <span class="flex items-center gap-2">
                <app-avatar [url]="row.avatarUrl" [name]="row.nickname" />
                <span class="text-ink font-semibold">{{ row.nickname }}</span>
              </span>
            }
          </ng-template>
        </app-data-table>
      </app-panel>
    </div>

    <app-quick-register-dialog [(visible)]="registerOpen" (registered)="load(0)" />
  `,
})
export class CustomersPage {
  protected readonly i18n = inject(I18nService);
  private readonly api = inject(UserApi);
  private readonly router = inject(Router);

  protected readonly crumbs: Crumb[] = [
    { labelKey: 'bo.title', link: '/backoffice' },
    { labelKey: 'bo.nav.customers' },
  ];
  protected readonly pageSize = PAGE_SIZE;
  protected readonly customers = signal<CustomerResponse[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(0);
  protected readonly loading = signal(false);
  protected readonly registerOpen = signal(false);
  private readonly keyword = signal('');

  protected readonly columns = computed<TableColumn<CustomerResponse>[]>(() => [
    { key: 'memberCode', label: this.i18n.t('bo.customers.memberCode') },
    { key: 'nickname', label: this.i18n.t('register.name'), custom: true },
    { key: 'phone', label: this.i18n.t('register.phone'), value: (row) => formatPhone(row.phone) },
    {
      key: 'pointsBalance',
      label: this.i18n.t('member.points'),
      align: 'right',
      value: (row) => formatNumber(row.pointsBalance),
    },
    { key: 'orderCount', label: this.i18n.t('member.stat.orders'), align: 'right' },
    {
      key: 'totalSpent',
      label: this.i18n.t('member.stat.spent'),
      align: 'right',
      value: (row) => formatMoney(row.totalSpent, false),
    },
    {
      key: 'createdAt',
      label: this.i18n.t('member.joinedAt'),
      value: (row) => formatDate(row.createdAt, this.i18n.lang()),
    },
  ]);

  constructor() {
    this.load(0);
  }

  protected search(keyword: string): void {
    this.keyword.set(keyword);
    this.load(0);
  }

  protected load(page: number): void {
    this.loading.set(true);
    this.api
      .customers(page, PAGE_SIZE, this.keyword())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe((response) => {
        this.customers.set(response.items);
        this.total.set(response.totalItems);
        this.page.set(response.page);
      });
  }

  protected open(customer: CustomerResponse): void {
    this.router.navigate(['/backoffice/customers', customer.id]);
  }
}
