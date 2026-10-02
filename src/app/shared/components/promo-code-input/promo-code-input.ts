import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';

import { ERROR_CODES, ErrorCode } from '../../../core/api/models/common.model';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TEXT_LIMITS, cleanCode } from '../../utils/sanitize';

@Component({
  selector: 'app-promo-code-input',
  imports: [FormsModule, ButtonModule, InputTextModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @if (appliedCode() && !errorMessage()) {
      <div
        class="coupon-notch bg-brand-soft border-brand/30 animate-pop relative flex items-center justify-between gap-3 rounded-2xl border-2 border-dashed px-5 py-3"
      >
        <span class="flex items-center gap-3">
          <span class="bg-brand text-on-brand grid h-9 w-9 place-items-center rounded-xl">
            <i class="pi pi-ticket"></i>
          </span>
          <span class="font-display text-brand text-base font-bold tracking-widest">
            {{ appliedCode() }}
          </span>
        </span>
        <p-button
          [label]="i18n.t('common.remove')"
          size="small"
          severity="danger"
          [text]="true"
          (onClick)="remove.emit()"
        />
      </div>
    } @else {
      <form class="flex gap-2" (ngSubmit)="submit()">
        <input
          pInputText
          name="promoCode"
          class="flex-1 rounded-xl uppercase"
          autocomplete="off"
          [placeholder]="i18n.t('promo.codePlaceholder')"
          [invalid]="!!errorMessage()"
          [ngModel]="draft()"
          [maxlength]="codeMaxLength"
          (ngModelChange)="draft.set(cleanCode($event))"
        />
        <p-button
          type="submit"
          [label]="i18n.t('common.apply')"
          [rounded]="true"
          [outlined]="true"
          [loading]="loading()"
          [disabled]="!draft().trim()"
        />
      </form>
      @if (errorMessage()) {
        <small
          class="animate-pop mt-1.5 flex items-center gap-1.5 text-xs text-red-500"
          role="alert"
        >
          <i class="pi pi-exclamation-circle text-xs"></i>{{ errorMessage() }}
        </small>
      }
    }
  `,
})
export class PromoCodeInput {
  protected readonly i18n = inject(I18nService);

  readonly appliedCode = input<string | null>(null);
  readonly error = input<string | null>(null);
  readonly loading = input(false);

  readonly apply = output<string>();
  readonly remove = output<void>();

  protected readonly draft = signal('');
  protected readonly cleanCode = cleanCode;
  protected readonly codeMaxLength = TEXT_LIMITS.code;

  protected readonly errorMessage = computed(() => {
    const code = this.error();
    return code && ERROR_CODES.includes(code as ErrorCode)
      ? this.i18n.error(code as ErrorCode)
      : null;
  });

  protected submit(): void {
    const code = cleanCode(this.draft());
    if (code) {
      this.apply.emit(code);
    }
  }
}
