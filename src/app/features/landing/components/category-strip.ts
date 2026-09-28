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
    <div
      class="-mx-4 flex gap-4 overflow-x-auto px-4 py-2 [scrollbar-width:none] md:mx-0 md:gap-6 md:px-0"
    >
      @for (category of categories(); track category.id) {
        <button
          type="button"
          class="group flex w-[4.5rem] shrink-0 flex-col items-center gap-2 md:w-24"
          [attr.aria-pressed]="filter.category() === category.id"
          (click)="filter.category.set(category.id)"
        >
          <span
            class="grid h-16 w-16 place-items-center rounded-full p-2 transition duration-200 md:h-20 md:w-20"
            [class]="
              filter.category() === category.id
                ? 'bg-accent-soft ring-accent scale-105 ring-2'
                : 'bg-card shadow-soft group-hover:-translate-y-1'
            "
          >
            <app-food-plate class="h-full w-full" [palette]="category.palette" />
          </span>
          <span
            class="text-xs md:text-sm"
            [class]="
              filter.category() === category.id
                ? 'text-ink font-bold'
                : 'text-ink-muted font-medium'
            "
          >
            {{ category.label }}
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

  protected readonly categories = computed(() => [
    {
      id: ALL_CATEGORIES,
      label: this.i18n.t('category.all'),
      palette: this.catalog.items()[0]?.palette ?? fallbackPalette(0),
    },
    ...this.catalog.categories().map((category) => ({
      id: category.id,
      label: this.i18n.text(category.name),
      palette: category.palette,
    })),
  ]);
}
