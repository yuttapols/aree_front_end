import { ChangeDetectionStrategy, Component, inject, input, model, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';

import { I18nService } from '../../../core/i18n/i18n.service';
import { LineExtras } from '../../../shared/components/line-extras/line-extras';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { SummaryLine } from '../../../shared/utils/order-lines';

@Component({
  selector: 'app-ready-confirm-dialog',
  imports: [ButtonModule, DialogModule, LineExtras, MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-dialog
      [(visible)]="visible"
      [modal]="true"
      [draggable]="false"
      [closable]="!busy()"
      [dismissableMask]="!busy()"
      [breakpoints]="{ '640px': '94vw' }"
      [style]="{ width: '34rem' }"
      [showHeader]="false"
      contentStyleClass="!p-0"
    >
      <header
        class="from-accent to-brand relative overflow-hidden bg-linear-to-r px-6 pt-7 pb-6 text-center text-white"
      >
        <i
          class="pi pi-bell pointer-events-none absolute -top-6 -right-4 text-[7rem] text-white/10"
        ></i>
        <span
          class="font-display relative mx-auto grid h-20 w-20 place-items-center rounded-full bg-white/20 text-4xl font-extrabold"
          >{{ queueNo() }}</span
        >
        <h2 class="font-display relative mt-3 text-2xl font-bold">
          {{ i18n.t('bo.today.readyConfirmTitle') }}
        </h2>
        <p class="relative mt-1 text-sm text-white/80">
          {{ i18n.t('bo.today.readyConfirmHint') }}
        </p>
        @if (customerName()) {
          <p class="relative mt-2 text-sm font-semibold">{{ customerName() }}</p>
        }
      </header>

      <ul class="divide-line max-h-[50vh] divide-y overflow-y-auto px-6 py-2">
        @for (line of lines(); track line.key) {
          <li class="flex items-start gap-3 py-3">
            <span
              class="bg-brand-soft text-brand font-display grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-lg font-extrabold"
            >
              {{ line.qty }}
            </span>
            <div class="min-w-0 flex-1">
              <p class="text-ink text-lg font-bold">{{ line.name }}</p>
              @if (line.extras || line.omitted.length) {
                <p class="text-ink-muted mt-0.5"><app-line-extras [line]="line" /></p>
              }
              @if (line.note) {
                <p class="text-accent mt-0.5 font-semibold">
                  <i class="pi pi-comment mr-1 text-xs"></i>{{ line.note }}
                </p>
              }
            </div>
          </li>
        }
      </ul>

      @if (note()) {
        <p class="bg-accent-soft text-accent mx-6 rounded-xl px-3 py-2 text-sm font-semibold">
          <i class="pi pi-comment mr-1"></i>{{ note() }}
        </p>
      }

      <div class="border-line mx-6 mt-2 flex items-baseline justify-between border-t py-4">
        <span class="text-ink-muted font-semibold">{{ i18n.t('cart.total') }}</span>
        <span class="font-display text-ink text-2xl font-bold tabular-nums">{{
          total() | money
        }}</span>
      </div>

      <footer class="grid grid-cols-2 gap-3 px-6 pb-6">
        <p-button
          [label]="i18n.t('common.cancel')"
          severity="secondary"
          [outlined]="true"
          [rounded]="true"
          size="large"
          [fluid]="true"
          [disabled]="busy()"
          (onClick)="visible.set(false)"
        />
        <p-button
          [label]="i18n.t('bo.today.markReady')"
          icon="pi pi-bell"
          [rounded]="true"
          size="large"
          [fluid]="true"
          [loading]="busy()"
          (onClick)="confirmed.emit()"
        />
      </footer>
    </p-dialog>
  `,
})
export class ReadyConfirmDialog {
  protected readonly i18n = inject(I18nService);

  readonly visible = model(false);
  readonly queueNo = input.required<number>();
  readonly customerName = input<string | null>(null);
  readonly lines = input.required<SummaryLine[]>();
  readonly note = input<string | null>(null);
  readonly total = input.required<number>();
  readonly busy = input(false);
  readonly confirmed = output<void>();
}
