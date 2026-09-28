import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { I18nService } from '../../../core/i18n/i18n.service';

export const BRAND_LOGO_SRC = 'brand/logo.webp';

@Component({
  selector: 'app-brand-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-block shrink-0' },
  template: `
    <img
      [src]="src"
      [alt]="i18n.t('brand.name')"
      width="364"
      height="337"
      decoding="async"
      draggable="false"
      class="h-full w-auto object-contain drop-shadow-[0_6px_14px_rgb(0_0_0/0.28)] select-none"
    />
  `,
})
export class BrandLogo {
  protected readonly i18n = inject(I18nService);
  protected readonly src = BRAND_LOGO_SRC;
}
