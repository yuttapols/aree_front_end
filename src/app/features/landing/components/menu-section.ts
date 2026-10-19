import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { I18nService } from '../../../core/i18n/i18n.service';
import { MenuFilterService } from '../../../core/menu/menu-filter.service';
import { MenuCard } from './menu-card';

@Component({
  selector: 'app-menu-section',
  imports: [MenuCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @if (filter.isFiltered()) {
      <div class="text-ink-muted animate-pop mb-4 flex items-center gap-3 text-sm">
        <span>{{ i18n.t('search.found', { n: filter.items().length }) }}</span>
        <button
          type="button"
          class="text-brand font-semibold hover:underline"
          (click)="filter.reset()"
        >
          {{ i18n.t('search.reset') }}
        </button>
      </div>
    }

    <div class="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
      @for (item of filter.items(); track item.id) {
        <app-menu-card [item]="item" />
      } @empty {
        <div
          class="bg-card border-line col-span-full flex flex-col items-center rounded-3xl border border-dashed px-6 py-14 text-center"
        >
          <span class="relative mb-5">
            <span
              class="bg-brand-soft animate-float grid h-24 w-24 place-items-center rounded-full"
            >
              <i
                class="text-brand text-4xl"
                [class]="filter.catalogEmpty() ? 'pi pi-inbox' : 'pi pi-search'"
              ></i>
            </span>
            <i class="pi pi-star-fill text-accent absolute -top-1 -right-2 text-lg"></i>
          </span>
          <p class="font-display text-ink text-xl font-bold">
            {{ i18n.t(filter.catalogEmpty() ? 'menu.emptyCatalog' : 'menu.empty') }}
          </p>
          @if (!filter.catalogEmpty()) {
            <p class="text-ink-muted mt-1 text-sm">{{ i18n.t('menu.emptyHint') }}</p>
            <button
              type="button"
              class="from-brand to-accent shadow-lift mt-6 inline-flex items-center gap-2 rounded-full bg-linear-to-r px-6 py-3 font-bold text-white transition hover:brightness-110 active:scale-95"
              (click)="filter.reset()"
            >
              <i class="pi pi-th-large"></i>{{ i18n.t('menu.viewAll') }}
            </button>
          }
        </div>
      }
    </div>
  `,
})
export class MenuSection {
  protected readonly i18n = inject(I18nService);
  protected readonly filter = inject(MenuFilterService);
}
