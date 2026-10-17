import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';

import { I18nService } from '../../../core/i18n/i18n.service';
import { MoneyPipe } from '../../pipes/money.pipe';

@Component({
  selector: 'app-pay-later-tag',
  imports: [MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex' },
  template: `
    <span
      class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold"
      [class]="
        inverted()
          ? 'bg-white text-red-600'
          : 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300'
      "
    >
      <i class="pi pi-exclamation-circle text-[0.7rem]"></i>
      {{ i18n.t('bo.payLater') }}
      @if (amount() != null) {
        <span class="tabular-nums">{{ amount()! | money: false }}</span>
      }
    </span>
  `,
})
export class PayLaterTag {
  protected readonly i18n = inject(I18nService);

  readonly amount = input<number | null>(null);
  readonly inverted = input(false);
}
