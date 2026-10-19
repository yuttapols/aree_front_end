import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { catchError, finalize, of } from 'rxjs';

import { PointTransactionResponse } from '../../core/api/models/loyalty.model';
import { UserApi } from '../../core/api/services/user.api';
import { I18nService } from '../../core/i18n/i18n.service';
import { Crumb } from '../../shared/components/breadcrumbs/breadcrumbs';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { LoadingSkeleton } from '../../shared/components/loading-skeleton/loading-skeleton';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { Panel } from '../../shared/components/panel/panel';
import { StatusTag } from '../../shared/components/status-tag/status-tag';
import { formatDate, formatNumber } from '../../shared/utils/format';

const PAGE_SIZE = 10;

const POINT_TYPE_ICONS: Record<string, string> = {
  EARN: 'pi pi-plus-circle',
  REDEEM: 'pi pi-gift',
  ADJUST: 'pi pi-sliders-h',
  EXPIRE: 'pi pi-hourglass',
  REVERSE: 'pi pi-replay',
};

@Component({
  selector: 'app-profile-points',
  imports: [EmptyState, LoadingSkeleton, PageHeader, PaginatorModule, Panel, StatusTag],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header [title]="i18n.t('profile.nav.points')" [crumbs]="crumbs" />

    <div class="flex flex-col gap-5 px-4 py-6 md:px-8">
      @if (summary(); as current) {
        <section
          class="bg-royal shadow-lift animate-rise relative overflow-hidden rounded-[2rem] p-6 text-white md:p-8"
        >
          <i
            class="pi pi-star-fill pointer-events-none absolute -top-10 -right-6 text-[11rem] text-white/10"
          ></i>
          <div class="relative flex flex-wrap items-end justify-between gap-6">
            <div>
              <p class="flex items-center gap-2 text-sm font-semibold text-white/75">
                <i class="pi pi-star-fill text-accent"></i>{{ i18n.t('points.balance') }}
              </p>
              <p
                class="font-display text-accent mt-2 text-6xl leading-none font-extrabold tabular-nums md:text-7xl"
              >
                {{ format(current.balance) }}
              </p>
              <p class="mt-2 text-sm text-white/70">{{ i18n.t('points.unit') }}</p>
            </div>
            <div class="flex flex-col items-end gap-3">
              @if (current.lifetimePoints != null) {
                <div class="min-w-44 rounded-2xl bg-white/10 px-4 py-3 text-right">
                  <p class="flex items-center justify-end gap-1.5 text-xs text-white/70">
                    <i class="pi pi-chart-line"></i>{{ i18n.t('points.lifetime') }}
                  </p>
                  <p class="font-display mt-1 text-2xl font-bold tabular-nums">
                    {{ format(current.lifetimePoints) }}
                  </p>
                </div>
              }
              <span
                class="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold ring-1 ring-white/20"
              >
                <i class="pi pi-calendar text-accent"></i>{{ i18n.t('points.expireEndOfYear') }}
              </span>
            </div>
          </div>
        </section>
      }

      <app-panel
        [heading]="i18n.t('points.history')"
        [subtitle]="i18n.t('points.historyCount', { n: total() })"
      >
        @if (loading() && !transactions().length) {
          <app-loading-skeleton variant="list" [count]="4" />
        } @else if (transactions().length) {
          <ul class="flex flex-col gap-3">
            @for (row of transactions(); track row.id) {
              @let gain = row.points > 0;
              <li
                class="border-line bg-card hover:shadow-soft flex items-center gap-4 rounded-2xl border p-4 transition"
              >
                <span
                  class="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-lg"
                  [class]="
                    gain
                      ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300'
                      : 'bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400'
                  "
                >
                  <i [class]="typeIcon(row.type)"></i>
                </span>
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <app-status-tag kind="pointType" [value]="row.type" />
                  </div>
                  <p class="text-ink mt-1 truncate font-semibold">
                    {{ row.remark || (row.orderNo ? '#' + row.orderNo : '-') }}
                  </p>
                  <p class="text-ink-muted mt-0.5 flex items-center gap-1 text-xs">
                    <i class="pi pi-clock text-[0.65rem]"></i>{{ date(row.createdAt, true) }}
                  </p>
                </div>
                <div class="shrink-0 text-right">
                  <p
                    class="font-display text-2xl leading-none font-extrabold tabular-nums"
                    [class]="gain ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'"
                  >
                    {{ gain ? '+' : '' }}{{ format(row.points) }}
                  </p>
                  <p class="text-ink-muted mt-1 text-xs">
                    {{ i18n.t('points.balanceAfterValue', { n: format(row.balanceAfter) }) }}
                  </p>
                </div>
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
          <app-empty-state icon="pi pi-star" [title]="i18n.t('points.empty')" />
        }
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

  protected typeIcon(type: string): string {
    return POINT_TYPE_ICONS[type] ?? 'pi pi-star';
  }

  constructor() {
    this.load(0);
  }

  protected onPage(event: PaginatorState): void {
    this.load(Math.floor((event.first ?? 0) / PAGE_SIZE));
  }

  protected date(value: string, withTime = false): string {
    return formatDate(value, this.i18n.lang(), withTime ? 'datetime' : 'date');
  }

  private load(page: number): void {
    this.loading.set(true);
    this.api
      .myPointTransactions(page, PAGE_SIZE)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe((response) => {
        this.transactions.set(response.items);
        this.total.set(response.totalItems);
        this.page.set(response.page);
      });
  }
}
