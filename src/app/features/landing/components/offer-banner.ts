import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { fallbackPalette } from '../../../core/catalog/catalog.mapper';
import { CatalogStore } from '../../../core/catalog/catalog.store';
import { I18nService } from '../../../core/i18n/i18n.service';
import { Chip } from '../../../shared/components/chip/chip';
import { CtaLink } from '../../../shared/components/cta-link/cta-link';
import { FoodPlate } from '../../../shared/components/food-plate/food-plate';

@Component({
  selector: 'app-offer-banner',
  imports: [Chip, CtaLink, FoodPlate],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <section
      id="offers"
      class="from-brand-soft to-accent-soft border-line relative grid grid-cols-[1.3fr_1fr] items-center gap-2 overflow-hidden rounded-[2rem] border bg-linear-to-r px-5 py-6 sm:px-8 md:px-12 md:py-10"
    >
      <div class="relative z-10">
        <app-chip tone="brand">{{ i18n.t('offer.eyebrow') }}</app-chip>
        <h2
          class="font-display text-ink mt-3 text-2xl leading-tight font-extrabold uppercase sm:text-3xl md:text-5xl"
        >
          {{ i18n.t('offer.title') }}
        </h2>
        <p class="text-ink-muted mt-1 text-xs sm:text-sm md:text-base">
          {{ i18n.t('offer.subtitle') }}
        </p>
        <app-cta-link
          class="mt-4 md:mt-6"
          tone="brand"
          [label]="i18n.t('offer.cta')"
          link="/promotions"
        />
      </div>

      <div class="relative aspect-[5/4] w-full">
        <app-food-plate
          class="absolute bottom-0 left-0 w-[62%] drop-shadow-xl"
          [palette]="combo()[0]"
        />
        <app-food-plate
          class="absolute top-[6%] left-[38%] w-[46%] drop-shadow-xl"
          [palette]="combo()[1]"
        />
        <div
          class="bg-brand text-on-brand animate-float absolute top-0 right-0 grid h-16 w-16 place-items-center rounded-full text-center shadow-xl sm:h-20 sm:w-20 md:h-28 md:w-28"
        >
          <span class="leading-none">
            <span class="font-display block text-xl font-extrabold sm:text-2xl md:text-4xl"
              >25%</span
            >
            <span class="text-[0.65rem] font-bold tracking-widest md:text-xs">{{
              i18n.t('offer.off')
            }}</span>
          </span>
        </div>
      </div>
    </section>
  `,
})
export class OfferBanner {
  protected readonly i18n = inject(I18nService);

  private readonly catalog = inject(CatalogStore);

  protected readonly combo = computed(() => [
    this.catalog.byCode('MASSAMAN')?.palette ?? fallbackPalette(1),
    this.catalog.byCode('THAI-TEA')?.palette ?? fallbackPalette(2),
  ]);
}
