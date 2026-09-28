import { ChangeDetectionStrategy, Component, computed, inject, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputNumberModule } from 'primeng/inputnumber';
import { SliderModule } from 'primeng/slider';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

import { I18nService } from '../../../core/i18n/i18n.service';
import { MoneyPipe } from '../../pipes/money.pipe';
import { formatNumber } from '../../utils/format';

@Component({
  selector: 'app-point-redeem',
  imports: [FormsModule, InputNumberModule, SliderModule, ToggleSwitchModule, MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="flex items-center justify-between gap-3">
      <div class="min-w-0">
        <p class="text-ink text-sm font-semibold">{{ i18n.t('redeem.title') }}</p>
        <p class="text-ink-muted text-xs">
          {{ i18n.t('redeem.balance', { n: format(balance()) }) }} ·
          {{ i18n.t('redeem.rate', { n: perBaht() }) }}
        </p>
      </div>
      <p-toggleswitch
        [ngModel]="points() > 0"
        [disabled]="!canRedeem()"
        [ariaLabel]="i18n.t('redeem.title')"
        (ngModelChange)="points.set($event ? min() : 0)"
      />
    </div>

    @if (!canRedeem()) {
      <p class="text-ink-muted mt-2 text-xs">{{ i18n.t('redeem.notEnough', { n: min() }) }}</p>
    } @else if (points() > 0) {
      <div class="animate-pop mt-3 flex flex-col gap-3">
        <p-slider
          [min]="min()"
          [max]="max()"
          [step]="perBaht()"
          [ngModel]="points()"
          (ngModelChange)="points.set($event)"
        />
        <div class="flex items-center gap-3">
          <p-inputnumber
            inputId="redeem-points"
            [min]="min()"
            [max]="max()"
            [step]="perBaht()"
            [showButtons]="true"
            buttonLayout="horizontal"
            incrementButtonIcon="pi pi-plus"
            decrementButtonIcon="pi pi-minus"
            inputStyleClass="w-24 text-center"
            [ngModel]="points()"
            (ngModelChange)="points.set(clamp($event))"
          />
          <span class="text-accent text-sm font-bold">
            = -{{ points() / perBaht() | money: false }}
          </span>
        </div>
        <p class="text-ink-muted text-xs">{{ i18n.t('redeem.max', { n: format(max()) }) }}</p>
      </div>
    }
  `,
})
export class PointRedeem {
  protected readonly i18n = inject(I18nService);

  readonly balance = input.required<number>();
  readonly max = input.required<number>();
  readonly min = input(100);
  readonly perBaht = input(10);
  readonly points = model(0);

  protected readonly canRedeem = computed(() => this.max() >= this.min());
  protected readonly format = formatNumber;

  protected clamp(value: number | null): number {
    const step = this.perBaht();
    const bounded = Math.min(this.max(), Math.max(this.min(), value ?? this.min()));
    return Math.floor(bounded / step) * step;
  }
}
