import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';

import { ReceiptResponse } from '../../../core/api/models/order.model';
import { OrderApi } from '../../../core/api/services/order.api';
import { I18nService } from '../../../core/i18n/i18n.service';
import { MoneyPipe } from '../../pipes/money.pipe';
import { Receipt } from '../receipt/receipt';

@Component({
  selector: 'app-receipt-dialog',
  imports: [ButtonModule, DialogModule, MoneyPipe, Receipt],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-dialog
      [visible]="orderId() !== null"
      (visibleChange)="!$event && closed.emit()"
      [modal]="true"
      [draggable]="false"
      [header]="heading() || i18n.t('receipt.title')"
      [breakpoints]="{ '640px': '96vw' }"
      [style]="{ width: '26rem' }"
    >
      @if (receipt(); as data) {
        @if (change() > 0) {
          <div
            class="bg-accent-soft text-accent mb-4 flex items-center justify-between rounded-2xl px-4 py-3"
          >
            <span class="font-semibold">{{ i18n.t('pos.change') }}</span>
            <span class="font-display text-3xl font-extrabold">{{ change() | money }}</span>
          </div>
        }
        <div class="border-line rounded-2xl border">
          <app-receipt [receipt]="data" />
        </div>
      }
      <ng-template #footer>
        <p-button [label]="i18n.t('common.close')" [text]="true" (onClick)="closed.emit()" />
        <p-button
          [label]="i18n.t('receipt.print')"
          icon="pi pi-print"
          [rounded]="true"
          (onClick)="print()"
        />
      </ng-template>
    </p-dialog>
  `,
})
export class ReceiptDialog {
  protected readonly i18n = inject(I18nService);
  private readonly api = inject(OrderApi);

  readonly orderId = input<number | null>(null);
  readonly heading = input<string | null>(null);
  readonly closed = output<void>();

  protected readonly receipt = signal<ReceiptResponse | null>(null);
  protected readonly change = signal(0);

  constructor() {
    effect(() => {
      const id = this.orderId();
      this.receipt.set(null);
      if (id !== null) {
        this.api.receipt(id).subscribe((receipt) => {
          this.receipt.set(receipt);
          this.change.set(
            receipt.order.payments.reduce(
              (total, payment) => total + (payment.changeAmount ?? 0),
              0,
            ),
          );
        });
      }
    });
  }

  protected print(): void {
    window.print();
  }
}
