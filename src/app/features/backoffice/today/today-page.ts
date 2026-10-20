import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { finalize } from 'rxjs';

import { OrderResponse, OrderStatus } from '../../../core/api/models/order.model';
import { OrderApi } from '../../../core/api/services/order.api';
import { AuthStore } from '../../../core/auth/auth.store';
import { I18nService } from '../../../core/i18n/i18n.service';
import { Crumb } from '../../../shared/components/breadcrumbs/breadcrumbs';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { LoadingSkeleton } from '../../../shared/components/loading-skeleton/loading-skeleton';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { Panel } from '../../../shared/components/panel/panel';
import { outstandingAmount } from '../../../shared/utils/price';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { ThaiDatePipe } from '../../../shared/pipes/thai-date.pipe';
import { toDateKey } from '../../../shared/utils/format';
import { PosPage } from '../pos/pos-page';
import { PayLaterTag } from '../../../shared/components/pay-later-tag/pay-later-tag';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { QueueOrderPanel } from './queue-order-panel';

const REFRESH_MS = 15_000;
const ERROR_BACKOFF_MS = [30_000, 60_000];

type CardTone = 'next' | 'debt' | 'normal';

const CARD_TONES: Record<
  CardTone,
  {
    card: string;
    bubble: string;
    number: string;
    title: string;
    muted: string;
    footer: string;
    amount: string;
  }
> = {
  next: {
    card: 'border-transparent bg-gradient-to-br from-[#a87b4f] to-[#d2b48c] text-white shadow-md shadow-[#a87b4f]/30',
    bubble: 'bg-white/15',
    number: 'text-white',
    title: 'text-white',
    muted: 'text-white/75',
    footer: 'border-white/25 text-white/85',
    amount: 'text-white',
  },
  debt: {
    card: 'border-red-200 bg-gradient-to-br from-red-50 to-card hover:border-red-300 dark:border-red-500/30 dark:from-red-500/10',
    bubble: 'bg-red-100 dark:bg-red-500/10',
    number: 'text-red-500 dark:text-red-400',
    title: 'text-ink',
    muted: 'text-ink-muted',
    footer: 'border-red-100 text-ink-muted dark:border-red-500/20',
    amount: 'text-red-600 dark:text-red-400',
  },
  normal: {
    card: 'from-accent-soft via-card to-card border-accent/20 hover:border-accent/50 bg-gradient-to-br',
    bubble: 'bg-accent/10',
    number: 'text-accent',
    title: 'text-ink',
    muted: 'text-ink-muted',
    footer: 'border-line text-ink-muted',
    amount: 'text-brand',
  },
};

const QUEUED_STATUSES: OrderStatus[] = ['PENDING_PAYMENT', 'CONFIRMED', 'PREPARING', 'READY'];
const IN_PROGRESS_STATUSES: OrderStatus[] = ['PREPARING', 'READY'];

function isQueued(order: OrderResponse): boolean {
  return QUEUED_STATUSES.includes(order.status);
}

