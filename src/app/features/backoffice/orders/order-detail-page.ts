import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TextareaModule } from 'primeng/textarea';
import { catchError, finalize, of } from 'rxjs';

import { OrderResponse, OrderStatus } from '../../../core/api/models/order.model';
import { OrderApi } from '../../../core/api/services/order.api';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslationKey } from '../../../core/i18n/translations';
import { Crumb } from '../../../shared/components/breadcrumbs/breadcrumbs';
import { LoadingSkeleton } from '../../../shared/components/loading-skeleton/loading-skeleton';
import { OrderSummary } from '../../../shared/components/order-summary/order-summary';
import { OrderTimeline } from '../../../shared/components/order-timeline/order-timeline';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { Panel } from '../../../shared/components/panel/panel';
import { ReceiptDialog } from '../../../shared/components/receipt-dialog/receipt-dialog';
import { ReceivePaymentDialog } from '../../../shared/components/receive-payment-dialog/receive-payment-dialog';
import { StatusTag } from '../../../shared/components/status-tag/status-tag';
import { SummaryRow } from '../../../shared/components/summary-row/summary-row';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { ThaiDatePipe } from '../../../shared/pipes/thai-date.pipe';
import { formatPhone } from '../../../shared/utils/format';
import { orderSummaryLines } from '../../../shared/utils/order-lines';

const NEXT_STATUS: Partial<
  Record<OrderStatus, { status: OrderStatus; labelKey: TranslationKey; icon: string }>
> = {
  CONFIRMED: { status: 'PREPARING', labelKey: 'kitchen.start', icon: 'pi pi-play' },
  PREPARING: { status: 'READY', labelKey: 'kitchen.ready', icon: 'pi pi-bell' },
  READY: { status: 'COMPLETED', labelKey: 'kitchen.pickedUp', icon: 'pi pi-check' },
};

