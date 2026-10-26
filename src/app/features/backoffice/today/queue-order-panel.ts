import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { MessageService } from 'primeng/api';
import { TooltipModule } from 'primeng/tooltip';
import { finalize, of, switchMap } from 'rxjs';

import { OrderResponse } from '../../../core/api/models/order.model';
import { OrderApi } from '../../../core/api/services/order.api';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslationKey } from '../../../core/i18n/translations';
import { Panel } from '../../../shared/components/panel/panel';
import { PayLaterTag } from '../../../shared/components/pay-later-tag/pay-later-tag';
import { outstandingAmount } from '../../../shared/utils/price';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { OrderLinesService } from '../../../shared/services/order-lines.service';
import { formatMoney } from '../../../shared/utils/format';
import { CancelOrderDialog } from './cancel-order-dialog';
import { CashPaymentDialog } from './cash-payment-dialog';
import { EditOrderItemsDialog } from './edit-order-items-dialog';
import { SettleConfirmDialog } from './settle-confirm-dialog';
import { LineExtras } from '../../../shared/components/line-extras/line-extras';

type CounterMethod = 'CASH' | 'TRANSFER' | 'PAY_LATER';

const METHODS: { code: CounterMethod; labelKey: TranslationKey; icon: string }[] = [
  { code: 'CASH', labelKey: 'bo.today.cash', icon: 'pi pi-wallet' },
  { code: 'TRANSFER', labelKey: 'bo.today.transfer', icon: 'pi pi-building-columns' },
];

const PAY_LATER_METHOD = {
  code: 'PAY_LATER' as CounterMethod,
  labelKey: 'pos.payLater' as TranslationKey,
  icon: 'pi pi-clock',
};

const EDITABLE_STATUSES = ['PENDING_PAYMENT', 'CONFIRMED'];
const PAY_LATER_STATUSES = ['PENDING_PAYMENT', 'PREPARING'];