@Component({
  selector: 'app-today-page',
  imports: [
    EmptyState,
    LoadingSkeleton,
    PageHeader,
    Panel,
    MoneyPipe,
    ThaiDatePipe,
    QueueOrderPanel,
    ButtonModule,
    PosPage,
    PayLaterTag,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header [title]="i18n.t('bo.nav.today')" [crumbs]="crumbs" />

    <div class="flex flex-col gap-5 px-4 py-6 md:px-8">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 class="font-display text-ink text-2xl font-bold">
          {{ i18n.t('bo.today.greeting', { name: auth.user()?.nickname ?? '' }) }}
        </h2>
        <p-button
          [label]="i18n.t('bo.nav.pos')"
          icon="pi pi-calculator"
          [rounded]="true"
          (onClick)="scrollToPos()"
        />
      </div>

      @if (queueList(); as data) {
        @if (currentDetail(); as serving) {
          <div id="now-serving" class="grid scroll-mt-24 gap-5 lg:grid-cols-2">
            <section
              class="bg-royal animate-rise relative isolate flex flex-col overflow-hidden rounded-[2rem] p-6 text-white shadow-[0_30px_60px_-30px_rgb(58_20_102/0.85),inset_0_1px_0_rgb(255_255_255/0.18)] md:p-8"
            >
              <span
                class="bg-accent/25 pointer-events-none absolute -bottom-32 -left-24 -z-10 h-80 w-80 rounded-full blur-3xl"
              ></span>
              <span
                class="pointer-events-none absolute -top-24 -right-24 -z-10 h-72 w-72 rounded-full bg-fuchsia-400/20 blur-3xl"
              ></span>
              <span
                class="pointer-events-none absolute top-1/2 left-[5.5rem] -z-10 h-[26rem] w-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.06] md:left-28"
              ></span>
              <span
                class="pointer-events-none absolute top-1/2 left-[5.5rem] -z-10 h-[19rem] w-[19rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.08] md:left-28"
              ></span>

              <div class="flex flex-wrap items-center justify-between gap-3">
                <span
                  class="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-sm font-bold backdrop-blur-md"
                >
                  <span class="relative flex h-2.5 w-2.5">
                    <span
                      class="bg-accent absolute inline-flex h-full w-full animate-ping rounded-full opacity-70"
                    ></span>
                    <span class="bg-accent relative inline-flex h-2.5 w-2.5 rounded-full"></span>
                  </span>
                  {{ i18n.t('bo.today.nowServing') }}
                </span>
                <span
                  class="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/85 backdrop-blur-md"
                >
                  <i class="pi pi-hourglass text-[0.7rem]"></i>
                  {{ i18n.t('bo.today.waited', { n: waitedMinutes(serving) }) }}
                </span>
              </div>

              <div class="my-auto flex flex-wrap items-center gap-6 py-7 md:gap-8">
                @for (queueNo of [serving.queueNo]; track queueNo) {
                  <div
                    class="animate-pop relative grid h-36 w-36 shrink-0 place-items-center rounded-full bg-gradient-to-br from-white/25 to-white/5 shadow-[0_20px_40px_-12px_rgb(0_0_0/0.45),inset_0_2px_0_rgb(255_255_255/0.35),inset_0_-10px_24px_rgb(0_0_0/0.18)] ring-8 ring-white/[0.07] backdrop-blur-md md:h-44 md:w-44"
                  >
                    <div class="text-center leading-none">
                      <p class="text-xs font-bold tracking-[0.3em] text-white/70 uppercase">
                        {{ i18n.t('bo.today.queueLabel') }}
                      </p>
                      <p
                        class="font-display text-accent mt-1 text-7xl font-extrabold drop-shadow-[0_6px_12px_rgb(0_0_0/0.35)] md:text-8xl"
                      >
                        {{ queueNo }}
                      </p>
                    </div>
                  </div>
                }
                <div class="min-w-0 flex-1">
                  <p class="truncate text-3xl font-bold drop-shadow-sm md:text-4xl">
                    {{ displayName(serving) }}
                  </p>
                  <p class="mt-1 text-sm tracking-wide text-white/65">#{{ serving.orderNo }}</p>
                  <div class="mt-3 flex flex-wrap gap-2">
                    @if (serving.customer?.memberCode; as memberCode) {
                      <span
                        class="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold tracking-wider backdrop-blur-md"
                      >
                        <i class="pi pi-star-fill text-accent text-[0.6rem]"></i>{{ memberCode }}
                      </span>
                    }
                    @if (serving.payLater) {
                      <app-pay-later-tag [inverted]="true" [amount]="outstanding(serving)" />
                    }
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-3 gap-3">
                @for (
                  stat of [
                    {
                      icon: 'pi pi-shopping-bag',
                      label: 'bo.today.statItems',
                      value: i18n.t('member.itemCount', { n: itemCount(serving) }),
                    },
                    {
                      icon: 'pi pi-wallet',
                      label: 'bo.today.statTotal',
                      value: (serving.totalAmount | money: false),
                    },
                    {
                      icon: 'pi pi-clock',
                      label: 'bo.today.statOrderedAt',
                      value: (serving.createdAt | thaiDate: i18n.lang() : 'time'),
                    },
                  ];
                  track stat.icon
                ) {
                  <div
                    class="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 shadow-[inset_0_1px_0_rgb(255_255_255/0.15)] backdrop-blur-md"
                  >
                    <p class="text-xs font-semibold text-white/65">
                      <i class="mr-1 text-[0.7rem]" [class]="stat.icon"></i
                      >{{ i18n.t($any(stat.label)) }}
                    </p>
                    <p class="font-display mt-1 truncate text-xl font-bold tabular-nums">
                      {{ stat.value }}
                    </p>
                  </div>
                }
              </div>
            </section>
            <app-queue-order-panel
              [order]="serving"
              (finished)="onFinished()"
              (itemsUpdated)="onItemsUpdated($event)"
            />
          </div>
        } @else {
          <section
            class="bg-card border-line shadow-soft grid place-items-center rounded-[2rem] border p-10"
          >
            <app-empty-state icon="pi pi-check-circle" [title]="i18n.t('bo.today.noQueue')" />
          </section>
        }

        <app-panel
          [heading]="i18n.t('bo.today.queueTitle', { n: upcoming().length })"
          [subtitle]="i18n.t('bo.today.queueHint')"
        >
          @if (upcoming().length) {
            <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
              @for (order of upcoming(); track order.id) {
                @let tone = cardTones[cardTone(order)];
                <button
                  type="button"
                  class="group relative flex flex-col items-start overflow-hidden rounded-3xl border-2 p-4 text-left transition hover:-translate-y-1 hover:shadow-lg active:scale-[0.98]"
                  [class]="tone.card"
                  (click)="select(order)"
                >
                  <span
                    class="absolute -top-6 -right-6 h-20 w-20 rounded-full transition group-hover:scale-125"
                    [class]="tone.bubble"
                  ></span>
                  <span class="relative flex w-full items-start justify-between gap-2">
                    <span
                      class="font-display text-5xl leading-none font-extrabold"
                      [class]="tone.number"
                      >{{ order.queueNo }}</span
                    >
                    @if (order.payLater) {
                      <app-pay-later-tag />
                    } @else if (order.id === nextUpId()) {
                      <span
                        class="rounded-full bg-white px-2.5 py-1 text-[0.65rem] font-bold tracking-wide text-[#8a6440]"
                        >{{ i18n.t('bo.today.nextUp') }}</span
                      >
                    }
                  </span>
                  <span
                    class="relative mt-2 w-full truncate text-sm font-bold"
                    [class]="tone.title"
                    >{{ displayName(order) }}</span
                  >
                  <span class="relative w-full truncate text-xs" [class]="tone.muted"
                    >#{{ order.orderNo }}</span
                  >
                  <span
                    class="relative mt-3 flex w-full items-center justify-between gap-2 border-t pt-2 text-xs"
                    [class]="tone.footer"
                  >
                    <span class="font-bold tabular-nums" [class]="tone.amount">{{
                      (order.payLater ? outstanding(order) : order.totalAmount) | money: false
                    }}</span>
                    <span class="tabular-nums"
                      ><i class="pi pi-clock mr-1 text-[0.65rem]"></i
                      >{{ order.createdAt | thaiDate: i18n.lang() : 'time' }}</span
                    >
                  </span>
                </button>
              }
            </div>
          } @else {
            <app-empty-state icon="pi pi-inbox" [title]="i18n.t('bo.today.noUpcoming')" />
          }
        </app-panel>
      } @else {
        <app-loading-skeleton variant="list" [count]="5" />
      }

      <app-pos-page
        id="walk-in"
        class="block scroll-mt-24"
        [embedded]="true"
        (orderCreated)="load()"
      />
    </div>
  `,
})
export class TodayPage {
  protected readonly i18n = inject(I18nService);
  protected readonly outstanding = outstandingAmount;
  protected readonly auth = inject(AuthStore);
  private readonly api = inject(OrderApi);
  private readonly confirm = inject(ConfirmService);

  protected readonly crumbs: Crumb[] = [
    { labelKey: 'bo.title', link: '/backoffice' },
    { labelKey: 'bo.nav.today' },
  ];
  protected readonly queueList = signal<OrderResponse[] | null>(null);
  protected readonly selectedId = signal<number | null>(null);

  protected readonly queue = computed(() =>
    [...(this.queueList() ?? [])].sort(
      (a, b) =>
        Number(!!a.payLater) - Number(!!b.payLater) ||
        a.queueNo - b.queueNo ||
        a.createdAt.localeCompare(b.createdAt),
    ),
  );
  protected readonly cardTones = CARD_TONES;
  private readonly now = signal(Date.now());

  protected readonly current = computed(() => {
    const queue = this.queue();
    return (
      queue.find((order) => order.id === this.selectedId()) ??
      queue.find((order) => IN_PROGRESS_STATUSES.includes(order.status)) ??
      queue.find((order) => !order.payLater) ??
      null
    );
  });

  private readonly details = signal<Record<number, OrderResponse>>({});
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private loading = false;
  private failures = 0;
  private destroyed = false;
  private readonly starting = new Set<number>();

  protected readonly currentDetail = computed(() => {
    const current = this.current();
    return current ? (this.details()[current.id] ?? current) : null;
  });

  protected readonly upcoming = computed(() =>
    this.queue().filter((order) => order.id !== this.current()?.id),
  );

  protected readonly nextUpId = computed(
    () => this.upcoming().find((order) => !order.payLater)?.id ?? null,
  );

  constructor() {
    this.load();
    const clock = setInterval(() => this.now.set(Date.now()), 30_000);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        this.load(true);
      } else {
        this.clearPoll();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      clearInterval(clock);
      this.clearPoll();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    });
    effect(() => {
      const current = this.current();
      if (current && !IN_PROGRESS_STATUSES.includes(current.status)) {
        this.startPreparing(current);
      }
    });
    effect(() => {
      const current = this.current();
      if (current && !current.items?.length && !this.details()[current.id]) {
        this.loadDetail(current.id);
      }
    });
  }

  private startPreparing(order: OrderResponse): void {
    if (this.starting.has(order.id)) {
      return;
    }
    this.starting.add(order.id);
    this.api
      .updateStatus(order.id, 'PREPARING')
      .pipe(finalize(() => this.starting.delete(order.id)))
      .subscribe((updated) => this.replaceInQueue(updated));
  }

  private replaceInQueue(order: OrderResponse): void {
    this.queueList.update(
      (queue) =>
        queue?.map((candidate) =>
          candidate.id === order.id ? { ...candidate, ...order } : candidate,
        ) ?? null,
    );
    if (this.details()[order.id]) {
      this.details.update((details) => ({ ...details, [order.id]: order }));
    }
  }

  private loadDetail(id: number): void {
    this.api
      .order(id, { background: true })
      .subscribe((order) => this.details.update((details) => ({ ...details, [id]: order })));
  }

  protected cardTone(order: OrderResponse): CardTone {
    if (order.payLater) {
      return 'debt';
    }
    return order.id === this.nextUpId() ? 'next' : 'normal';
  }

  protected async select(order: OrderResponse): Promise<void> {
    const current = this.current();
    const confirmed = await this.confirm.ask({
      header: this.i18n.t('bo.today.switchTitle', { n: order.queueNo }),
      message: current
        ? this.i18n.t('bo.today.switchMessage', { current: current.queueNo, n: order.queueNo })
        : this.i18n.t('bo.today.switchTitle', { n: order.queueNo }),
      acceptLabel: this.i18n.t('bo.today.switchConfirm'),
      icon: 'pi pi-arrow-right-arrow-left',
    });
    if (!confirmed) {
      return;
    }
    const previous = current && current.status === 'PREPARING' ? current : null;
    this.selectedId.set(order.id);
    if (previous) {
      this.api
        .updateStatus(previous.id, 'PENDING_PAYMENT')
        .subscribe((updated) => this.replaceInQueue(updated));
    }
    if (window.matchMedia('(max-width: 1023px)').matches) {
      document.getElementById('now-serving')?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  protected scrollToPos(): void {
    document.getElementById('walk-in')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  protected onFinished(): void {
    this.selectedId.set(null);
    this.load();
  }

  protected onItemsUpdated(order: OrderResponse): void {
    this.details.update((details) => ({ ...details, [order.id]: order }));
    this.queueList.update(
      (queue) =>
        queue?.map((candidate) =>
          candidate.id === order.id ? { ...candidate, totalAmount: order.totalAmount } : candidate,
        ) ?? null,
    );
  }

  protected displayName(order: OrderResponse): string {
    return (
      order.customer?.nickname ??
      order.customerName ??
      order.guestName ??
      this.i18n.t('bo.walkInGuest')
    );
  }

  protected waitedMinutes(order: OrderResponse): number {
    return Math.max(0, Math.floor((this.now() - Date.parse(order.createdAt)) / 60_000));
  }

  protected itemCount(order: OrderResponse): number {
    return (order.items ?? []).reduce((total, item) => total + item.quantity, 0);
  }

  protected load(background = false): void {
    if (this.loading || this.destroyed) {
      return;
    }
    this.clearPoll();
    this.loading = true;
    this.api
      .orders(
        {
          status: null,
          channel: null,
          queue: true,
          date: toDateKey(new Date()),
          page: 0,
          size: 100,
        },
        { background, silent: background },
      )
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (page) => {
          this.failures = 0;
          this.queueList.set((page.items ?? []).filter(isQueued));
          this.schedulePoll();
        },
        error: () => {
          this.failures++;
          this.queueList.update((queue) => queue ?? []);
          this.schedulePoll();
        },
      });
  }

  private schedulePoll(): void {
    this.clearPoll();
    if (this.destroyed || document.visibilityState === 'hidden') {
      return;
    }
    const delay = this.failures
      ? ERROR_BACKOFF_MS[Math.min(this.failures, ERROR_BACKOFF_MS.length) - 1]
      : REFRESH_MS;
    this.pollTimer = setTimeout(() => {
      this.now.set(Date.now());
      this.load(true);
    }, delay);
  }

  private clearPoll(): void {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }
}
