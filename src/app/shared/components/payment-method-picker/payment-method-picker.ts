import { ChangeDetectionStrategy, Component, computed, inject, input, model } from '@angular/core';

import { PaymentMethodResponse } from '../../../core/api/models/order.model';
import { I18nService } from '../../../core/i18n/i18n.service';
import { MoneyPipe } from '../../pipes/money.pipe';
import { promptPayPayload } from '../../utils/promptpay';
import { QrCode } from '../qr-code/qr-code';

const METHOD_ICONS: Record<string, string> = {
  CASH: 'pi pi-wallet',
  PROMPTPAY: 'pi pi-qrcode',
  TRANSFER: 'pi pi-building-columns',
  CARD: 'pi pi-credit-card',
};

@Component({
  selector: 'app-payment-method-picker',
  imports: [MoneyPipe, QrCode],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="grid gap-2 sm:grid-cols-2" role="radiogroup">
      @for (method of methods(); track method.code) {
        <button
          type="button"
          role="radio"
          class="border-line flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition"
          [class.border-brand]="selected() === method.code"
          [class.bg-brand-soft]="selected() === method.code"
          [attr.aria-checked]="selected() === method.code"
          (click)="selected.set(method.code)"
        >
          <span
            class="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
            [class]="
              selected() === method.code ? 'bg-brand text-on-brand' : 'bg-card-muted text-brand'
            "
          >
            <i [class]="icon(method.code)"></i>
          </span>
          <span class="min-w-0">
            <span class="text-ink block text-sm font-semibold">{{ i18n.name(method) }}</span>
            @if (method.requiresSlip) {
              <span class="text-ink-muted block text-xs">{{ i18n.t('payment.needsSlip') }}</span>
            }
          </span>
        </button>
      }
    </div>

    @if (current(); as method) {
      <div class="bg-canvas animate-pop mt-3 rounded-2xl px-4 py-3 text-sm">
        @if (method.instruction) {
          <p class="text-ink-muted whitespace-pre-line">{{ method.instruction }}</p>
        }
        @if (qrPayload(); as payload) {
          <div class="mt-3 flex flex-col items-center gap-2">
            <app-qr-code [value]="payload" [size]="170" label="PromptPay QR" />
            <p class="text-ink text-xs font-semibold">
              PromptPay {{ method.promptpayId }} · {{ amount() | money }}
            </p>
          </div>
        }
      </div>
    }
  `,
})
export class PaymentMethodPicker {
  protected readonly i18n = inject(I18nService);

  readonly methods = input.required<PaymentMethodResponse[]>();
  readonly amount = input(0);
  readonly showQr = input(true);
  readonly selected = model<string | null>(null);

  protected readonly current = computed(
    () => this.methods().find((method) => method.code === this.selected()) ?? null,
  );

  protected readonly qrPayload = computed(() => {
    const method = this.current();
    return this.showQr() && method?.code === 'PROMPTPAY' && method.promptpayId
      ? promptPayPayload(method.promptpayId, this.amount() || undefined)
      : null;
  });

  protected icon(code: string): string {
    return METHOD_ICONS[code] ?? 'pi pi-money-bill';
  }
}
