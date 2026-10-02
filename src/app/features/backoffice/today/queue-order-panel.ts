import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { finalize, forkJoin, of, switchMap } from 'rxjs';

import { OrderResponse } from '../../../core/api/models/order.model';
import { OrderApi } from '../../../core/api/services/order.api';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslationKey } from '../../../core/i18n/translations';
import { Panel } from '../../../shared/components/panel/panel';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { orderSummaryLines } from '../../../shared/utils/order-lines';
import { CancelOrderDialog } from './cancel-order-dialog';
import { SettleConfirmDialog } from './settle-confirm-dialog';

type CounterMethod = 'CASH' | 'TRANSFER';

const METHODS: { code: CounterMethod; labelKey: TranslationKey; icon: string }[] = [
  { code: 'CASH', labelKey: 'bo.today.cash', icon: 'pi pi-wallet' },
  { code: 'TRANSFER', labelKey: 'bo.today.transfer', icon: 'pi pi-building-columns' },
];

@Component({
  selector: 'app-queue-order-panel',
  imports: [ButtonModule, Panel, MoneyPipe, SettleConfirmDialog, CancelOrderDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <app-panel
      [heading]="i18n.t('bo.today.items')"
      [subtitle]="i18n.t('bo.today.itemsOf', { n: order().queueNo, count: itemCount() })"
    >
      <span
        panelActions
        class="bg-accent-soft text-accent font-display rounded-full px-3 py-1 text-sm font-bold"
      >
        #{{ order().orderNo }}
      </span>

      <div class="flex flex-col">
        <ul class="divide-line -mx-1 divide-y overflow-y-auto px-1 lg:max-h-[22rem]">
          @for (line of lines(); track line.key) {
            <li class="flex items-start gap-3 py-3">
              <span
                class="bg-brand-soft text-brand font-display grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-lg font-extrabold"
              >
                {{ line.qty }}
              </span>
              <div class="min-w-0 flex-1">
                <p class="text-ink font-bold">{{ line.name }}</p>
                @if (line.extras) {
                  <p class="text-ink-muted mt-0.5 text-sm">{{ line.extras }}</p>
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

        <div class="border-line mt-3 flex items-baseline justify-between border-t pt-4">
          <span class="text-ink text-lg font-bold">{{ i18n.t('cart.total') }}</span>
          <span class="font-display text-ink text-2xl font-bold tabular-nums">{{
            order().totalAmount | money
          }}</span>
        </div>

        <div class="bg-canvas mt-4 rounded-2xl p-4">
          <p class="text-ink mb-3 font-bold">{{ i18n.t('bo.today.paidWith') }}</p>
          <div class="grid grid-cols-2 gap-3" role="radiogroup">
            @for (method of methods; track method.code) {
              <button
                type="button"
                role="radio"
                class="flex items-center gap-3 rounded-2xl border-2 px-4 py-3.5 text-left transition"
                [class]="
                  selectedMethod() === method.code
                    ? 'border-brand bg-brand-soft text-brand'
                    : 'border-line bg-card text-ink hover:border-brand/40'
                "
                [attr.aria-checked]="selectedMethod() === method.code"
                (click)="selectedMethod.set(method.code)"
              >
                <span
                  class="grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 transition"
                  [class]="
                    selectedMethod() === method.code
                      ? 'border-brand bg-brand text-on-brand'
                      : 'border-line'
                  "
                >
                  @if (selectedMethod() === method.code) {
                    <i class="pi pi-check text-[0.65rem]"></i>
                  }
                </span>
                <i [class]="method.icon" class="text-xl"></i>
                <span class="font-bold">{{ i18n.t(method.labelKey) }}</span>
              </button>
            }
          </div>
          <p-button
            styleClass="mt-4"
            [label]="i18n.t('bo.today.settle')"
            icon="pi pi-check"
            severity="success"
            [rounded]="true"
            size="large"
            [fluid]="true"
            [disabled]="!selectedMethod()"
            [loading]="busy()"
            (onClick)="confirming.set(true)"
          />
          <p-button
            styleClass="mt-2"
            [label]="i18n.t('bo.today.cancel')"
            icon="pi pi-times"
            severity="danger"
            [text]="true"
            [rounded]="true"
            [fluid]="true"
            [disabled]="busy()"
            (onClick)="cancelling.set(true)"
          />
        </div>
      </div>
    </app-panel>

    @if (method(); as chosen) {
      <app-settle-confirm-dialog
        [(visible)]="confirming"
        [queueNo]="order().queueNo"
        [customerName]="displayName()"
        [methodLabel]="i18n.t(chosen.labelKey)"
        [methodIcon]="chosen.icon"
        [amount]="order().totalAmount"
        [busy]="busy()"
        (confirmed)="settle()"
      />
    }

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
  private readonly api = inject(OrderApi);
  private readonly messages = inject(MessageService);

  readonly order = input.required<OrderResponse>();
  readonly finished = output<void>();

  protected readonly methods = METHODS;
  protected readonly selectedMethod = signal<CounterMethod | null>(null);
  protected readonly busy = signal(false);
  protected readonly confirming = signal(false);
  protected readonly cancelling = signal(false);
  protected readonly method = computed(
    () => METHODS.find((option) => option.code === this.selectedMethod()) ?? null,
  );

  protected readonly lines = computed(() => orderSummaryLines(this.order().items, this.i18n));
  protected readonly itemCount = computed(() =>
    this.order().items.reduce((total, item) => total + item.quantity, 0),
  );
  protected readonly displayName = computed(
    () =>
      this.order().customer?.nickname ?? this.order().guestName ?? this.i18n.t('bo.walkInGuest'),
  );
  private readonly orderId = computed(() => this.order().id);

  constructor() {
    effect(() => {
      this.orderId();
      this.selectedMethod.set(null);
      this.confirming.set(false);
      this.cancelling.set(false);
    });
  }

  protected settle(): void {
    const method = this.method();
    if (!method) {
      return;
    }
    const order = this.order();
    this.busy.set(true);
    const pending = order.payments.filter((payment) => payment.status === 'PENDING');
    const matching = pending.filter((payment) => payment.methodCode === method.code);
    const mismatched = pending.filter((payment) => payment.methodCode !== method.code);
    const resolvePending$ = pending.length
      ? forkJoin([
          ...matching.map((payment) => this.api.verifyPayment(payment.id, true, null)),
          ...mismatched.map((payment) =>
            this.api.verifyPayment(payment.id, false, this.i18n.t('bo.today.reasonMethodChanged')),
          ),
        ])
      : of([]);
    resolvePending$
      .pipe(
        switchMap(() => this.api.order(order.id)),
        switchMap((fresh) =>
          fresh.remainingAmount > 0
            ? this.api.addPayment(order.id, {
                methodCode: method.code,
                cashReceived: null,
                referenceNo: null,
              })
            : of(fresh),
        ),
        switchMap(() => this.api.updateStatus(order.id, 'COMPLETED')),
        finalize(() => this.busy.set(false)),
      )
      .subscribe(() => {
        this.confirming.set(false);
        this.messages.add({
          severity: 'success',
          summary: this.i18n.t('bo.today.completed'),
          detail: this.i18n.t('pos.queueIs', { n: order.queueNo }),
        });
        this.finished.emit();
      });
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
