import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { CatalogStore } from '../../../core/catalog/catalog.store';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ALL_CATEGORIES, MenuFilterService } from '../../../core/menu/menu-filter.service';
import { FoodPlate } from '../../../shared/components/food-plate/food-plate';
import { fallbackPalette } from '../../../core/catalog/catalog.mapper';

@Component({
  selector: 'app-category-strip',
  imports: [FoodPlate],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="-mx-1 flex gap-2.5 overflow-x-auto px-1 py-1 [scrollbar-width:none]">
      @for (category of categories(); track category.id) {
        @let active = filter.category() === category.id;
        <button
          type="button"
          class="group flex h-14 shrink-0 items-center gap-2.5 rounded-full py-1.5 pr-4 pl-1.5 transition duration-200"
          [class]="
            active
              ? 'from-brand to-accent shadow-lift bg-linear-to-r text-white'
              : 'bg-canvas text-ink hover:bg-brand-soft'
          "
          [attr.aria-pressed]="active"
          (click)="filter.category.set(category.id)"
        >
          <span
            class="grid h-11 w-11 shrink-0 place-items-center rounded-full p-1 transition duration-200"
            [class]="active ? 'bg-white/90' : 'bg-card group-hover:rotate-6'"
          >
            <app-food-plate class="h-full w-full" [palette]="category.palette" />
          </span>
          <span class="text-sm font-bold whitespace-nowrap">{{ category.label }}</span>
          <span
            class="grid h-6 min-w-6 place-items-center rounded-full px-1.5 text-xs font-bold tabular-nums"
            [class]="active ? 'bg-white/25 text-white' : 'bg-card text-ink-muted'"
          >
            {{ category.count }}
          </span>
        </button>
      }
    </div>
  `,
})
export class CategoryStrip {
  protected readonly i18n = inject(I18nService);
  protected readonly filter = inject(MenuFilterService);
  private readonly catalog = inject(CatalogStore);

  protected readonly categories = computed(() => {
    const items = this.catalog.items();
    return [
      {
        id: ALL_CATEGORIES,
        label: this.i18n.t('category.all'),
        palette: items[0]?.palette ?? fallbackPalette(0),
        count: items.length,
      },
      ...this.catalog.categories().map((category) => ({
        id: category.id,
        label: this.i18n.text(category.name),
        palette: category.palette,
        count: items.filter((item) => item.categoryId === category.id).length,
      })),
    ];
  });
}
