import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';

import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslationKey } from '../../../core/i18n/translations';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';

const OTHER_REASON = 'other';

const REASONS: { id: string; labelKey: TranslationKey }[] = [
  { id: 'changedMind', labelKey: 'bo.today.reasonChangedMind' },
  { id: 'wrongOrder', labelKey: 'bo.today.reasonWrongOrder' },
  { id: 'soldOut', labelKey: 'bo.today.reasonSoldOut' },
  { id: OTHER_REASON, labelKey: 'bo.today.reasonOther' },
];

@Component({
  selector: 'app-cancel-order-dialog',
  imports: [FormsModule, ButtonModule, DialogModule, InputTextModule, MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-dialog
      [(visible)]="visible"
      [modal]="true"
      [draggable]="false"
      [closable]="!busy()"
      [dismissableMask]="!busy()"
      [breakpoints]="{ '640px': '94vw' }"
      [style]="{ width: '32rem' }"
      [showHeader]="false"
      contentStyleClass="!p-0"
    >
      <header class="bg-royal relative overflow-hidden px-6 pt-7 pb-6 text-center text-white">
        <i
          class="pi pi-star-fill pointer-events-none absolute -top-8 -right-6 text-[8rem] text-white/10"
        ></i>
        <span
          class="relative mx-auto grid h-16 w-16 place-items-center rounded-full bg-red-500 shadow-lg ring-8 ring-white/15"
        >
          <i class="pi pi-times text-2xl"></i>
        </span>
        <h2 class="font-display relative mt-4 text-2xl font-bold">
          {{ i18n.t('bo.today.cancelTitle') }}
        </h2>
        <p class="relative mt-1 text-sm text-white/75">{{ i18n.t('bo.orders.cancelHint') }}</p>
      </header>

      <div class="flex flex-col gap-3 px-6 py-6">
        <div class="bg-canvas flex items-center justify-between gap-4 rounded-2xl px-5 py-4">
          <span class="text-ink-muted font-semibold">{{ i18n.t('bo.today.confirmQueue') }}</span>
          <span class="text-right">
            <span class="font-display text-accent text-4xl leading-none font-extrabold">{{
              queueNo()
            }}</span>
            @if (customerName()) {
              <span class="text-ink-muted block text-sm">{{ customerName() }}</span>
            }
          </span>
        </div>
        <div class="bg-canvas flex items-center justify-between gap-4 rounded-2xl px-5 py-4">
          <span class="text-ink-muted font-semibold">{{ i18n.t('bo.today.confirmAmount') }}</span>
          <span class="font-display text-ink text-2xl font-bold tabular-nums line-through">{{
            amount() | money
          }}</span>
        </div>

        <div class="mt-1">
          <p class="text-ink mb-2 font-bold">{{ i18n.t('bo.orders.cancelReason') }}</p>
          <div class="flex flex-wrap gap-2" role="radiogroup">
            @for (reason of reasons; track reason.id) {
              <button
                type="button"
                role="radio"
                class="rounded-full border-2 px-4 py-2 text-sm font-semibold transition"
                [class]="
                  selectedReason() === reason.id
                    ? 'border-red-500 bg-red-500/10 text-red-500'
                    : 'border-line bg-card text-ink hover:border-red-500/40'
                "
                [attr.aria-checked]="selectedReason() === reason.id"
                (click)="selectedReason.set(reason.id)"
              >
                {{ i18n.t(reason.labelKey) }}
              </button>
            }
          </div>
          @if (selectedReason() === otherReason) {
            <input
              pInputText
              class="mt-3 rounded-xl"
              [fluid]="true"
              maxlength="200"
              [placeholder]="i18n.t('bo.today.reasonPlaceholder')"
              [attr.aria-label]="i18n.t('bo.orders.cancelReason')"
              [ngModel]="customReason()"
              (ngModelChange)="customReason.set($event)"
            />
          }
        </div>
      </div>

      <footer class="grid grid-cols-2 gap-3 px-6 pb-6">
        <p-button
          [label]="i18n.t('bo.today.keepOrder')"
          severity="secondary"
          [outlined]="true"
          [rounded]="true"
          size="large"
          [fluid]="true"
          [disabled]="busy()"
          (onClick)="visible.set(false)"
        />
        <p-button
          [label]="i18n.t('bo.orders.confirmCancel')"
          icon="pi pi-times"
          severity="danger"
          [rounded]="true"
          size="large"
          [fluid]="true"
          [disabled]="!reason()"
          [loading]="busy()"
          (onClick)="confirmed.emit(reason())"
        />
      </footer>
    </p-dialog>
  `,
})
export class CancelOrderDialog {
  protected readonly i18n = inject(I18nService);

  readonly visible = model(false);
  readonly queueNo = input.required<number>();
  readonly customerName = input<string | null>(null);
  readonly amount = input.required<number>();
  readonly busy = input(false);
  readonly confirmed = output<string>();

  protected readonly reasons = REASONS;
  protected readonly otherReason = OTHER_REASON;
  protected readonly selectedReason = signal(REASONS[0].id);
  protected readonly customReason = signal('');

  protected readonly reason = computed(() => {
    const selected = REASONS.find((reason) => reason.id === this.selectedReason());
    if (!selected) {
      return '';
    }
    return selected.id === OTHER_REASON
      ? this.customReason().trim()
      : this.i18n.t(selected.labelKey);
  });

  constructor() {
    effect(() => {
      if (this.visible()) {
        this.selectedReason.set(REASONS[0].id);
        this.customReason.set('');
      }
    });
  }
}
