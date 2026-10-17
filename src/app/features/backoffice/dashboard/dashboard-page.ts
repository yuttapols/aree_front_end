import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  computed,
  effect,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectButtonModule } from 'primeng/selectbutton';
import { Observable, catchError, forkJoin, of } from 'rxjs';

import { DateRange } from '../../../core/api/models/common.model';
import {
  BreakdownSlice,
  DashboardSummaryResponse,
  DashboardTotals,
  HourlySalesResponse,
  PaymentMethodShareResponse,
  SalesTrendPoint,
  TopProductResponse,
  TrendGroupBy,
} from '../../../core/api/models/dashboard.model';
import { DashboardApi } from '../../../core/api/services/dashboard.api';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ShopInfoStore } from '../../../core/shop/shop-info.store';
import { ThemeService } from '../../../core/theme/theme.service';
import { Crumb } from '../../../shared/components/breadcrumbs/breadcrumbs';
import { ChartCard } from '../../../shared/components/chart-card/chart-card';
import {
  DateRangeFilter,
  presetRange,
} from '../../../shared/components/date-range-filter/date-range-filter';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
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
  toDateKey,
} from '../../../shared/utils/format';

interface DashboardData {
  summary: DashboardSummaryResponse;
  trend: SalesTrendPoint[];
  top: TopProductResponse[];
  methods: PaymentMethodShareResponse[];
}

const EMPTY_SLICE: BreakdownSlice = { count: 0, amount: 0 };

function sliceValues(
  first: BreakdownSlice | undefined,
  second: BreakdownSlice | undefined,
): number[] {
  const slices = [first ?? EMPTY_SLICE, second ?? EMPTY_SLICE];
  const hasAmounts = slices.some((slice) => slice.amount > 0);
  return slices.map((slice) => (hasAmounts ? slice.amount : slice.count));
}
const EMPTY_TOTALS: DashboardTotals = {
  salesAmount: 0,
  orderCount: 0,
  averageOrderValue: 0,
  newMembers: 0,
  pointsIssued: 0,
  pointsRedeemed: 0,
};
const EMPTY_SUMMARY: DashboardSummaryResponse = {
  ...EMPTY_TOTALS,
  previous: EMPTY_TOTALS,
  walkIn: EMPTY_SLICE,
  online: EMPTY_SLICE,
  member: EMPTY_SLICE,
  guest: EMPTY_SLICE,
};

function orFallback<T>(source: Observable<T>, fallback: T): Observable<T> {
  return source.pipe(catchError(() => of(fallback)));
}

const DEFAULT_OPEN_HOUR = 10;
const DEFAULT_CLOSE_HOUR = 22;
const HOURS_PER_DAY = 24;

function hourOf(time: string | undefined, fallback: number): number {
  const [hour, minute] = (time ?? '').split(':').map(Number);
  if (hour === undefined || Number.isNaN(hour)) {
    return fallback;
  }
  return minute ? hour + minute / 60 : hour;
}

