import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';

import { I18nService } from '../../../core/i18n/i18n.service';
import { MenuOption, MenuOptionGroup } from '../../../core/models/menu.model';
import { formatMoney } from '../../utils/format';
import { toggleOption } from '../../utils/options';

@Component({
  selector: 'app-option-selector',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-5' },
  template: `
    @for (group of groups(); track group.id) {
      <fieldset>
        <legend class="mb-2 flex w-full items-center justify-between gap-2">
          <span class="text-ink text-sm font-semibold">{{ i18n.text(group.name) }}</span>
          <span
            class="flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.7rem] font-semibold transition"
            [class]="hintClass(group)"
          >
            @if (group.minSelect > 0 && isComplete(group)) {
              <i class="pi pi-check-circle animate-pop text-[0.7rem]"></i>
            }
            {{ hint(group) }}
          </span>
        </legend>
        <div class="grid gap-2 sm:grid-cols-2">
          @for (option of group.options; track option.id) {
            <button
              type="button"
              class="border-line hover:border-brand/50 flex items-center gap-3 rounded-2xl border-2 px-3 py-3 text-left transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              [class.border-brand]="isSelected(option)"
              [class.bg-brand-soft]="isSelected(option)"
              [attr.aria-pressed]="isSelected(option)"
              [disabled]="isBlocked(group, option)"
              (click)="selectedChange.emit(toggle(group, option))"
            >
              <span
                class="grid h-5 w-5 shrink-0 place-items-center border-2 transition"
                [class]="
                  (group.maxSelect === 1 ? 'rounded-full ' : 'rounded-md ') +
                  (isSelected(option) ? 'border-brand bg-brand text-on-brand' : 'border-line')
                "
              >
                @if (isSelected(option)) {
                  <i class="pi pi-check text-[0.6rem]"></i>
                }
              </span>
              <span
                class="flex-1 text-sm"
                [class]="option.available ? 'text-ink' : 'text-ink-muted line-through'"
              >
                {{ i18n.text(option.name) }}
              </span>
              @if (option.available) {
                <span class="text-ink-muted text-xs">
                  {{ option.price > 0 ? '+' + money(option.price) : i18n.t('options.free') }}
                </span>
              } @else {
                <span
                  class="rounded-full bg-red-500/10 px-2 py-0.5 text-[0.65rem] font-bold text-red-500"
                >
                  {{ i18n.t('options.soldOut') }}
                </span>
              }
            </button>
          }
        </div>
      </fieldset>
    }
  `,
})
export class OptionSelector {
  protected readonly i18n = inject(I18nService);

  readonly groups = input.required<MenuOptionGroup[]>();
  readonly selected = input.required<MenuOption[]>();

  readonly selectedChange = output<MenuOption[]>();

  protected money(value: number): string {
    return formatMoney(value, false);
  }

  protected isSelected(option: MenuOption): boolean {
    return this.selected().some((candidate) => candidate.id === option.id);
  }

  protected isBlocked(group: MenuOptionGroup, option: MenuOption): boolean {
    if (!option.available) {
      return !this.isSelected(option);
    }
    if (group.maxSelect === 1 || this.isSelected(option)) {
      return false;
    }
    return (
      this.selected().filter((candidate) => candidate.groupId === group.id).length >=
      group.maxSelect
    );
  }

  protected toggle(group: MenuOptionGroup, option: MenuOption): MenuOption[] {
    return toggleOption(group, option, this.selected());
  }

  protected isComplete(group: MenuOptionGroup): boolean {
    const count = this.selected().filter((candidate) => candidate.groupId === group.id).length;
    return count >= group.minSelect && count <= group.maxSelect;
  }

  protected hintClass(group: MenuOptionGroup): string {
    if (group.minSelect === 0) {
      return 'bg-card-muted text-ink-muted';
    }
    return this.isComplete(group)
      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
      : 'bg-accent-soft text-accent';
  }

  protected hint(group: MenuOptionGroup): string {
    if (group.minSelect > 0 && group.minSelect === group.maxSelect) {
      return this.i18n.t('options.pickExactly', { n: group.minSelect });
    }
    if (group.minSelect > 0) {
      return this.i18n.t('options.pickRange', { min: group.minSelect, max: group.maxSelect });
    }
    return this.i18n.t('options.pickUpTo', { n: group.maxSelect });
  }
}
