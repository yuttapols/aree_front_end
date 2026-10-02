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
        <div class="col-span-full py-12 text-center">
          <span
            class="bg-brand-soft text-brand mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full"
          >
            <i [class]="filter.catalogEmpty() ? 'pi pi-inbox' : 'pi pi-search'" class="text-xl"></i>
          </span>
          <p class="text-ink-muted">
            {{ i18n.t(filter.catalogEmpty() ? 'menu.emptyCatalog' : 'menu.empty') }}
          </p>
        </div>
      }
    </div>
  `,
})
export class MenuSection {
  protected readonly i18n = inject(I18nService);
  protected readonly filter = inject(MenuFilterService);
}
