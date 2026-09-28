import { ChangeDetectionStrategy, Component, inject, input, model, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';

import { I18nService } from '../../../core/i18n/i18n.service';
import { BrandLogo } from '../../../shared/components/brand-logo/brand-logo';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';

@Component({
  selector: 'app-settle-confirm-dialog',
  imports: [ButtonModule, BrandLogo, DialogModule, MoneyPipe],
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
        <app-brand-logo class="relative mx-auto block h-24" />
        <h2 class="font-display relative mt-4 text-2xl font-bold">
          {{ i18n.t('bo.today.confirmSettleTitle') }}
        </h2>
        <p class="relative mt-1 text-sm text-white/75">
          {{ i18n.t('bo.today.confirmSettleHint') }}
        </p>
      </header>

      <dl class="flex flex-col gap-3 px-6 py-6">
        <div class="bg-canvas flex items-center justify-between gap-4 rounded-2xl px-5 py-4">
          <dt class="text-ink-muted font-semibold">{{ i18n.t('bo.today.confirmQueue') }}</dt>
          <dd class="text-right">
            <span class="font-display text-accent text-4xl leading-none font-extrabold">{{
              queueNo()
            }}</span>
            @if (customerName()) {
              <span class="text-ink-muted block text-sm">{{ customerName() }}</span>
            }
          </dd>
        </div>
        <div class="bg-canvas flex items-center justify-between gap-4 rounded-2xl px-5 py-4">
          <dt class="text-ink-muted font-semibold">{{ i18n.t('bo.today.confirmMethod') }}</dt>
          <dd
            class="bg-brand-soft text-brand flex items-center gap-2 rounded-full px-4 py-1.5 text-lg font-bold"
          >
            <i [class]="methodIcon()"></i>{{ methodLabel() }}
          </dd>
        </div>
        <div
          class="flex items-center justify-between gap-4 rounded-2xl bg-emerald-50 px-5 py-4 dark:bg-emerald-500/10"
        >
          <dt class="font-semibold text-emerald-700 dark:text-emerald-300">
            {{ i18n.t('bo.today.confirmAmount') }}
          </dt>
          <dd
            class="font-display text-3xl font-bold text-emerald-700 tabular-nums dark:text-emerald-300"
          >
            {{ amount() | money }}
          </dd>
        </div>
      </dl>

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
          [label]="i18n.t('bo.today.settle')"
          icon="pi pi-check"
          severity="success"
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
export class SettleConfirmDialog {
  protected readonly i18n = inject(I18nService);

  readonly visible = model(false);
  readonly queueNo = input.required<number>();
  readonly customerName = input<string | null>(null);
  readonly methodLabel = input.required<string>();
  readonly methodIcon = input.required<string>();
  readonly amount = input.required<number>();
  readonly busy = input(false);
  readonly confirmed = output<void>();
}
