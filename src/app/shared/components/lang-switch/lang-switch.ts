import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { I18nService } from '../../../core/i18n/i18n.service';
import { Lang } from '../../../core/models/menu.model';
import { ControlVariant } from '../icon-button/icon-button';

const VARIANT_CLASS: Record<ControlVariant, { box: string; active: string; idle: string }> = {
  surface: {
    box: 'bg-card border-line shadow-soft',
    active: 'bg-brand text-on-brand shadow',
    idle: 'text-ink-muted hover:text-ink',
  },
  glass: {
    box: 'bg-white/10 border-white/15',
    active: 'bg-white text-[#3a1466] shadow',
    idle: 'text-white/70 hover:text-white',
  },
};

@Component({
  selector: 'app-lang-switch',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex' },
  template: `
    <div
      class="flex h-12 items-stretch rounded-2xl border p-1"
      [class]="styles().box"
      role="radiogroup"
      [attr.aria-label]="i18n.t('nav.language')"
    >
      @for (option of options; track option.value) {
        <button
          type="button"
          role="radio"
          [attr.aria-checked]="i18n.lang() === option.value"
          class="min-w-10 rounded-xl px-3 text-sm font-bold transition"
          [class]="i18n.lang() === option.value ? styles().active : styles().idle"
          (click)="i18n.setLang(option.value)"
        >
          {{ option.label }}
        </button>
      }
    </div>
  `,
})
export class LangSwitch {
  protected readonly i18n = inject(I18nService);

  readonly variant = input<ControlVariant>('surface');

  protected readonly styles = computed(() => VARIANT_CLASS[this.variant()]);

  protected readonly options: { label: string; value: Lang }[] = [
    { label: 'TH', value: 'th' },
    { label: 'EN', value: 'en' },
  ];
}
