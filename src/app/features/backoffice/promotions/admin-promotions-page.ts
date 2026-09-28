import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
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

@Component({
  selector: 'app-admin-promotions-page',
  imports: [
    RouterLink,
    ButtonModule,
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
        [subtitle]="i18n.t('bo.promotions.total', { n: promotions().length })"
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
          [lazy]="false"
          [total]="promotions().length"
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
                  @if (row.isActive) {
                    <p-button
                      icon="pi pi-power-off"
                      severity="danger"
                      [text]="true"
                      [rounded]="true"
                      [ariaLabel]="i18n.t('bo.promotions.deactivate')"
                      (onClick)="deactivate(row)"
                    />
                  }
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
    this.api.usages(promotion.id).subscribe((usages) => this.usages.set(usages));
  }

  protected async deactivate(promotion: PromotionResponse): Promise<void> {
    const ok = await this.confirm.ask({
      message: this.i18n.t('bo.promotions.confirmDeactivate', { name: this.i18n.name(promotion) }),
      danger: true,
      acceptLabel: this.i18n.t('bo.promotions.deactivate'),
    });
    if (ok) {
      this.api.remove(promotion.id).subscribe(() => {
        this.load();
        this.catalog.refresh();
      });
    }
  }

  private load(): void {
    this.loading.set(true);
    this.api
      .list()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe((promotions) => this.promotions.set(promotions));
  }
}
