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
import { DialogModule } from 'primeng/dialog';
import { finalize } from 'rxjs';

import { OrderResponse } from '../../../core/api/models/order.model';
import { OrderApi } from '../../../core/api/services/order.api';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslationKey } from '../../../core/i18n/translations';
import { OrderSummary } from '../../../shared/components/order-summary/order-summary';
import { StatusTag } from '../../../shared/components/status-tag/status-tag';
import { orderSummaryLines } from '../../../shared/utils/order-lines';

type CounterMethod = 'CASH' | 'TRANSFER';

const METHODS: { code: CounterMethod; labelKey: TranslationKey; icon: string }[] = [
  { code: 'CASH', labelKey: 'bo.today.cash', icon: 'pi pi-wallet' },
  { code: 'TRANSFER', labelKey: 'bo.today.transfer', icon: 'pi pi-building-columns' },
];

@Component({
  selector: 'app-queue-order-dialog',
  imports: [ButtonModule, DialogModule, OrderSummary, StatusTag],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-dialog
      [visible]="order() !== null"
      (visibleChange)="!$event && closed.emit()"
      [modal]="true"
      [draggable]="false"
      [dismissableMask]="true"
      [breakpoints]="{ '768px': '96vw' }"
      [style]="{ width: '40rem' }"
      [showHeader]="false"
      contentStyleClass="!p-0"
    >
      @if (order(); as current) {
        <header class="bg-royal relative overflow-hidden px-6 py-5 text-white">
          <i
            class="pi pi-star-fill pointer-events-none absolute -top-6 -right-4 text-[7rem] text-white/10"
          ></i>
          <button
            type="button"
            class="absolute top-4 right-4 grid h-9 w-9 place-items-center rounded-full bg-white/15 transition hover:bg-white/25"
            [attr.aria-label]="i18n.t('common.close')"
            (click)="closed.emit()"
          >
            <i class="pi pi-times text-sm"></i>
          </button>
          <div class="relative flex items-center gap-5">
            <div class="text-center">
              <p class="text-[0.7rem] tracking-widest text-white/70 uppercase">
                {{ i18n.t('bo.orders.queue') }}
              </p>
              <p class="font-display text-accent text-6xl leading-none font-extrabold">
                {{ current.queueNo }}
              </p>
            </div>
            <div class="min-w-0">
              <p class="truncate text-xl font-bold">
                {{ current.customerFullName ?? current.customerName ?? i18n.t('bo.walkInGuest') }}
              </p>
              <p class="text-sm text-white/75">
                #{{ current.orderNo }}
                @if (current.memberCode) {
                  · {{ current.memberCode }}
                }
              </p>
              <div class="mt-2 flex flex-wrap gap-1.5">
                <app-status-tag kind="channel" [value]="current.channel" />
              </div>
            </div>
          </div>
        </header>

        <div class="px-6 py-5">
          <app-order-summary
            [lines]="lines()"
            [subtotal]="current.subtotal"
            [total]="current.totalAmount"
            [promotions]="current.appliedPromotions"
            [pointDiscount]="current.pointDiscount"
            [pointsRedeemed]="current.pointsRedeemed"
            [pointsToEarn]="current.pointsToEarn"
          />
          @if (current.note) {
            <p class="bg-accent-soft text-accent mt-4 rounded-xl px-3 py-2 text-sm font-semibold">
              <i class="pi pi-comment mr-1"></i>{{ current.note }}
            </p>
          }
        </div>

        <footer class="bg-canvas border-line border-t px-6 py-5">
          @if (current.status === 'COMPLETED' || current.status === 'CANCELLED') {
            <p class="text-ink-muted text-center text-sm">{{ i18n.t('bo.today.closed') }}</p>
          } @else {
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
              (onClick)="settle(current)"
            />
          }
        </footer>
      }
    </p-dialog>
  `,
})
export class QueueOrderDialog {
  protected readonly i18n = inject(I18nService);
  private readonly api = inject(OrderApi);
  private readonly messages = inject(MessageService);

  readonly order = input<OrderResponse | null>(null);
  readonly changed = output<OrderResponse | null>();
  readonly closed = output<void>();

  protected readonly methods = METHODS;
  protected readonly selectedMethod = signal<CounterMethod | null>(null);
  protected readonly busy = signal(false);

  protected readonly lines = computed(() =>
    orderSummaryLines(this.order()?.items ?? [], this.i18n),
  );
  private readonly orderId = computed(() => this.order()?.id ?? null);

  constructor() {
    effect(() => {
      this.orderId();
      this.selectedMethod.set(null);
    });
  }

  protected settle(order: OrderResponse): void {
    const method = this.selectedMethod();
    if (!method) {
      return;
    }
    this.busy.set(true);
    this.api
      .settle(order.id, method)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe(() => {
        this.messages.add({
          severity: 'success',
          summary: this.i18n.t('bo.today.completed'),
          detail: this.i18n.t('pos.queueIs', { n: order.queueNo }),
        });
        this.changed.emit(null);
      });
  }
}
