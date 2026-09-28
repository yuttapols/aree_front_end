import { ChangeDetectionStrategy, Component, inject, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';

import { DateRange } from '../../../core/api/models/common.model';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslationKey } from '../../../core/i18n/translations';
import { fromDateKey, toDateKey } from '../../utils/format';

type Preset = 'today' | 'week' | 'month' | 'thisMonth' | 'custom';

const PRESETS: { id: Preset; labelKey: TranslationKey }[] = [
  { id: 'today', labelKey: 'range.today' },
  { id: 'week', labelKey: 'range.week' },
  { id: 'month', labelKey: 'range.month' },
  { id: 'thisMonth', labelKey: 'range.thisMonth' },
  { id: 'custom', labelKey: 'range.custom' },
];

export function presetRange(preset: Exclude<Preset, 'custom'>, now = new Date()): DateRange {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysBack = preset === 'today' ? 0 : preset === 'week' ? 6 : 29;
  const from =
    preset === 'thisMonth'
      ? new Date(now.getFullYear(), now.getMonth(), 1)
      : new Date(today.getTime() - daysBack * 86_400_000);
  return { from: toDateKey(from), to: toDateKey(today) };
}

@Component({
  selector: 'app-date-range-filter',
  imports: [FormsModule, DatePickerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-wrap items-center gap-2' },
  template: `
    @for (preset of presets; track preset.id) {
      <button
        type="button"
        class="h-9 rounded-full px-3.5 text-xs font-semibold transition"
        [class]="
          active() === preset.id
            ? 'bg-brand text-on-brand'
            : 'bg-card border-line text-ink-muted hover:text-ink border'
        "
        (click)="choose(preset.id)"
      >
        {{ i18n.t(preset.labelKey) }}
      </button>
    }
    @if (active() === 'custom') {
      <p-datepicker
        selectionMode="range"
        dateFormat="dd/mm/yy"
        [readonlyInput]="true"
        [showIcon]="true"
        [ngModel]="customValue()"
        (ngModelChange)="onCustom($event)"
      />
    }
  `,
})
export class DateRangeFilter {
  protected readonly i18n = inject(I18nService);

  readonly range = model<DateRange>(presetRange('week'));

  protected readonly presets = PRESETS;
  protected readonly active = signal<Preset>('week');
  protected readonly customValue = signal<(Date | null)[]>([]);

  protected choose(preset: Preset): void {
    this.active.set(preset);
    if (preset === 'custom') {
      this.customValue.set([fromDateKey(this.range().from), fromDateKey(this.range().to)]);
      return;
    }
    this.range.set(presetRange(preset));
  }

  protected onCustom(value: (Date | null)[] | null): void {
    this.customValue.set(value ?? []);
    const [from, to] = value ?? [];
    if (from && to) {
      this.range.set({ from: toDateKey(from), to: toDateKey(to) });
    }
  }
}
