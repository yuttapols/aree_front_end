import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectButtonModule } from 'primeng/selectbutton';
import { forkJoin } from 'rxjs';

import { DateRange } from '../../../core/api/models/common.model';
import {
  DashboardSummaryResponse,
  HourlySalesResponse,
  PaymentMethodShareResponse,
  SalesTrendPoint,
  TopProductResponse,
  TrendGroupBy,
} from '../../../core/api/models/dashboard.model';
import { DashboardApi } from '../../../core/api/services/dashboard.api';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ThemeService } from '../../../core/theme/theme.service';
import { Crumb } from '../../../shared/components/breadcrumbs/breadcrumbs';
import { ChartCard } from '../../../shared/components/chart-card/chart-card';
import {
  DateRangeFilter,
  presetRange,
} from '../../../shared/components/date-range-filter/date-range-filter';
import { LoadingSkeleton } from '../../../shared/components/loading-skeleton/loading-skeleton';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { Panel } from '../../../shared/components/panel/panel';
import { StatCard } from '../../../shared/components/stat-card/stat-card';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import {
  formatDate,
  formatMoney,
  formatNumber,
  fromDateKey,
  percentChange,
} from '../../../shared/utils/format';

interface DashboardData {
  summary: DashboardSummaryResponse;
  trend: SalesTrendPoint[];
  top: TopProductResponse[];
  methods: PaymentMethodShareResponse[];
  hourly: HourlySalesResponse[];
}

interface ChartPalette {
  brand: string;
  accent: string;
  ink: string;
  muted: string;
  line: string;
  series: string[];
}

