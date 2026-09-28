import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslationKey } from '../../../core/i18n/translations';
import { Crumb } from '../../../shared/components/breadcrumbs/breadcrumbs';
import { PageHeader } from '../../../shared/components/page-header/page-header';

@Component({
  selector: 'app-catalog-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, PageHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header [title]="i18n.t('bo.nav.catalog')" [crumbs]="crumbs" />
    <div class="flex flex-col gap-5 px-4 py-6 md:px-8">
      <nav class="flex gap-2 overflow-x-auto" [attr.aria-label]="i18n.t('bo.nav.catalog')">
        @for (tab of tabs; track tab.link) {
          <a
            [routerLink]="tab.link"
            routerLinkActive="!bg-brand !text-on-brand shadow"
            class="bg-card border-line text-ink-muted hover:text-ink flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition"
          >
            <i [class]="tab.icon"></i>{{ i18n.t(tab.labelKey) }}
          </a>
        }
      </nav>
      <router-outlet />
    </div>
  `,
})
export class CatalogLayout {
  protected readonly i18n = inject(I18nService);

  protected readonly crumbs: Crumb[] = [
    { labelKey: 'bo.title', link: '/backoffice' },
    { labelKey: 'bo.nav.catalog' },
  ];

  protected readonly tabs: { link: string; labelKey: TranslationKey; icon: string }[] = [
    { link: 'products', labelKey: 'catalog.products', icon: 'pi pi-box' },
    { link: 'categories', labelKey: 'catalog.categories', icon: 'pi pi-tags' },
    { link: 'option-groups', labelKey: 'catalog.optionGroups', icon: 'pi pi-list-check' },
  ];
}