@Component({
  selector: 'app-queue-order-panel',
  imports: [
    TooltipModule,
    LineExtras,
    Panel,
    MoneyPipe,
    SettleConfirmDialog,
    CancelOrderDialog,
    EditOrderItemsDialog,
    CashPaymentDialog,
    PayLaterTag,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full' },
  template: `
    <app-panel
      class="h-full"
      [heading]="i18n.t('bo.today.items')"
      [subtitle]="i18n.t('bo.today.itemsOf', { n: order().queueNo, count: itemCount() })"
    >
      <div panelActions class="flex flex-wrap items-center justify-end gap-2">
        @if (order().payLater) {
          <app-pay-later-tag [amount]="outstanding(order())" />
        }
        <span
          class="bg-accent-soft text-accent font-display rounded-full px-3 py-1 text-sm font-bold"
        >
          #{{ order().orderNo }}
        </span>
        <span
          [pTooltip]="editBlockReason() ? i18n.t(editBlockReason()!) : ''"
          tooltipPosition="bottom"
        >
          <button
            type="button"
            class="border-brand text-brand hover:bg-brand-soft inline-flex items-center gap-2 rounded-full border-2 px-4 py-2 font-bold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            [disabled]="busy() || !!editBlockReason()"
            (click)="editingItems.set(true)"
          >
            <i class="pi pi-pencil"></i>{{ i18n.t('bo.today.editItems') }}
          </button>
        </span>
      </div>

      <div class="flex flex-1 flex-col">
        <ul class="divide-line -mx-1 mb-3 divide-y overflow-y-auto px-1 lg:max-h-[22rem]">
          @for (line of lines(); track line.key) {
            <li class="flex items-start gap-3 py-3">
              <span
                class="bg-brand-soft text-brand font-display grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-lg font-extrabold"
              >
                {{ $index + 1 }}
              </span>
              <div class="min-w-0 flex-1">
                <p class="text-ink font-bold">
                  {{ line.name }} <span class="text-brand tabular-nums">×{{ line.qty }}</span>
                </p>
                @if (line.extras || line.omitted.length) {
                  <p class="text-ink-muted mt-0.5 text-sm"><app-line-extras [line]="line" /></p>
                }
                @if (line.note) {
                  <p class="text-accent mt-0.5 text-sm font-semibold">
                    <i class="pi pi-comment mr-1 text-xs"></i>{{ line.note }}
                  </p>
                }
              </div>
              <span class="text-ink-muted text-sm tabular-nums">{{
                line.total | money: false
              }}</span>
            </li>
          }
        </ul>

        @if (order().note) {
          <p class="bg-accent-soft text-accent mt-3 rounded-xl px-3 py-2 text-sm font-semibold">
            <i class="pi pi-comment mr-1"></i>{{ order().note }}
          </p>
        }

        <div class="border-line mt-auto flex items-baseline justify-between border-t pt-4">
          <span class="text-ink text-lg font-bold">{{ i18n.t('cart.total') }}</span>
          <span class="font-display text-ink text-2xl font-bold tabular-nums">{{
            order().totalAmount | money
          }}</span>
        </div>

        @if (order().status === 'READY') {
          <p
            class="animate-pop mt-4 flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
          >
            <i class="pi pi-bell"></i>{{ i18n.t('bo.today.readyWaiting') }}
          </p>
        }
        <div class="mt-4">
          <p class="text-ink-muted mb-2 text-sm font-semibold">{{ i18n.t('bo.today.paidWith') }}</p>
          <div class="grid auto-cols-fr grid-flow-col gap-2" role="radiogroup">
            @for (method of methods(); track method.code) {
              @let danger = method.code === 'PAY_LATER';
              <button
                type="button"
                role="radio"
                class="flex items-center justify-center gap-2 rounded-xl border-2 px-2 py-2.5 transition"
                [class]="
                  selectedMethod() === method.code
                    ? danger
                      ? 'border-red-500 bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'
                      : 'border-brand bg-brand-soft text-brand'
                    : danger
                      ? 'border-line bg-card text-ink hover:border-red-300'
                      : 'border-line bg-card text-ink hover:border-brand/40'
                "
                [attr.aria-checked]="selectedMethod() === method.code"
                (click)="selectedMethod.set(method.code)"
              >
                <i [class]="method.icon" class="text-lg"></i>
                <span class="text-sm font-bold">{{ i18n.t(method.labelKey) }}</span>
              </button>
            }
          </div>
          <div class="mt-3 flex gap-3">
            @if (order().status !== 'READY') {
              <button
                type="button"
                class="flex w-20 shrink-0 items-center justify-center rounded-2xl border-2 border-red-500 bg-card text-red-600 transition hover:bg-red-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-500/10"
                [disabled]="busy()"
                (click)="cancelling.set(true)"
                [attr.aria-label]="i18n.t('bo.today.cancel')"
                [title]="i18n.t('bo.today.cancel')"
              >
                <i class="pi pi-trash text-2xl"></i>
              </button>
            }
            @if (selectedMethod() === 'PAY_LATER') {
              <button
                type="button"
                class="flex min-h-20 flex-1 items-center justify-center gap-3 rounded-2xl bg-red-500 text-2xl font-bold text-white shadow-lg shadow-red-500/30 transition hover:bg-red-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                [disabled]="busy() || !!order().payLater"
                (click)="payLater()"
              >
                <i
                  class="pi text-2xl"
                  [class.pi-send]="!busy()"
                  [class.pi-spinner]="busy()"
                  [class.pi-spin]="busy()"
                ></i>
                {{ i18n.t('pos.addPayLater') }}
              </button>
            } @else {
              <button
                type="button"
                class="flex min-h-20 flex-1 items-center justify-center gap-3 rounded-2xl bg-green-500 text-2xl font-bold text-white shadow-lg shadow-green-500/30 transition hover:bg-green-600 active:scale-95 disabled:cursor-not-allowed disabled:bg-green-500/40 disabled:shadow-none"
                [disabled]="!selectedMethod() || busy()"
                (click)="openSettle()"
              >
                <i
                  class="pi text-2xl"
                  [class.pi-check-circle]="!busy()"
                  [class.pi-spinner]="busy()"
                  [class.pi-spin]="busy()"
                ></i>
                {{ i18n.t('bo.today.settle') }}
              </button>
            }
          </div>
        </div>
      </div>
    </app-panel>

    <app-cash-payment-dialog
      [(visible)]="payingCash"
      [amount]="outstanding(order())"
      [queueNo]="order().queueNo"
      [itemCount]="itemCount()"
      [busy]="busy()"
      (confirmed)="settle($event)"
    />

    @if (method(); as chosen) {
      <app-settle-confirm-dialog
        [(visible)]="confirming"
        [queueNo]="order().queueNo"
        [customerName]="displayName()"
        [methodLabel]="i18n.t(chosen.labelKey)"
        [methodIcon]="chosen.icon"
        [amount]="outstanding(order())"
        [busy]="busy()"
        (confirmed)="settle(null)"
      />
    }

    <app-edit-order-items-dialog
      [(visible)]="editingItems"
      [order]="order()"
      (updated)="itemsUpdated.emit($event)"
    />
    <app-cancel-order-dialog
      [(visible)]="cancelling"
      [queueNo]="order().queueNo"
      [customerName]="displayName()"
      [amount]="order().totalAmount"
      [busy]="busy()"
      (confirmed)="cancel($event)"
    />
  `,
})
export class QueueOrderPanel {
  protected readonly i18n = inject(I18nService);
  protected readonly outstanding = outstandingAmount;
  private readonly orderLines = inject(OrderLinesService);
  private readonly confirm = inject(ConfirmService);
  private readonly api = inject(OrderApi);
  private readonly messages = inject(MessageService);

  readonly order = input.required<OrderResponse>();
  readonly finished = output<void>();
  readonly itemsUpdated = output<OrderResponse>();

  protected readonly methods = computed(() =>
    PAY_LATER_STATUSES.includes(this.order().status) || this.order().payLater
      ? [...METHODS, PAY_LATER_METHOD]
      : METHODS,
  );
  protected readonly editBlockReason = computed<TranslationKey | null>(() => {
    const order = this.order();
    const items = order.items ?? [];
    if (order.payLater) {
      return 'bo.editItems.blockedPayLater';
    }
    if (order.channel !== 'WALK_IN') {
      return 'bo.editItems.blockedOnline';
    }
    if (!EDITABLE_STATUSES.includes(order.status)) {
      return 'bo.editItems.blockedStatus';
    }
    if (order.pointsRedeemed > 0) {
      return 'bo.editItems.blockedPoints';
    }
    if (!items.length || items.some((item) => item.id == null)) {
      return 'bo.editItems.blockedLoading';
    }
    return null;
  });
  protected readonly selectedMethod = signal<CounterMethod | null>(null);
  private readonly pendingMethodCode = computed(
    () =>
      [...(this.order().payments ?? [])]
        .filter((payment) => payment.status === 'PENDING')
        .sort((a, b) => b.id - a.id)[0]?.methodCode ?? null,
  );
  protected readonly busy = signal(false);
  protected readonly confirming = signal(false);
  protected readonly payingCash = signal(false);
  protected readonly cancelling = signal(false);
  protected readonly editingItems = signal(false);
  protected readonly method = computed(
    () =>
      METHODS.find(
        (option) => option.code === this.selectedMethod() && option.code !== 'PAY_LATER',
      ) ?? null,
  );

  protected readonly lines = computed(() => this.orderLines.summarize(this.order().items ?? []));
  protected readonly itemCount = computed(() =>
    (this.order().items ?? []).reduce((total, item) => total + item.quantity, 0),
  );
  protected readonly displayName = computed(
    () =>
      this.order().customer?.nickname ??
      this.order().customerName ??
      this.order().guestName ??
      this.i18n.t('bo.walkInGuest'),
  );
  private readonly orderId = computed(() => this.order().id);

  constructor() {
    effect(() => {
      this.orderId();
      this.pendingMethodCode();
      this.order().payLater;
      this.selectedMethod.set(untracked(() => this.initialMethod()));
      this.confirming.set(false);
      this.cancelling.set(false);
    });
  }

  private initialMethod(): CounterMethod | null {
    if (this.order().payLater) {
      return 'PAY_LATER';
    }
    const pending = this.pendingMethodCode();
    return METHODS.find((option) => option.code === pending)?.code ?? null;
  }

  protected async payLater(): Promise<void> {
    const order = this.order();
    const confirmed = await this.confirm.ask({
      header: this.i18n.t('bo.today.payLaterTitle', { n: order.queueNo }),
      message: this.i18n.t('bo.today.payLaterMessage', { amount: formatMoney(order.totalAmount) }),
      acceptLabel: this.i18n.t('pos.addPayLater'),
      danger: true,
      icon: 'pi pi-clock',
    });
    if (!confirmed) {
      return;
    }
    this.busy.set(true);
    const waiting$ =
      order.status === 'PREPARING' ? this.api.updateStatus(order.id, 'PENDING_PAYMENT') : of(order);
    waiting$
      .pipe(
        switchMap(() => this.api.markPayLater(order.id)),
        finalize(() => this.busy.set(false)),
      )
      .subscribe(() => {
        this.messages.add({
          severity: 'warn',
          summary: this.i18n.t('bo.today.payLaterDone', { n: order.queueNo }),
        });
        this.finished.emit();
      });
  }

  protected openSettle(): void {
    if (this.selectedMethod() === 'CASH') {
      this.payingCash.set(true);
    } else {
      this.confirming.set(true);
    }
  }

  protected settle(cashReceived: number | null): void {
    const method = this.method();
    if (!method) {
      return;
    }
    const order = this.order();
    this.busy.set(true);
    const usesCustomerChoice = method.code === this.pendingMethodCode() && cashReceived === null;
    const payment =
      order.remainingAmount > 0 && !usesCustomerChoice
        ? { methodCode: method.code, cashReceived, referenceNo: null }
        : undefined;
    const ready$ = order.status === 'READY' ? of(order) : this.readyFrom(order);
    ready$
      .pipe(
        switchMap(() => this.api.complete(order.id, payment)),
        finalize(() => this.busy.set(false)),
      )
      .subscribe(() => {
        this.confirming.set(false);
        this.payingCash.set(false);
        this.messages.add({
          severity: 'success',
          summary: this.i18n.t('bo.today.completed'),
          detail: this.i18n.t('pos.queueIs', { n: order.queueNo }),
        });
        this.finished.emit();
      });
  }

  private readyFrom(order: OrderResponse) {
    const preparing$ =
      order.status === 'PREPARING' ? of(order) : this.api.updateStatus(order.id, 'PREPARING');
    return preparing$.pipe(switchMap(() => this.api.updateStatus(order.id, 'READY')));
  }

  protected cancel(reason: string): void {
    const order = this.order();
    this.busy.set(true);
    this.api
      .cancel(order.id, reason)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe(() => {
        this.cancelling.set(false);
        this.messages.add({
          severity: 'info',
          summary: this.i18n.t('bo.orders.cancelled'),
          detail: this.i18n.t('pos.queueIs', { n: order.queueNo }),
        });
        this.finished.emit();
      });
  }
}