function fillOpeningHours(
  points: HourlySalesResponse[],
  openTime: string | undefined,
  closeTime: string | undefined,
): HourlySalesResponse[] {
  const openHour = Math.floor(hourOf(openTime, DEFAULT_OPEN_HOUR));
  let closeHour = Math.ceil(hourOf(closeTime, DEFAULT_CLOSE_HOUR));
  if (closeHour <= openHour) {
    closeHour += HOURS_PER_DAY;
  }
  const byHour = new Map(points.map((point) => [point.hour, point]));
  const hours = new Set<number>(points.map((point) => point.hour));
  for (let hour = openHour; hour < closeHour; hour += 1) {
    hours.add(hour % HOURS_PER_DAY);
  }
  const order = (hour: number) => (hour - openHour + HOURS_PER_DAY) % HOURS_PER_DAY;
  return [...hours]
    .sort((left, right) => order(left) - order(right))
    .map((hour) => byHour.get(hour) ?? { hour, orderCount: 0, netSales: 0 });
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
    DatePickerModule,
    SelectButtonModule,
    ChartCard,
    DateRangeFilter,
    EmptyState,
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

      @if (loading()) {
        <app-loading-skeleton variant="table" [count]="8" />
      } @else if (!hasSales()) {
        <app-panel>
          <app-empty-state
            icon="pi pi-chart-line"
            [title]="i18n.t('dashboard.emptyTitle')"
            [hint]="i18n.t('dashboard.emptyHint')"
          />
        </app-panel>
      } @else if (data(); as current) {
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
          [emptyText]="emptyText(!hasTrend())"
          [data]="trendChart()"
          [options]="lineOptions()"
          height="20rem"
        />

        <div class="grid gap-5 xl:grid-cols-2">
          <app-chart-card
            [heading]="i18n.t('dashboard.hourly')"
            type="bar"
            [emptyText]="emptyText(!hasHourly())"
            [data]="hourlyChart()"
            [options]="barOptions()"
          >
            <p-datepicker
              chartActions
              dateFormat="dd/mm/yy"
              size="small"
              [readonlyInput]="true"
              [showIcon]="true"
              [maxDate]="today"
              [ariaLabel]="i18n.t('dashboard.hourlyDate')"
              [ngModel]="hourlyDateValue()"
              (ngModelChange)="onHourlyDate($event)"
            />
          </app-chart-card>
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
            [emptyText]="emptyText(!hasMethods())"
            [data]="methodChart()"
            [options]="pieOptions()"
            height="16rem"
          />
          <app-chart-card
            [heading]="i18n.t('dashboard.channels')"
            type="doughnut"
            [emptyText]="emptyText(!hasSales())"
            [data]="channelChart()"
            [options]="pieOptions()"
            height="16rem"
          />
          <app-chart-card
            [heading]="i18n.t('dashboard.customers')"
            type="doughnut"
            [emptyText]="emptyText(!hasSales())"
            [data]="customerChart()"
            [options]="pieOptions()"
            height="16rem"
          />
        </div>
      }
    </div>
  `,
})
export class DashboardPage {
  protected readonly i18n = inject(I18nService);
  private readonly api = inject(DashboardApi);
  private readonly theme = inject(ThemeService);
  private readonly document = inject(DOCUMENT);
  private readonly shop = inject(ShopInfoStore);

  protected readonly crumbs: Crumb[] = [
    { labelKey: 'bo.title', link: '/backoffice' },
    { labelKey: 'bo.nav.dashboard' },
  ];
  protected readonly range = signal<DateRange>(presetRange('week'));
  protected readonly groupBy = signal<TrendGroupBy>('DAY');
  protected readonly data = signal<DashboardData | null>(null);
  protected readonly loading = signal(true);
  protected readonly today = new Date();
  protected readonly hourlyDate = linkedSignal(() => this.lastDayOf(this.range()));
  protected readonly hourlyDateValue = computed(() => fromDateKey(this.hourlyDate()));
  private readonly hourly = signal<HourlySalesResponse[]>([]);
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

  protected readonly hasTrend = computed(() =>
    (this.data()?.trend ?? []).some((point) => point.orderCount > 0 || point.salesAmount > 0),
  );
  protected readonly hasHourly = computed(() =>
    this.hourly().some((hour) => hour.orderCount > 0 || hour.netSales > 0),
  );
  protected readonly hasMethods = computed(() =>
    (this.data()?.methods ?? []).some((method) => method.amount > 0),
  );
  protected readonly hasSales = computed(() => (this.data()?.summary.orderCount ?? 0) > 0);

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
    const info = this.shop.info();
    const hours = fillOpeningHours(this.hourly(), info?.openTime, info?.closeTime);
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
          data: sliceValues(summary?.walkIn, summary?.online),
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
          data: sliceValues(summary?.member, summary?.guest),
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
      this.loading.set(true);
      forkJoin({
        summary: orFallback(this.api.summary(range), EMPTY_SUMMARY),
        trend: orFallback(this.api.salesTrend(range, groupBy), []),
        top: orFallback(this.api.topProducts(range, 5), []),
        methods: orFallback(this.api.paymentMethods(range), []),
      }).subscribe((data) => {
        this.data.set(data);
        this.loading.set(false);
      });
    });
    effect(() => {
      orFallback(this.api.hourly(this.hourlyDate()), []).subscribe((hours) =>
        this.hourly.set(hours),
      );
    });
    this.shop.ensureLoaded();
  }

  protected onHourlyDate(value: Date | null): void {
    if (value) {
      this.hourlyDate.set(toDateKey(value));
    }
  }

  private lastDayOf(range: DateRange): string {
    const todayKey = toDateKey(new Date());
    return range.to < todayKey ? range.to : todayKey;
  }

  protected emptyText(isEmpty: boolean): string | null {
    return isEmpty ? this.i18n.t('dashboard.noData') : null;
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
