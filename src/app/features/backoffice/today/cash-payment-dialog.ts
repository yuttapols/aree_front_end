import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
} from '@angular/core';
import { DialogModule } from 'primeng/dialog';

import { I18nService } from '../../../core/i18n/i18n.service';
import { CashPad } from '../../../shared/components/cash-pad/cash-pad';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';

@Component({
  selector: 'app-cash-payment-dialog',
  imports: [CashPad, DialogModule, MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-dialog
      [(visible)]="visible"
      [modal]="true"
      [draggable]="false"
      [closable]="!busy()"
      [breakpoints]="{ '720px': '96vw' }"
      [style]="{ width: '44rem' }"
      [showHeader]="false"
      contentStyleClass="!p-0"
    >
      <header class="bg-royal relative overflow-hidden px-6 py-5 text-white">
        <i
          class="pi pi-star-fill pointer-events-none absolute -top-8 -right-6 text-[8rem] text-white/10"
        ></i>
        <div class="relative flex items-end justify-between gap-4">
          <div>
            <p class="text-sm text-white/75">{{ i18n.t('pos.amountDue') }}</p>
            <p class="font-display text-5xl font-bold tabular-nums">{{ amount() | money }}</p>
          </div>
          <p class="text-sm text-white/75">
            {{ i18n.t('pos.cashMeta', { items: itemCount(), n: queueNo() }) }}
          </p>
        </div>
      </header>

      <div class="px-6 py-5">
        <app-cash-pad [total]="amount()" [(received)]="received" />
      </div>

      <footer class="flex gap-3 px-6 pb-6">
        <button
          type="button"
          class="flex h-14 w-16 shrink-0 items-center justify-center rounded-2xl border-2 border-red-300 bg-red-50 text-red-600 transition hover:border-red-500 hover:bg-red-100 active:scale-95 disabled:opacity-50 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-400"
          [disabled]="busy()"
          [attr.aria-label]="i18n.t('common.cancel')"
          (click)="visible.set(false)"
        >
          <i class="pi pi-times text-xl font-bold [-webkit-text-stroke:1px_currentColor]"></i>
        </button>
        <button
          type="button"
          class="bg-royal flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl text-lg font-bold text-white shadow-lg shadow-[rgb(58_20_102/0.3)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          [disabled]="busy() || received() < amount()"
          (click)="confirmed.emit(received())"
        >
          <i class="pi" [class]="busy() ? 'pi-spinner pi-spin' : 'pi-check'"></i>
          {{ i18n.t('pos.confirmCash', { amount: (amount() | money) }) }}
        </button>
      </footer>
    </p-dialog>
  `,
})
export class CashPaymentDialog {
  protected readonly i18n = inject(I18nService);

  readonly visible = model(false);
  readonly amount = input.required<number>();
  readonly queueNo = input.required<number>();
  readonly itemCount = input(0);
  readonly busy = input(false);
  readonly confirmed = output<number>();

  protected readonly received = signal(0);

  constructor() {
    effect(() => {
      if (this.visible()) {
        untracked(() => this.received.set(0));
      }
    });
  }
}
