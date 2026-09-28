import { ChangeDetectionStrategy, Component, DOCUMENT, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { PopoverModule } from 'primeng/popover';
import { RadioButtonModule } from 'primeng/radiobutton';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslationKey } from '../../../core/i18n/translations';
import { MenuFilterService, MenuSort } from '../../../core/menu/menu-filter.service';
import { IconButton } from '../../../shared/components/icon-button/icon-button';

@Component({
  selector: 'app-search-bar',
  imports: [
    FormsModule,
    ButtonModule,
    PopoverModule,
    RadioButtonModule,
    ToggleSwitchModule,
    IconButton,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="flex items-center gap-3">
      <label
        class="bg-card border-line shadow-soft focus-within:border-brand flex h-12 flex-1 items-center gap-3 rounded-2xl border px-4 transition"
      >
        <i class="pi pi-search text-ink-muted"></i>
        <input
          type="search"
          class="text-ink placeholder:text-ink-muted h-full w-full bg-transparent text-sm outline-none [&::-webkit-search-cancel-button]:hidden"
          [placeholder]="i18n.t('search.placeholder')"
          [ngModel]="filter.query()"
          (ngModelChange)="filter.query.set($event)"
          (keydown.enter)="scrollToMenu()"
        />
        @if (filter.query()) {
          <button
            type="button"
            class="text-ink-muted hover:text-ink grid h-7 w-7 place-items-center rounded-full transition"
            [attr.aria-label]="i18n.t('search.clear')"
            (click)="filter.query.set('')"
          >
            <i class="pi pi-times text-xs"></i>
          </button>
        }
      </label>
      <app-icon-button
        icon="pi pi-sliders-h"
        [label]="i18n.t('search.filter')"
        [badge]="activeFilters()"
        (pressed)="panel.toggle($event)"
      />
    </div>

    @if (filter.query().trim()) {
      <button
        type="button"
        class="text-ink-muted hover:text-brand animate-pop mt-2 ml-1 flex items-center gap-2 text-sm transition"
        (click)="scrollToMenu()"
      >
        {{ i18n.t('search.found', { n: filter.items().length }) }}
        <span class="text-brand font-semibold"
          >{{ i18n.t('search.viewResults') }} <i class="pi pi-arrow-down text-xs"></i
        ></span>
      </button>
    }

    <p-popover #panel>
      <div class="w-64">
        <p class="text-ink mb-3 text-sm font-bold">{{ i18n.t('search.sort') }}</p>
        <div class="flex flex-col gap-3">
          @for (option of sortOptions; track option.value) {
            <label class="text-ink flex cursor-pointer items-center gap-3 text-sm">
              <p-radiobutton
                name="sort"
                [value]="option.value"
                [ngModel]="filter.sort()"
                (ngModelChange)="filter.sort.set($event)"
              />
              {{ i18n.t(option.labelKey) }}
            </label>
          }
        </div>
        <label
          class="border-line text-ink mt-4 flex cursor-pointer items-center justify-between border-t pt-4 text-sm"
        >
          {{ i18n.t('search.hideSoldOut') }}
          <p-toggleswitch
            [ngModel]="filter.hideSoldOut()"
            (ngModelChange)="filter.hideSoldOut.set($event)"
          />
        </label>
        <p-button
          styleClass="mt-4"
          [label]="i18n.t('search.reset')"
          icon="pi pi-refresh"
          [text]="true"
          size="small"
          [fluid]="true"
          [disabled]="!filter.isFiltered()"
          (onClick)="filter.reset()"
        />
      </div>
    </p-popover>
  `,
})
export class SearchBar {
  protected readonly i18n = inject(I18nService);
  protected readonly filter = inject(MenuFilterService);
  private readonly document = inject(DOCUMENT);

  protected readonly sortOptions: { value: MenuSort; labelKey: TranslationKey }[] = [
    { value: 'recommended', labelKey: 'search.sort.recommended' },
    { value: 'priceAsc', labelKey: 'search.sort.priceAsc' },
    { value: 'priceDesc', labelKey: 'search.sort.priceDesc' },
    { value: 'rating', labelKey: 'search.sort.rating' },
  ];

  protected readonly activeFilters = computed(
    () => Number(this.filter.sort() !== 'recommended') + Number(this.filter.hideSoldOut()),
  );

  protected scrollToMenu(): void {
    this.document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' });
  }
}