@Component({
  selector: 'app-dashboard-page',
  imports: [
    FormsModule,
    SelectButtonModule,
    ChartCard,
    DateRangeFilter,
    LoadingSkeleton,
    PageHeader,
    Panel,
    StatCard,
    MoneyPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header [title]="i18n.t('bo.nav.dashboard')" [crumbs]="crumbs" />

    <div class="flex flex-col gap-5 px-4 py-6 md:px-8">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <app-date-range-filter [(range)]="range" />
        <p-selectbutton
          [options]="groupOptions()"
          optionLabel="label"
          optionValue="value"
          [ngModel]="groupBy()"
          (ngModelChange)="groupBy.set($event)"
          [allowEmpty]="false"
          size="small"
        />
      </div>

      @if (data(); as current) {
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <app-stat-card
            icon="pi pi-wallet"
            tone="accent"
            [label]="i18n.t('dashboard.sales')"
            [value]="money(current.summary.salesAmount)"
            [delta]="delta(current.summary.salesAmount, current.summary.previous.salesAmount)"
            [deltaLabel]="i18n.t('dashboard.vsPrevious')"
          />
          <app-stat-card
            icon="pi pi-receipt"
            [label]="i18n.t('dashboard.orders')"
            [value]="format(current.summary.orderCount)"
            [delta]="delta(current.summary.orderCount, current.summary.previous.orderCount)"
            [deltaLabel]="i18n.t('dashboard.vsPrevious')"
          />
          <app-stat-card
            icon="pi pi-calculator"
            [label]="i18n.t('dashboard.aov')"
            [value]="money(current.summary.averageOrderValue)"
            [delta]="
              delta(current.summary.averageOrderValue, current.summary.previous.averageOrderValue)
            "
            [deltaLabel]="i18n.t('dashboard.vsPrevious')"
          />
          <app-stat-card
            icon="pi pi-user-plus"
            tone="accent"
            [label]="i18n.t('dashboard.newMembers')"
            [value]="format(current.summary.newMembers)"
            [delta]="delta(current.summary.newMembers, current.summary.previous.newMembers)"
            [deltaLabel]="i18n.t('dashboard.vsPrevious')"
          />
          <app-stat-card
            icon="pi pi-star"
            [label]="i18n.t('dashboard.pointsIssued')"
            [value]="format(current.summary.pointsIssued)"
            [delta]="delta(current.summary.pointsIssued, current.summary.previous.pointsIssued)"
            [deltaLabel]="i18n.t('dashboard.vsPrevious')"
          />
          <app-stat-card
            icon="pi pi-gift"
            [label]="i18n.t('dashboard.pointsRedeemed')"
            [value]="format(current.summary.pointsRedeemed)"
            [delta]="delta(current.summary.pointsRedeemed, current.summary.previous.pointsRedeemed)"
            [deltaLabel]="i18n.t('dashboard.vsPrevious')"
          />
        </div>

        <app-chart-card
          [heading]="i18n.t('dashboard.salesTrend')"
          type="line"
          [data]="trendChart()"
          [options]="lineOptions()"
          height="20rem"
        />

        <div class="grid gap-5 xl:grid-cols-2">
          <app-chart-card
            [heading]="i18n.t('dashboard.hourly')"
            type="bar"
            [data]="hourlyChart()"
            [options]="barOptions()"
          />
          <app-panel [heading]="i18n.t('dashboard.topProducts')">
            <ol class="flex flex-col gap-3">
              @for (product of current.top; track product.productId; let index = $index) {
                <li class="flex items-center gap-3">
                  <span
                    class="bg-brand-soft text-brand grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold"
                    >{{ index + 1 }}</span
                  >
                  <div class="min-w-0 flex-1">
                    <p class="text-ink truncate text-sm font-semibold">
                      {{ i18n.pick(product.productName, product.productNameEn) }}
                    </p>
                    <div class="bg-card-muted mt-1 h-2 overflow-hidden rounded-full">
                      <div
                        class="bg-accent h-full rounded-full"
                        [style.width.%]="(product.quantity / maxTop()) * 100"
                      ></div>
                    </div>
                  </div>
                  <div class="text-right">
                    <p class="text-ink text-sm font-bold">
                      {{ i18n.t('dashboard.units', { n: product.quantity }) }}
                    </p>
                    <p class="text-ink-muted text-xs">{{ product.salesAmount | money: false }}</p>
                  </div>
                </li>
              } @empty {
                <li class="text-ink-muted text-sm">{{ i18n.t('dashboard.noData') }}</li>
              }
            </ol>
          </app-panel>
        </div>

        <div class="grid gap-5 lg:grid-cols-3">
          <app-chart-card
            [heading]="i18n.t('dashboard.paymentMethods')"
            type="doughnut"
            [data]="methodChart()"
            [options]="pieOptions()"
            height="16rem"
          />
          <app-chart-card
            [heading]="i18n.t('dashboard.channels')"
            type="doughnut"
            [data]="channelChart()"
            [options]="pieOptions()"
            height="16rem"
          />
          <app-chart-card
            [heading]="i18n.t('dashboard.customers')"
            type="doughnut"
            [data]="customerChart()"
            [options]="pieOptions()"
            height="16rem"
          />
        </div>
      } @else {
        <app-loading-skeleton variant="table" [count]="8" />
      }
    </div>
  `,
})
export class DashboardPage {
  protected readonly i18n = inject(I18nService);
  private readonly api = inject(DashboardApi);
  private readonly theme = inject(ThemeService);
  private readonly document = inject(DOCUMENT);

  protected readonly crumbs: Crumb[] = [
    { labelKey: 'bo.title', link: '/backoffice' },
    { labelKey: 'bo.nav.dashboard' },
  ];
  protected readonly range = signal<DateRange>(presetRange('week'));
  protected readonly groupBy = signal<TrendGroupBy>('DAY');
  protected readonly data = signal<DashboardData | null>(null);
  protected readonly format = formatNumber;

  protected readonly groupOptions = computed(() => [
    { value: 'DAY', label: this.i18n.t('dashboard.byDay') },
    { value: 'WEEK', label: this.i18n.t('dashboard.byWeek') },
    { value: 'MONTH', label: this.i18n.t('dashboard.byMonth') },
  ]);

  private readonly palette = computed<ChartPalette>(() => {
    this.theme.isDark();
    const styles = getComputedStyle(this.document.documentElement);
    const read = (name: string) => styles.getPropertyValue(name).trim();
    const brand = read('--app-brand');
    const accent = read('--app-accent');
    return {
      brand,
      accent,
      ink: read('--app-ink'),
      muted: read('--app-ink-muted'),
      line: read('--app-line'),
      series: [brand, accent, '#10b981', '#0ea5e9', '#f43f5e', '#a3a3a3'],
    };
  });

  protected readonly maxTop = computed(() =>
    Math.max(1, ...(this.data()?.top.map((item) => item.quantity) ?? [1])),
  );

  protected readonly trendChart = computed(() => {
    const trend = this.data()?.trend ?? [];
    const palette = this.palette();
    return {
      labels: trend.map((point) => this.periodLabel(point.period)),
      datasets: [
        {
          label: this.i18n.t('dashboard.sales'),
          data: trend.map((point) => point.salesAmount),
          borderColor: palette.brand,
          backgroundColor: `${palette.brand}22`,
          fill: true,
          tension: 0.35,
          yAxisID: 'y',
        },
        {
          label: this.i18n.t('dashboard.orders'),
          data: trend.map((point) => point.orderCount),
          borderColor: palette.accent,
          backgroundColor: palette.accent,
          borderDash: [6, 4],
          tension: 0.35,
          yAxisID: 'y1',
        },
      ],
    };
  });

  protected readonly hourlyChart = computed(() => {
    const hours = (this.data()?.hourly ?? []).filter((hour) => hour.hour >= 10);
    return {
      labels: hours.map((hour) => `${String(hour.hour).padStart(2, '0')}:00`),
      datasets: [
        {
          label: this.i18n.t('dashboard.orders'),
          data: hours.map((hour) => hour.orderCount),
          backgroundColor: this.palette().accent,
          borderRadius: 8,
        },
      ],
    };
  });

  protected readonly methodChart = computed(() => {
    const methods = this.data()?.methods ?? [];
    return {
      labels: methods.map((method) => this.i18n.pick(method.methodName, method.methodNameEn)),
      datasets: [
        { data: methods.map((method) => method.amount), backgroundColor: this.palette().series },
      ],
    };
  });

  protected readonly channelChart = computed(() => {
    const summary = this.data()?.summary;
    return {
      labels: [this.i18n.t('status.channel.WALK_IN'), this.i18n.t('status.channel.ONLINE')],
      datasets: [
        {
          data: [summary?.walkIn.amount ?? 0, summary?.online.amount ?? 0],
          backgroundColor: [this.palette().brand, this.palette().accent],
        },
      ],
    };
  });

  protected readonly customerChart = computed(() => {
    const summary = this.data()?.summary;
    return {
      labels: [this.i18n.t('dashboard.member'), this.i18n.t('dashboard.guest')],
      datasets: [
        {
          data: [summary?.member.amount ?? 0, summary?.guest.amount ?? 0],
          backgroundColor: [this.palette().brand, this.palette().series[5]],
        },
      ],
    };
  });

  protected readonly lineOptions = computed(() => {
    const palette = this.palette();
    return {
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { labels: { color: palette.ink } } },
      scales: {
        x: { ticks: { color: palette.muted }, grid: { color: palette.line } },
        y: { ticks: { color: palette.muted }, grid: { color: palette.line }, beginAtZero: true },
        y1: {
          position: 'right',
          ticks: { color: palette.muted },
          grid: { drawOnChartArea: false },
          beginAtZero: true,
        },
      },
    };
  });

  protected readonly barOptions = computed(() => {
    const palette = this.palette();
    return {
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: palette.muted }, grid: { display: false } },
        y: {
          ticks: { color: palette.muted, precision: 0 },
          grid: { color: palette.line },
          beginAtZero: true,
        },
      },
    };
  });

  protected readonly pieOptions = computed(() => ({
    maintainAspectRatio: false,
    cutout: '62%',
    plugins: {
      legend: { position: 'bottom', labels: { color: this.palette().ink, usePointStyle: true } },
    },
  }));

  constructor() {
    effect(() => {
      const range = this.range();
      const groupBy = this.groupBy();
      forkJoin({
        summary: this.api.summary(range),
        trend: this.api.salesTrend(range, groupBy),
        top: this.api.topProducts(range, 5),
        methods: this.api.paymentMethods(range),
        hourly: this.api.hourly(range),
      }).subscribe((data) => this.data.set(data));
    });
  }

  protected money(value: number): string {
    return formatMoney(value, false);
  }

  protected delta(current: number, previous: number): number | null {
    return percentChange(current, previous);
  }

  private periodLabel(period: string): string {
    if (this.groupBy() === 'MONTH') {
      return period;
    }
    const date = fromDateKey(period);
    return date ? formatDate(date.toISOString(), this.i18n.lang(), 'short') : period;
  }
}
