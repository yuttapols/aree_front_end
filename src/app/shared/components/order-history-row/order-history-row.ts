import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { OrderListItem, OrderStatus } from '../../../core/api/models/order.model';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslationKey } from '../../../core/i18n/translations';
import { MoneyPipe } from '../../pipes/money.pipe';
import { ThaiDatePipe } from '../../pipes/thai-date.pipe';

interface StatusLook {
  icon: string;
  accent: string;
  pill: string;
  badge: string;
}

const STATUS_LOOKS: Record<OrderStatus, StatusLook> = {
  PENDING_PAYMENT: {
    icon: 'pi pi-hourglass',
    accent: 'bg-amber-400',
    pill: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    badge: 'from-amber-400 to-accent',
  },
  CONFIRMED: {
    icon: 'pi pi-hourglass',
    accent: 'bg-amber-400',
    pill: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    badge: 'from-amber-400 to-accent',
  },
  PREPARING: {
    icon: 'pi pi-spin pi-cog',
    accent: 'bg-brand',
    pill: 'bg-brand-soft text-brand',
    badge: 'from-brand to-accent',
  },
  READY: {
    icon: 'pi pi-bell',
    accent: 'bg-emerald-500',
    pill: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    badge: 'from-emerald-500 to-teal-500',
  },
  COMPLETED: {
    icon: 'pi pi-check-circle',
    accent: 'bg-emerald-500',
    pill: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
    badge: 'from-brand to-accent',
  },
  CANCELLED: {
    icon: 'pi pi-times-circle',
    accent: 'bg-red-400',
    pill: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',
    badge: 'from-zinc-400 to-zinc-500',
  },
};

const ACTIVE_STATUSES: OrderStatus[] = ['PENDING_PAYMENT', 'CONFIRMED', 'PREPARING', 'READY'];

@Component({
  selector: 'app-order-history-row',
  imports: [RouterLink, MoneyPipe, ThaiDatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <a
      [routerLink]="['/profile/orders', order().orderNo]"
      class="group bg-card hover:shadow-lift relative flex items-center gap-4 overflow-hidden rounded-2xl border p-4 pl-5 transition duration-200 hover:-translate-y-0.5"
      [class.border-line]="!active()"
      [class.border-brand/30]="active()"
      [class.shadow-soft]="active()"
    >
      <span class="absolute inset-y-0 left-0 w-1.5" [class]="look().accent"></span>

      <span
        class="relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-linear-to-br text-white shadow-sm"
        [class]="look().badge"
      >
        <span class="text-center leading-none">
          <span class="block text-[0.6rem] font-semibold tracking-wide text-white/80">{{
            i18n.t('bo.orders.queue')
          }}</span>
          <span class="font-display block text-xl font-extrabold">{{ order().queueNo }}</span>
        </span>
        @if (order().status === 'READY') {
          <span class="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span
              class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"
            ></span>
            <span
              class="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500"
            ></span>
          </span>
        }
      </span>

      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-2">
          <span
            class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold"
            [class]="look().pill"
          >
            <i class="text-[0.7rem]" [class]="look().icon"></i>{{ i18n.t(statusKey()) }}
          </span>
          @if (outstanding() > 0) {
            <span
              class="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600 dark:bg-red-500/10 dark:text-red-400"
            >
              {{ i18n.t('profile.orders.outstanding', { n: (outstanding() | money) }) }}
            </span>
          }
        </div>
        <p class="text-ink font-display mt-1.5 truncate font-bold">#{{ order().orderNo }}</p>
        <p class="text-ink-muted mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span class="inline-flex items-center gap-1">
            <i class="pi pi-clock text-[0.65rem]"></i
            >{{ order().createdAt | thaiDate: i18n.lang() : (showDate() ? 'datetime' : 'time') }}
          </span>
          <span class="inline-flex items-center gap-1">
            <i
              class="text-[0.65rem]"
              [class]="order().channel === 'ONLINE' ? 'pi pi-globe' : 'pi pi-shop'"
            ></i
            >{{
              i18n.t(
                order().channel === 'ONLINE' ? 'status.channel.ONLINE' : 'status.channel.WALK_IN'
              )
            }}
          </span>
        </p>
      </div>

      <div class="flex shrink-0 items-center gap-3">
        <span
          class="font-display text-xl font-extrabold tabular-nums"
          [class]="cancelled() ? 'text-ink-muted line-through' : 'text-ink'"
          >{{ order().totalAmount | money }}</span
        >
        <span
          class="bg-canvas text-ink-muted group-hover:bg-brand group-hover:text-on-brand hidden h-9 w-9 place-items-center rounded-full transition sm:grid"
        >
          <i class="pi pi-angle-right"></i>
        </span>
      </div>
    </a>
  `,
})
export class OrderHistoryRow {
  protected readonly i18n = inject(I18nService);

  readonly order = input.required<OrderListItem>();
  readonly showDate = input(true);

  protected readonly look = computed(() => STATUS_LOOKS[this.order().status]);
  protected readonly statusKey = computed(
    () => `status.order.${this.order().status}` as TranslationKey,
  );
  protected readonly active = computed(() => ACTIVE_STATUSES.includes(this.order().status));
  protected readonly cancelled = computed(() => this.order().status === 'CANCELLED');
  protected readonly outstanding = computed(() =>
    this.active() ? (this.order().remainingAmount ?? 0) : 0,
  );
}
