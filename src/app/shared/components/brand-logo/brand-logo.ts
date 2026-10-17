import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { I18nService } from '../../../core/i18n/i18n.service';

export type BrandLogoVariant = 'mark' | 'wide';

const BRAND_LOGO_SOURCES: Record<BrandLogoVariant, { src: string; width: number; height: number }> =
  {
    mark: { src: 'brand/logo-square.png', width: 256, height: 256 },
    wide: { src: 'brand/logo-wide.png', width: 385, height: 103 },
  };

@Component({
  selector: 'app-brand-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-block shrink-0' },
  template: `
    <img
      [src]="source().src"
      [alt]="i18n.t('brand.name')"
      [width]="source().width"
      [height]="source().height"
      decoding="async"
      draggable="false"
      class="h-full w-auto object-contain drop-shadow-[0_6px_14px_rgb(0_0_0/0.28)] select-none"
    />
  `,
})
export class BrandLogo {
  protected readonly i18n = inject(I18nService);
  readonly variant = input<BrandLogoVariant>('mark');
  protected readonly source = computed(() => BRAND_LOGO_SOURCES[this.variant()]);
}
