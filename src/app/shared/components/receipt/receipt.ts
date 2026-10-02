import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { ReceiptResponse } from '../../../core/api/models/order.model';
import { I18nService } from '../../../core/i18n/i18n.service';
import { MoneyPipe } from '../../pipes/money.pipe';
import { ThaiDatePipe } from '../../pipes/thai-date.pipe';
import { orderSummaryLines } from '../../utils/order-lines';

@Component({
  selector: 'app-receipt',
  imports: [MoneyPipe, ThaiDatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'print-area block' },
  template: `
    <div
      class="mx-auto w-full max-w-[20rem] bg-white p-4 font-mono text-[12px] leading-relaxed text-black"
    >
      <p class="text-center text-base font-bold">{{ receipt().shopName }}</p>
      <p class="text-center">{{ receipt().address }}</p>
      <p class="text-center">{{ i18n.t('receipt.phone') }} {{ receipt().shopPhone }}</p>
      <div class="my-2 border-t border-dashed border-black"></div>
      <p>{{ i18n.t('receipt.orderNo') }}: {{ order().orderNo }}</p>
      <p>{{ i18n.t('receipt.queue') }}: {{ order().queueNo }}</p>
      <p>{{ order().createdAt | thaiDate: i18n.lang() : 'datetime' }}</p>
      @if (receipt().cashierName) {
        <p>{{ i18n.t('receipt.cashier') }}: {{ receipt().cashierName }}</p>
      }
      @if (order().customer?.memberCode; as memberCode) {
        <p>{{ i18n.t('receipt.member') }}: {{ order().customer?.nickname }} ({{ memberCode }})</p>
      }
      <div class="my-2 border-t border-dashed border-black"></div>
      @for (line of lines(); track line.key) {
        <div class="flex justify-between gap-2">
          <span>{{ line.qty }} x {{ line.name }}</span>
          <span>{{ line.total | money }}</span>
        </div>
        @if (line.extras) {
          <p class="pl-4 text-[11px]">{{ line.extras }}</p>
        }
      }
      <div class="my-2 border-t border-dashed border-black"></div>
      <div class="flex justify-between">
        <span>{{ i18n.t('cart.subtotal') }}</span
        ><span>{{ order().subtotal | money }}</span>
      </div>
      @if (order().promotionDiscount > 0) {
        <div class="flex justify-between">
          <span>{{ i18n.t('receipt.promotion') }}</span
          ><span>-{{ order().promotionDiscount | money }}</span>
        </div>
      }
      @if (order().pointDiscount > 0) {
        <div class="flex justify-between">
          <span>{{ i18n.t('receipt.points') }}</span
          ><span>-{{ order().pointDiscount | money }}</span>
        </div>
      }
      <div class="flex justify-between text-sm font-bold">
        <span>{{ i18n.t('cart.total') }}</span
        ><span>{{ order().totalAmount | money }}</span>
      </div>
      @for (payment of paidPayments(); track payment.id) {
        <div class="flex justify-between">
          <span>{{ i18n.pick(payment.methodName, payment.methodNameEn) }}</span
          ><span>{{ payment.cashReceived ?? payment.amount | money }}</span>
        </div>
        @if (payment.changeAmount) {
          <div class="flex justify-between">
            <span>{{ i18n.t('pos.change') }}</span
            ><span>{{ payment.changeAmount | money }}</span>
          </div>
        }
      }
      @if (order().pointsToEarn > 0) {
        <p class="mt-1">{{ i18n.t('receipt.pointsToEarn', { n: order().pointsToEarn }) }}</p>
      }
      <div class="my-2 border-t border-dashed border-black"></div>
      <p class="text-center">{{ i18n.t('receipt.thanks') }}</p>
    </div>
  `,
})
export class Receipt {
  protected readonly i18n = inject(I18nService);

  readonly receipt = input.required<ReceiptResponse>();

  protected readonly order = computed(() => this.receipt().order);
  protected readonly lines = computed(() => orderSummaryLines(this.order().items, this.i18n));
  protected readonly paidPayments = computed(() =>
    this.order().payments.filter((payment) => payment.status === 'PAID'),
  );
}
