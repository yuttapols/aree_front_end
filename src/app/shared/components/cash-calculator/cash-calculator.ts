import { ChangeDetectionStrategy, Component, computed, inject, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputNumberModule } from 'primeng/inputnumber';

import { I18nService } from '../../../core/i18n/i18n.service';
import { MoneyPipe } from '../../pipes/money.pipe';

const BANKNOTES = [20, 50, 100, 500, 1000];

@Component({
  selector: 'app-cash-calculator',
  imports: [FormsModule, InputNumberModule, MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <label class="text-ink-muted mb-1 block text-xs" for="cash-received">
      {{ i18n.t('pos.cashReceived') }}
    </label>
    <p-inputnumber
      inputId="cash-received"
      mode="currency"
      currency="THB"
      locale="th-TH"
      [min]="0"
      [fluid]="true"
      [ngModel]="received()"
      (ngModelChange)="received.set($event ?? 0)"
    />
    <div class="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
      <button type="button" [class]="chipClass" (click)="received.set(total())">
        {{ i18n.t('pos.exact') }}
      </button>
      @for (note of banknotes; track note) {
        <button type="button" [class]="chipClass" (click)="received.set(received() + note)">
          +{{ note }}
        </button>
      }
    </div>
    <div
      class="mt-3 flex items-center justify-between rounded-2xl px-4 py-3"
      [class]="enough() ? 'bg-accent-soft text-accent' : 'bg-card-muted text-ink-muted'"
    >
      <span class="text-sm font-semibold">{{ i18n.t('pos.change') }}</span>
      <span class="font-display text-2xl font-bold tabular-nums">
        {{ enough() ? (change() | money) : '-' }}
      </span>
    </div>
  `,
})
export class CashCalculator {
  protected readonly i18n = inject(I18nService);

  readonly total = input.required<number>();
  readonly received = model(0);

  protected readonly banknotes = BANKNOTES;
  protected readonly chipClass =
    'bg-card border-line text-ink hover:border-brand h-10 rounded-xl border text-sm font-semibold transition active:scale-95';

  protected readonly enough = computed(() => this.received() >= this.total());
  protected readonly change = computed(() => Math.max(0, this.received() - this.total()));
}
