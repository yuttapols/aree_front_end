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
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { catchError, finalize, of } from 'rxjs';

import { OrderResponse } from '../../../core/api/models/order.model';
import { OrderApi } from '../../../core/api/services/order.api';
import { I18nService } from '../../../core/i18n/i18n.service';
import { MoneyPipe } from '../../pipes/money.pipe';
import { CashCalculator } from '../cash-calculator/cash-calculator';
import { PaymentMethodPicker } from '../payment-method-picker/payment-method-picker';

@Component({
  selector: 'app-receive-payment-dialog',
  imports: [
    FormsModule,
    ButtonModule,
    DialogModule,
    InputNumberModule,
    InputTextModule,
    MoneyPipe,
    CashCalculator,
    PaymentMethodPicker,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-dialog
      [visible]="order() !== null"
      (visibleChange)="!$event && closed.emit()"
      [modal]="true"
      [draggable]="false"
      [header]="i18n.t('pos.receivePayment')"
      [breakpoints]="{ '640px': '96vw' }"
      [style]="{ width: '34rem' }"
    >
      @if (order(); as current) {
        <div class="bg-canvas mb-4 flex items-center justify-between rounded-2xl px-4 py-3">
          <div>
            <p class="text-ink-muted text-xs">
              #{{ current.orderNo }} · {{ i18n.t('success.queue') }} {{ current.queueNo }}
            </p>
            <p class="text-ink text-sm font-semibold">{{ i18n.t('pos.amountDue') }}</p>
          </div>
          <p class="font-display text-accent text-3xl font-extrabold tabular-nums">
            {{ due() | money }}
          </p>
        </div>

        <app-payment-method-picker
          [methods]="methods()"
          [amount]="amount()"
          [(selected)]="method"
        />

        <div class="mt-4 flex flex-col gap-3">
          <div>
            <label class="text-ink-muted mb-1 block text-xs" for="pay-amount">{{
              i18n.t('pos.payAmount')
            }}</label>
            <p-inputnumber
              inputId="pay-amount"
              mode="currency"
              currency="THB"
              locale="th-TH"
              [min]="0"
              [max]="due()"
              [fluid]="true"
              [ngModel]="amount()"
              (ngModelChange)="amount.set($event ?? 0)"
            />
            @if (amount() < due()) {
              <p class="text-ink-muted mt-1 text-xs">
                {{ i18n.t('pos.splitHint', { n: (due() - amount() | money) }) }}
              </p>
            }
          </div>
          @if (method() === 'CASH') {
            <app-cash-calculator [total]="amount()" [(received)]="received" />
          }
          @if (requiresReference() || method() === 'TRANSFER' || method() === 'PROMPTPAY') {
            <div>
              <label class="text-ink-muted mb-1 block text-xs" for="pay-ref">
                {{ i18n.t('pos.reference') }}{{ requiresReference() ? ' *' : '' }}
              </label>
              <input
                pInputText
                id="pay-ref"
                class="w-full rounded-xl"
                [ngModel]="reference()"
                (ngModelChange)="reference.set($event)"
              />
            </div>
          }
        </div>
      }
      <ng-template #footer>
        <p-button [label]="i18n.t('common.cancel')" [text]="true" (onClick)="closed.emit()" />
        <p-button
          [label]="i18n.t('pos.confirmPayment')"
          icon="pi pi-check"
          [rounded]="true"
          [loading]="saving()"
          [disabled]="!canSubmit()"
          (onClick)="submit()"
        />
      </ng-template>
    </p-dialog>
  `,
})
export class ReceivePaymentDialog {
  protected readonly i18n = inject(I18nService);
  private readonly api = inject(OrderApi);

  readonly order = input<OrderResponse | null>(null);
  readonly paid = output<OrderResponse>();
  readonly closed = output<void>();

  protected readonly method = signal<string | null>('CASH');
  protected readonly amount = signal(0);
  protected readonly received = signal(0);
  protected readonly reference = signal('');
  protected readonly saving = signal(false);

  protected readonly methods = toSignal(
    this.api.paymentMethods('WALK_IN').pipe(catchError(() => of([]))),
    { initialValue: [] },
  );

  protected readonly due = computed(() => {
    const order = this.order();
    return order ? Math.max(0, Math.round((order.totalAmount - order.paidAmount) * 100) / 100) : 0;
  });

  protected readonly requiresReference = computed(
    () =>
      this.methods().find((method) => method.code === this.method())?.requiresReference ?? false,
  );

  protected readonly canSubmit = computed(() => {
    if (!this.method() || this.amount() <= 0 || this.amount() > this.due()) {
      return false;
    }
    if (this.method() === 'CASH' && this.received() < this.amount()) {
      return false;
    }
    return !this.requiresReference() || !!this.reference().trim();
  });

  constructor() {
    effect(() => {
      const due = this.due();
      this.amount.set(due);
      this.received.set(due);
      this.reference.set('');
    });
  }

  protected submit(): void {
    const order = this.order();
    const method = this.method();
    if (!order || !method || !this.canSubmit()) {
      return;
    }
    this.saving.set(true);
    this.api
      .addPayment(order.id, {
        methodCode: method,
        amount: this.amount(),
        cashReceived: method === 'CASH' ? this.received() : null,
        referenceNo: this.reference().trim() || null,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe((updated) => this.paid.emit(updated));
  }
}