@Component({
  selector: 'app-order-detail-page',
  imports: [
    FormsModule,
    RouterLink,
    ButtonModule,
    DialogModule,
    TextareaModule,
    LoadingSkeleton,
    OrderSummary,
    OrderTimeline,
    PageHeader,
    Panel,
    ReceiptDialog,
    ReceivePaymentDialog,
    StatusTag,
    SummaryRow,
    MoneyPipe,
    ThaiDatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header [title]="i18n.t('bo.orders.detail')" [crumbs]="crumbs" />

    <div class="px-4 py-6 md:px-8">
      @if (order(); as current) {
        <div class="grid items-start gap-5 xl:grid-cols-[1fr_22rem]">
          <div class="flex flex-col gap-5">
            <app-panel
              [heading]="'#' + current.orderNo"
              [subtitle]="current.createdAt | thaiDate: i18n.lang() : 'datetime'"
            >
              <div panelActions class="flex flex-wrap items-center gap-2">
                <app-status-tag kind="channel" [value]="current.channel" />
                <app-status-tag kind="order" [value]="current.status" />
              </div>
              <div class="mb-4 flex flex-wrap gap-2">
                @if (next(); as action) {
                  <p-button
                    [label]="i18n.t(action.labelKey)"
                    [icon]="action.icon"
                    [rounded]="true"
                    [loading]="busy()"
                    (onClick)="advance(action.status)"
                  />
                }
                @if (current.status === 'PENDING_PAYMENT') {
                  <p-button
                    [label]="i18n.t('pos.receivePayment')"
                    icon="pi pi-wallet"
                    [rounded]="true"
                    (onClick)="paying.set(current)"
                  />
                }
                @if (current.status === 'PENDING_PAYMENT' || current.status === 'CONFIRMED') {
                  <p-button
                    [label]="i18n.t('bo.orders.cancel')"
                    icon="pi pi-times"
                    severity="danger"
                    [outlined]="true"
                    [rounded]="true"
                    (onClick)="cancelOpen.set(true)"
                  />
                }
                <p-button
                  [label]="i18n.t('receipt.print')"
                  icon="pi pi-print"
                  severity="secondary"
                  [outlined]="true"
                  [rounded]="true"
                  (onClick)="receiptId.set(current.id)"
                />
              </div>
              <app-order-summary
                [lines]="lines()"
                [subtotal]="current.subtotal"
                [total]="current.totalAmount"
                [promotions]="current.appliedPromotions"
                [pointDiscount]="current.pointDiscount"
                [pointsRedeemed]="current.pointsRedeemed"
                [pointsToEarn]="current.pointsEarned || current.pointsToEarn"
              />
              @if (current.note) {
                <p class="bg-accent-soft text-accent mt-4 rounded-xl px-3 py-2 text-sm">
                  <i class="pi pi-comment mr-1"></i>{{ current.note }}
                </p>
              }
              @if (current.cancelReason) {
                <p class="mt-4 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-500">
                  {{ i18n.t('bo.orders.cancelReason') }}: {{ current.cancelReason }}
                </p>
              }
            </app-panel>

            <app-panel
              [heading]="i18n.t('bo.orders.payments')"
              [subtitle]="
                i18n.t('bo.orders.paidOf', {
                  paid: (current.paidAmount | money),
                  total: (current.totalAmount | money),
                })
              "
            >
              @if (current.payments.length) {
                <ul class="divide-line divide-y">
                  @for (payment of current.payments; track payment.id) {
                    <li class="flex flex-wrap items-center gap-3 py-3">
                      @if (payment.hasSlip) {
                        <button
                          type="button"
                          class="bg-card-muted border-line grid h-14 w-10 shrink-0 place-items-center rounded-lg border"
                          [disabled]="loadingSlip() === payment.id"
                          (click)="viewSlip(payment.id)"
                        >
                          <i class="pi pi-image text-ink-muted"></i>
                        </button>
                      }
                      <div class="min-w-0 flex-1 text-sm">
                        <p class="text-ink font-semibold">
                          {{ i18n.pick(payment.methodName, payment.methodNameEn) }} ·
                          {{ payment.amount | money }}
                        </p>
                        <p class="text-ink-muted text-xs">
                          {{ payment.createdAt | thaiDate: i18n.lang() : 'datetime' }}
                          @if (payment.referenceNo) {
                            · {{ payment.referenceNo }}
                          }
                          @if (payment.changeAmount) {
                            · {{ i18n.t('pos.change') }} {{ payment.changeAmount | money }}
                          }
                          @if (payment.verifiedBy) {
                            · {{ payment.verifiedBy }}
                          }
                        </p>
                        @if (payment.rejectReason) {
                          <p class="text-xs text-red-500">{{ payment.rejectReason }}</p>
                        }
                      </div>
                      <app-status-tag kind="payment" [value]="payment.status" />
                    </li>
                  }
                </ul>
              } @else {
                <p class="text-ink-muted text-sm">{{ i18n.t('bo.orders.noPayments') }}</p>
              }
            </app-panel>
          </div>

          <div class="flex flex-col gap-5">
            <app-panel [heading]="i18n.t('bo.orders.customer')">
              <div class="flex flex-col gap-3">
                <app-summary-row
                  [label]="i18n.t('checkout.recipient')"
                  [value]="
                    current.customer?.nickname ?? current.guestName ?? i18n.t('bo.walkInGuest')
                  "
                />
                @if (current.guestPhone) {
                  <app-summary-row
                    [label]="i18n.t('register.phone')"
                    [value]="phone(current.guestPhone) || '-'"
                  />
                }
                @if (current.customer?.memberCode; as memberCode) {
                  <app-summary-row
                    [label]="i18n.t('bo.customers.memberCode')"
                    [value]="memberCode"
                  />
                  <a
                    [routerLink]="['/backoffice/customers', current.customer?.id]"
                    class="text-brand text-sm font-semibold hover:underline"
                  >
                    {{ i18n.t('bo.customers.view') }}
                  </a>
                }
                <app-summary-row [label]="i18n.t('success.queue')" [value]="'' + current.queueNo" />
              </div>
            </app-panel>
            <app-panel [heading]="i18n.t('track.timeline')">
              <app-order-timeline [order]="current" />
            </app-panel>
          </div>
        </div>
      } @else {
        <app-loading-skeleton variant="list" [count]="5" />
      }
    </div>

    <p-dialog
      [visible]="cancelOpen()"
      (visibleChange)="cancelOpen.set($event)"
      [modal]="true"
      [draggable]="false"
      [header]="i18n.t('bo.orders.cancel')"
      [style]="{ width: '26rem' }"
      [breakpoints]="{ '640px': '94vw' }"
    >
      <label class="text-ink mb-2 block text-sm font-semibold" for="cancel-reason"
        >{{ i18n.t('bo.orders.cancelReason') }} *</label
      >
      <textarea
        pTextarea
        id="cancel-reason"
        rows="3"
        class="w-full rounded-xl"
        [ngModel]="cancelReason()"
        (ngModelChange)="cancelReason.set($event)"
      ></textarea>
      <p class="text-ink-muted mt-2 text-xs">{{ i18n.t('bo.orders.cancelHint') }}</p>
      <ng-template #footer>
        <p-button [label]="i18n.t('common.back')" [text]="true" (onClick)="cancelOpen.set(false)" />
        <p-button
          [label]="i18n.t('bo.orders.confirmCancel')"
          severity="danger"
          [rounded]="true"
          [disabled]="!cancelReason().trim()"
          [loading]="busy()"
          (onClick)="cancel()"
        />
      </ng-template>
    </p-dialog>

    <app-receive-payment-dialog
      [order]="paying()"
      (paid)="onPaid($event)"
      (closed)="paying.set(null)"
    />
    <app-receipt-dialog [orderId]="receiptId()" (closed)="receiptId.set(null)" />

    <p-dialog
      [visible]="slipUrl() !== null"
      (visibleChange)="!$event && closeSlip()"
      [modal]="true"
      [draggable]="false"
      [header]="i18n.t('track.payment')"
      [style]="{ width: '26rem' }"
      [breakpoints]="{ '640px': '94vw' }"
    >
      @if (slipUrl(); as url) {
        <img [src]="url" alt="slip" class="w-full rounded-xl" />
      }
    </p-dialog>
  `,
})
export class OrderDetailPage {
  protected readonly i18n = inject(I18nService);
  private readonly api = inject(OrderApi);
  private readonly messages = inject(MessageService);

  readonly id = input.required<string>();

  protected readonly crumbs: Crumb[] = [
    { labelKey: 'bo.title', link: '/backoffice' },
    { labelKey: 'bo.nav.orders', link: '/backoffice/orders' },
    { labelKey: 'bo.orders.detail' },
  ];

  protected readonly order = signal<OrderResponse | null>(null);
  protected readonly busy = signal(false);
  protected readonly cancelOpen = signal(false);
  protected readonly cancelReason = signal('');
  protected readonly paying = signal<OrderResponse | null>(null);
  protected readonly receiptId = signal<number | null>(null);
  protected readonly loadingSlip = signal<number | null>(null);
  protected readonly slipUrl = signal<string | null>(null);
  protected readonly phone = formatPhone;

  protected readonly lines = computed(() =>
    orderSummaryLines(this.order()?.items ?? [], this.i18n),
  );
  protected readonly next = computed(() => {
    const status = this.order()?.status;
    return status ? (NEXT_STATUS[status] ?? null) : null;
  });

  constructor() {
    effect(() => this.load(Number(this.id())));
    inject(DestroyRef).onDestroy(() => this.revokeSlipUrl());
  }

  protected advance(status: OrderStatus): void {
    const order = this.order();
    if (!order) {
      return;
    }
    this.busy.set(true);
    this.api
      .updateStatus(order.id, status)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe((updated) => this.order.set(updated));
  }

  protected viewSlip(paymentId: number): void {
    this.loadingSlip.set(paymentId);
    this.api
      .slip(paymentId)
      .pipe(
        finalize(() => this.loadingSlip.set(null)),
        catchError(() => of(null)),
      )
      .subscribe((blob) => {
        if (blob) {
          this.slipUrl.set(URL.createObjectURL(blob));
        }
      });
  }

  protected closeSlip(): void {
    this.revokeSlipUrl();
    this.slipUrl.set(null);
  }

  private revokeSlipUrl(): void {
    const url = this.slipUrl();
    if (url) {
      URL.revokeObjectURL(url);
    }
  }

  protected cancel(): void {
    const order = this.order();
    if (!order) {
      return;
    }
    this.busy.set(true);
    this.api
      .cancel(order.id, this.cancelReason().trim())
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe((updated) => {
        this.order.set(updated);
        this.cancelOpen.set(false);
        this.cancelReason.set('');
        this.messages.add({ severity: 'info', summary: this.i18n.t('bo.orders.cancelled') });
      });
  }

  protected onPaid(order: OrderResponse): void {
    this.order.set(order);
    this.paying.set(order.status === 'PENDING_PAYMENT' ? order : null);
    this.messages.add({ severity: 'success', summary: this.i18n.t('pos.paid') });
  }

  private load(id: number): void {
    this.api.order(id).subscribe((order) => this.order.set(order));
  }
}
