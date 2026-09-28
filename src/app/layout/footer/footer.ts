import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { I18nService } from '../../core/i18n/i18n.service';
import { ShopInfoStore } from '../../core/shop/shop-info.store';
import { BrandLogo } from '../../shared/components/brand-logo/brand-logo';

@Component({
  selector: 'app-footer',
  imports: [BrandLogo],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <footer id="contact" class="bg-brand-deep text-white/80">
      <div class="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-2 md:px-6">
        <div>
          <div class="flex items-center gap-4">
            <app-brand-logo class="h-20" />
            <div>
              <p class="font-display text-accent text-3xl font-extrabold">
                {{ i18n.t('brand.name') }}
              </p>
              <p class="mt-1 text-sm">{{ i18n.t('brand.tagline') }}</p>
            </div>
          </div>
          <div class="mt-5 flex gap-2">
            @for (social of socials; track social) {
              <a
                href="#"
                class="hover:bg-accent grid h-10 w-10 place-items-center rounded-full bg-white/10 transition hover:text-white"
                [attr.aria-label]="social"
              >
                <i [class]="'pi pi-' + social"></i>
              </a>
            }
          </div>
        </div>
        <div>
          <p class="flex items-center gap-2 text-lg font-bold text-white">
            {{ i18n.t('contact.title') }}
            @if (shop.info(); as info) {
              <span
                class="rounded-full px-2 py-0.5 text-[0.7rem] font-bold"
                [class]="
                  info.isOpenNow
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-white/10 text-white/60'
                "
              >
                {{ i18n.t(info.isOpenNow ? 'contact.openNow' : 'contact.closedNow') }}
              </span>
            }
          </p>
          <ul class="mt-4 flex flex-col gap-3 text-sm">
            @for (row of contacts(); track row.icon) {
              <li class="flex items-start gap-3">
                <i [class]="row.icon" class="text-accent mt-0.5"></i>
                <span>{{ row.text }}</span>
              </li>
            }
          </ul>
        </div>
      </div>
      <p class="border-t border-white/10 py-5 text-center text-xs text-white/50">
        © {{ year }} {{ i18n.t('brand.name') }} · {{ i18n.t('contact.rights') }}
      </p>
    </footer>
  `,
})
export class Footer {
  protected readonly i18n = inject(I18nService);
  protected readonly shop = inject(ShopInfoStore);

  protected readonly year = new Date().getFullYear();
  protected readonly socials = ['facebook', 'instagram', 'tiktok', 'youtube'];

  protected readonly contacts = computed(() => {
    const info = this.shop.info();
    return [
      { icon: 'pi pi-map-marker', text: info?.address || this.i18n.t('contact.address') },
      {
        icon: 'pi pi-clock',
        text: info
          ? this.i18n.t('contact.hoursFrom', { open: info.openTime, close: info.closeTime })
          : this.i18n.t('contact.hours'),
      },
      { icon: 'pi pi-phone', text: info?.phone || this.i18n.t('contact.phone') },
    ];
  });

  constructor() {
    this.shop.load();
  }
}
