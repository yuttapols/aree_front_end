import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';

import { OrderResponse, OrderStatus } from '../../../core/api/models/order.model';
import { OrderApi } from '../../../core/api/services/order.api';
import { I18nService } from '../../../core/i18n/i18n.service';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { toDateKey } from '../../../shared/utils/format';

const REFRESH_MS = 5000;
const WAITING_STATUSES: OrderStatus[] = ['PENDING_PAYMENT', 'CONFIRMED', 'PREPARING'];

@Component({
  selector: 'app-queue-board-page',
  imports: [PageHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header
      [title]="i18n.t('bo.queueBoard.title')"
      [crumbs]="[{ labelKey: 'bo.nav.queueBoard' }]"
    />
    <div class="px-4 py-6 md:px-8">
      @if (failed()) {
        <p
          role="alert"
          class="mb-4 flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-500/15 dark:text-red-300"
        >
          <i class="pi pi-exclamation-circle" aria-hidden="true"></i>
          {{ i18n.t('bo.queueBoard.loadError') }}
        </p>
      }
      <div class="grid gap-6 lg:grid-cols-2" aria-live="polite">
        <section class="bg-card border-line shadow-soft overflow-hidden rounded-3xl border">
          <header class="bg-royal flex items-center justify-between px-6 py-4 text-white">
            <h2 class="font-display flex items-center gap-2 text-2xl font-extrabold">
              <i class="pi pi-clock" aria-hidden="true"></i>{{ i18n.t('bo.queueBoard.preparing') }}
            </h2>
            <span class="rounded-full bg-white/15 px-3 py-1 text-lg font-bold tabular-nums">{{
              waiting().length
            }}</span>
          </header>
          <ul class="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3">
            @for (order of waiting(); track order.id) {
              <li
                class="bg-canvas border-line flex flex-col items-center rounded-2xl border px-3 py-4 text-center"
              >
                <span class="font-display text-brand text-5xl font-extrabold tabular-nums">{{
                  order.queueNo
                }}</span>
                <span class="text-ink-muted mt-1 w-full truncate text-sm">{{ name(order) }}</span>
              </li>
            } @empty {
              <li class="text-ink-muted col-span-full py-10 text-center">
                {{ i18n.t('bo.queueBoard.empty') }}
              </li>
            }
          </ul>
        </section>

        <section
          class="bg-card overflow-hidden rounded-3xl border border-emerald-300 shadow-soft dark:border-emerald-500/40"
        >
          <header class="flex items-center justify-between bg-emerald-600 px-6 py-4 text-white">
            <h2 class="font-display flex items-center gap-2 text-2xl font-extrabold">
              <i class="pi pi-check-circle" aria-hidden="true"></i
              >{{ i18n.t('bo.queueBoard.ready') }}
            </h2>
            <span class="rounded-full bg-white/15 px-3 py-1 text-lg font-bold tabular-nums">{{
              ready().length
            }}</span>
          </header>
          <ul class="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3">
            @for (order of ready(); track order.id) {
              <li
                class="animate-pop flex flex-col items-center rounded-2xl bg-emerald-50 px-3 py-4 text-center dark:bg-emerald-500/15"
              >
                <span
                  class="font-display text-5xl font-extrabold text-emerald-700 tabular-nums dark:text-emerald-300"
                  >{{ order.queueNo }}</span
                >
                <span class="text-ink-muted mt-1 w-full truncate text-sm">{{ name(order) }}</span>
              </li>
            } @empty {
              <li class="text-ink-muted col-span-full py-10 text-center">
                {{ i18n.t('bo.queueBoard.empty') }}
              </li>
            }
          </ul>
        </section>
      </div>
    </div>
  `,
})
export class QueueBoardPage {
  protected readonly i18n = inject(I18nService);
  private readonly api = inject(OrderApi);

  private readonly orders = signal<OrderResponse[]>([]);
  protected readonly failed = signal(false);

  private readonly sorted = computed(() =>
    [...this.orders()].sort((a, b) => a.queueNo - b.queueNo),
  );
  protected readonly waiting = computed(() =>
    this.sorted().filter((order) => WAITING_STATUSES.includes(order.status)),
  );
  protected readonly ready = computed(() =>
    this.sorted().filter((order) => order.status === 'READY'),
  );

  constructor() {
    this.load(false);
    const timer = setInterval(() => this.load(true), REFRESH_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  protected name(order: OrderResponse): string {
    return (
      order.customer?.nickname ??
      order.customerName ??
      order.guestName ??
      this.i18n.t('bo.walkInGuest')
    );
  }

  private load(background: boolean): void {
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
        { background: true, silent: background },
      )
      .subscribe({
        next: (page) => {
          this.failed.set(false);
          this.orders.set(page.items ?? []);
        },
        error: () => this.failed.set(true),
      });
  }
}
