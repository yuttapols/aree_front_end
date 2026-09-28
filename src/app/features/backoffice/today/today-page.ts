import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';

import { OrderResponse, TodayResponse } from '../../../core/api/models/order.model';
import { OrderApi } from '../../../core/api/services/order.api';
import { AuthStore } from '../../../core/auth/auth.store';
import { I18nService } from '../../../core/i18n/i18n.service';
import { Crumb } from '../../../shared/components/breadcrumbs/breadcrumbs';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { LoadingSkeleton } from '../../../shared/components/loading-skeleton/loading-skeleton';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { Panel } from '../../../shared/components/panel/panel';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { ThaiDatePipe } from '../../../shared/pipes/thai-date.pipe';
import { PosPage } from '../pos/pos-page';
import { QueueOrderPanel } from './queue-order-panel';

const REFRESH_MS = 10_000;

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

      @if (today(); as data) {
        @if (current(); as serving) {
          <div id="now-serving" class="grid scroll-mt-24 gap-5 lg:grid-cols-2">
            <section
              class="bg-royal relative flex flex-col justify-center overflow-hidden rounded-[2rem] p-6 text-white shadow-[0_24px_48px_-24px_rgb(58_20_102/0.7)] md:p-8"
            >
              <i
                class="pi pi-star-fill pointer-events-none absolute -top-10 -right-8 text-[14rem] text-white/5"
              ></i>
              <div class="relative flex flex-wrap items-center gap-6 md:gap-10">
                <div class="text-center">
                  <p class="text-base font-semibold text-white/75">
                    {{ i18n.t('bo.today.nowServing') }}
                  </p>
                  <p
                    class="font-display text-accent text-[7rem] leading-none font-extrabold drop-shadow-lg md:text-[9rem]"
                  >
                    {{ serving.queueNo }}
                  </p>
                </div>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-3xl font-bold md:text-4xl">{{ displayName(serving) }}</p>
                  @if (serving.memberCode) {
                    <span
                      class="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold tracking-wider"
                    >
                      <i class="pi pi-star-fill text-accent text-[0.6rem]"></i
                      >{{ serving.memberCode }}
                    </span>
                  }
                  <p class="mt-3 text-lg text-white/85">#{{ serving.orderNo }}</p>
                  <p class="text-sm text-white/70">
                    {{ i18n.t('member.itemCount', { n: itemCount(serving) }) }} ·
                    {{ serving.totalAmount | money }} ·
                    {{ serving.createdAt | thaiDate: i18n.lang() : 'time' }}
                  </p>
                </div>
              </div>
            </section>
            <app-queue-order-panel [order]="serving" (finished)="onFinished()" />
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
                <button
                  type="button"
                  class="bg-card border-line hover:border-brand/40 flex flex-col items-start rounded-3xl border-2 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md"
                  (click)="select(order)"
                >
                  <span class="font-display text-accent text-5xl leading-none font-extrabold">{{
                    order.queueNo
                  }}</span>
                  <span class="text-ink mt-2 w-full truncate text-sm font-bold">{{
                    displayName(order)
                  }}</span>
                  <span class="text-ink-muted w-full truncate text-xs">#{{ order.orderNo }}</span>
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
  protected readonly auth = inject(AuthStore);
  private readonly api = inject(OrderApi);

  protected readonly crumbs: Crumb[] = [
    { labelKey: 'bo.title', link: '/backoffice' },
    { labelKey: 'bo.nav.today' },
  ];
  protected readonly today = signal<TodayResponse | null>(null);
  protected readonly selectedId = signal<number | null>(null);

  protected readonly queue = computed(() =>
    (this.today()?.queue ?? []).filter((order) => order.status === 'PENDING_PAYMENT'),
  );

  protected readonly current = computed(() => {
    const queue = this.queue();
    return queue.find((order) => order.id === this.selectedId()) ?? queue[0] ?? null;
  });

  protected readonly upcoming = computed(() =>
    this.queue().filter((order) => order.id !== this.current()?.id),
  );

  constructor() {
    this.load();
    const timer = setInterval(() => this.load(), REFRESH_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  protected select(order: OrderResponse): void {
    this.selectedId.set(order.id);
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

  protected displayName(order: OrderResponse): string {
    return order.customerFullName ?? order.customerName ?? this.i18n.t('bo.walkInGuest');
  }

  protected itemCount(order: OrderResponse): number {
    return order.items.reduce((total, item) => total + item.quantity, 0);
  }

  protected load(): void {
    this.api.today().subscribe((today) => this.today.set(today));
  }
}
