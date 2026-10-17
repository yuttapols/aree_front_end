import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { finalize } from 'rxjs';

import { PromotionResponse, PromotionUsageResponse } from '../../../core/api/models/loyalty.model';
import { PromotionApi } from '../../../core/api/services/promotion.api';
import { CatalogStore } from '../../../core/catalog/catalog.store';
import { I18nService } from '../../../core/i18n/i18n.service';
import { Crumb } from '../../../shared/components/breadcrumbs/breadcrumbs';
import { DataTable, TableColumn } from '../../../shared/components/data-table/data-table';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { Panel } from '../../../shared/components/panel/panel';
import { StatusTag } from '../../../shared/components/status-tag/status-tag';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { ThaiDatePipe } from '../../../shared/pipes/thai-date.pipe';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { formatDate } from '../../../shared/utils/format';
import { promotionHeadline, promotionState } from '../../../shared/utils/promotion';

const PROMOTION_PAGE_SIZE = 20;
const USAGE_PAGE_SIZE = 100;

@Component({
  selector: 'app-admin-promotions-page',
  imports: [
    RouterLink,
    FormsModule,
    ButtonModule,
    ToggleSwitchModule,
    DialogModule,
    DataTable,
    EmptyState,
    PageHeader,
    Panel,
    StatusTag,
    MoneyPipe,
    ThaiDatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header [title]="i18n.t('bo.nav.promotions')" [crumbs]="crumbs" />

    <div class="px-4 py-6 md:px-8">
      <app-panel
        [heading]="i18n.t('bo.nav.promotions')"
        [subtitle]="i18n.t('bo.promotions.total', { n: total() })"
      >
        <a
          panelActions
          pButton
          routerLink="/backoffice/promotions/new"
          [label]="i18n.t('common.add')"
          icon="pi pi-plus"
          [rounded]="true"
        ></a>
        <app-data-table
          [rows]="promotions()"
          [columns]="columns()"
          [loading]="loading()"
          [page]="page()"
          [pageSize]="pageSize"
          [total]="total()"
          (pageChange)="changePage($event.page)"
          [clickable]="true"
          [emptyTitle]="i18n.t('promo.empty')"
          minWidth="60rem"
          (rowClick)="open($event)"
        >
          <ng-template #cell let-row let-column="column">
            @switch (column.key) {
              @case ('name') {
                <span class="text-ink block font-semibold">{{ i18n.name(row) }}</span>
                <span class="text-accent text-xs font-bold">{{ headline(row) }}</span>
              }
              @case ('code') {
                @if (row.code) {
                  <span
                    class="border-brand text-brand rounded-full border border-dashed px-2 py-0.5 text-xs font-bold"
                    >{{ row.code }}</span
                  >
                } @else {
                  <span class="text-ink-muted text-xs">{{ i18n.t('promo.autoApply') }}</span>
                }
              }
              @case ('state') {
                <app-status-tag kind="promotion" [value]="state(row)" />
              }
              @case ('actions') {
                <span class="flex justify-end" (click)="$event.stopPropagation()">
                  <p-button
                    icon="pi pi-history"
                    [text]="true"
                    [rounded]="true"
                    [ariaLabel]="i18n.t('bo.promotions.usages')"
                    (onClick)="showUsages(row)"
                  />
                  <p-toggleswitch
                    class="mx-2 self-center"
                    [ngModel]="row.active"
                    [disabled]="toggling() === row.id"
                    [ariaLabel]="i18n.t('status.active.true')"
                    (ngModelChange)="setActive(row, $event)"
                  />
                  <p-button
                    icon="pi pi-trash"
                    severity="danger"
                    [text]="true"
                    [rounded]="true"
                    [ariaLabel]="i18n.t('common.delete')"
                    (onClick)="remove(row)"
                  />
                </span>
              }
            }
          </ng-template>
        </app-data-table>
      </app-panel>
    </div>

    <p-dialog
      [visible]="usagePromotion() !== null"
      (visibleChange)="!$event && usagePromotion.set(null)"
      [modal]="true"
      [draggable]="false"
      [header]="i18n.t('bo.promotions.usages')"
      [style]="{ width: '34rem' }"
      [breakpoints]="{ '640px': '96vw' }"
    >
      @if (usages().length) {
        <ul class="divide-line divide-y">
          @for (usage of usages(); track usage.id) {
            <li class="flex items-center justify-between gap-3 py-2.5 text-sm">
              <div>
                <p class="text-ink font-semibold">#{{ usage.orderNo }}</p>
                <p class="text-ink-muted text-xs">
                  {{ usage.customerName ?? '-' }} ·
                  {{ usage.createdAt | thaiDate: i18n.lang() : 'datetime' }}
                </p>
              </div>
              <span class="font-bold text-emerald-600 dark:text-emerald-400"
                >-{{ usage.discountAmount | money }}</span
              >
            </li>
          }
        </ul>
      } @else {
        <app-empty-state icon="pi pi-history" [title]="i18n.t('bo.promotions.noUsages')" />
      }
    </p-dialog>
  `,
})
export class AdminPromotionsPage {
  protected readonly i18n = inject(I18nService);
  private readonly api = inject(PromotionApi);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);
  private readonly catalog = inject(CatalogStore);

  protected readonly crumbs: Crumb[] = [
    { labelKey: 'bo.title', link: '/backoffice' },
    { labelKey: 'bo.nav.promotions' },
  ];
  protected readonly promotions = signal<PromotionResponse[]>([]);
  protected readonly toggling = signal<number | null>(null);
  private readonly messages = inject(MessageService);
  protected readonly page = signal(0);
  protected readonly total = signal(0);
  protected readonly pageSize = PROMOTION_PAGE_SIZE;
  protected readonly loading = signal(false);
  protected readonly usagePromotion = signal<PromotionResponse | null>(null);
  protected readonly usages = signal<PromotionUsageResponse[]>([]);

  protected readonly columns = computed<TableColumn<PromotionResponse>[]>(() => [
    { key: 'name', label: this.i18n.t('catalog.name'), custom: true },
    { key: 'code', label: this.i18n.t('bo.promotions.code'), custom: true },
    {
      key: 'type',
      label: this.i18n.t('bo.promotions.type'),
      value: (row) => this.i18n.t(`promo.type.${row.type}`),
    },
    {
      key: 'period',
      label: this.i18n.t('bo.promotions.period'),
      value: (row) =>
        `${formatDate(row.startAt, this.i18n.lang(), 'short')} – ${formatDate(row.endAt, this.i18n.lang(), 'short')}`,
    },
    {
      key: 'usedCount',
      label: this.i18n.t('bo.promotions.used'),
      align: 'right',
      value: (row) => (row.usageLimit ? `${row.usedCount}/${row.usageLimit}` : `${row.usedCount}`),
    },
    { key: 'state', label: this.i18n.t('common.status'), custom: true },
    { key: 'actions', label: '', align: 'right', width: '7rem', custom: true },
  ]);

  constructor() {
    this.load();
  }

  protected headline(promotion: PromotionResponse): string {
    return promotionHeadline(promotion, this.i18n);
  }

  protected state(promotion: PromotionResponse): string {
    return promotionState(promotion);
  }

  protected open(promotion: PromotionResponse): void {
    this.router.navigate(['/backoffice/promotions', promotion.id]);
  }

  protected showUsages(promotion: PromotionResponse): void {
    this.usages.set([]);
    this.usagePromotion.set(promotion);
    this.api
      .usages(promotion.id, 0, USAGE_PAGE_SIZE)
      .subscribe((page) => this.usages.set(page.items));
  }

  protected setActive(promotion: PromotionResponse, active: boolean): void {
    const { id, usedCount, ...request } = promotion;
    this.toggling.set(id);
    this.api
      .update(id, { ...request, active })
      .pipe(finalize(() => this.toggling.set(null)))
      .subscribe({
        next: (updated) => {
          this.promotions.update((rows) => rows.map((row) => (row.id === id ? updated : row)));
          this.messages.add({
            severity: 'success',
            summary: this.i18n.t(active ? 'bo.promotions.activated' : 'bo.promotions.deactivated', {
              name: this.i18n.name(promotion),
            }),
          });
          this.catalog.refresh();
        },
        error: () => this.promotions.update((rows) => [...rows]),
      });
  }

  protected async remove(promotion: PromotionResponse): Promise<void> {
    const ok = await this.confirm.ask({
      message: this.i18n.t('bo.promotions.confirmDelete', { name: this.i18n.name(promotion) }),
      danger: true,
      acceptLabel: this.i18n.t('common.delete'),
    });
    if (ok) {
      this.api.remove(promotion.id).subscribe(() => {
        this.messages.add({
          severity: 'success',
          summary: this.i18n.t('catalog.deleted', { name: this.i18n.name(promotion) }),
        });
        this.load();
        this.catalog.refresh();
      });
    }
  }

  protected changePage(page: number): void {
    this.page.set(page);
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.api
      .list(this.page(), this.pageSize)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe((response) => {
        this.promotions.set(response.items);
        this.total.set(response.totalItems);
      });
  }
}
