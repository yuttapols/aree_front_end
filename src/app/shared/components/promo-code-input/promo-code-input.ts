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

@Component({
  selector: 'app-promo-code-input',
  imports: [FormsModule, ButtonModule, InputTextModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @if (appliedCode() && !errorMessage()) {
      <div class="bg-brand-soft flex items-center justify-between gap-3 rounded-2xl px-4 py-2.5">
        <span class="text-brand text-sm font-bold tracking-wider">
          <i class="pi pi-ticket mr-2"></i>{{ appliedCode() }}
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
          (ngModelChange)="draft.set($event)"
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

  protected readonly errorMessage = computed(() => {
    const code = this.error();
    return code && ERROR_CODES.includes(code as ErrorCode)
      ? this.i18n.error(code as ErrorCode)
      : null;
  });

  protected submit(): void {
    const code = this.draft().trim().toUpperCase();
    if (code) {
      this.apply.emit(code);
    }
  }
}
