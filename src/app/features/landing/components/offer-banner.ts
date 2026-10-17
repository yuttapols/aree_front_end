import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { BannerStore } from '../../../core/banner/banner.store';
import { I18nService } from '../../../core/i18n/i18n.service';
import { BannerBackdrop } from '../../../shared/components/banner-backdrop/banner-backdrop';
import { Chip } from '../../../shared/components/chip/chip';
import { CtaLink } from '../../../shared/components/cta-link/cta-link';
import {
  bannerLink,
  DEFAULT_BANNER_IMAGE,
  DEFAULT_BANNER_IMAGE_MOBILE,
} from '../../../shared/utils/banner';

@Component({
  selector: 'app-offer-banner',
  imports: [BannerBackdrop, Chip, CtaLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @if (banner(); as current) {
      <section
        id="offers"
        class="bg-royal relative overflow-hidden rounded-[2rem] px-5 py-8 text-white sm:px-8 md:aspect-[12/4] md:px-12 md:py-12"
      >
        <app-banner-backdrop
          variant="vivid"
          [url]="current.imageUrl"
          [mobileUrl]="current.imageUrlMobile"
        />
        <div class="relative z-10 max-w-[60%]">
          <app-chip tone="accent">{{ i18n.t('offer.eyebrow') }}</app-chip>
          @if (current.title) {
            <h2
              class="font-display mt-3 text-2xl leading-tight font-extrabold uppercase sm:text-3xl md:text-5xl"
            >
              {{ i18n.pick(current.title, current.titleEn) }}
            </h2>
          }
          @if (current.subtitle) {
            <p class="mt-1 text-xs text-white/80 sm:text-sm md:text-base">
              {{ i18n.pick(current.subtitle, current.subtitleEn) }}
            </p>
          }
          @if (link(); as target) {
            <app-cta-link
              class="mt-4 md:mt-6"
              [label]="ctaLabel()"
              [link]="target.path"
              [fragment]="target.fragment"
              [external]="target.external"
            />
          }
        </div>
      </section>
    } @else {
      <section
        id="offers"
        class="bg-royal relative overflow-hidden rounded-[2rem] px-5 py-8 text-white sm:px-8 md:aspect-[12/4] md:px-12 md:py-12"
      >
        <app-banner-backdrop
          variant="vivid"
          [url]="defaultImage"
          [mobileUrl]="defaultImageMobile"
        />
        <div class="relative z-10 max-w-[60%]">
          <app-chip tone="accent">{{ i18n.t('offer.eyebrow') }}</app-chip>
          <h2
            class="font-display mt-3 text-2xl leading-tight font-extrabold uppercase sm:text-3xl md:text-5xl"
          >
            {{ i18n.t('offer.title') }}
          </h2>
          <p class="mt-1 text-xs text-white/80 sm:text-sm md:text-base">
            {{ i18n.t('offer.subtitle') }}
          </p>
          <app-cta-link class="mt-4 md:mt-6" [label]="i18n.t('offer.cta')" link="/promotions" />
        </div>
      </section>
    }
  `,
})
export class OfferBanner {
  protected readonly i18n = inject(I18nService);

  private readonly banners = inject(BannerStore);

  protected readonly defaultImage = DEFAULT_BANNER_IMAGE;
  protected readonly defaultImageMobile = DEFAULT_BANNER_IMAGE_MOBILE;
  protected readonly banner = computed(() => this.banners.offer()[0] ?? null);
  protected readonly link = computed(() => {
    const current = this.banner();
    return current ? bannerLink(current) : null;
  });
  protected readonly ctaLabel = computed(() => {
    const current = this.banner();
    return current?.ctaLabel
      ? this.i18n.pick(current.ctaLabel, current.ctaLabelEn)
      : this.i18n.t('offer.cta');
  });

  constructor() {
    this.banners.load();
  }
}
