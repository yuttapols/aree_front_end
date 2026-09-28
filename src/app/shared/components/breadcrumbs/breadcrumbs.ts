import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { BreadcrumbModule } from 'primeng/breadcrumb';

import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslationKey } from '../../../core/i18n/translations';

export interface Crumb {
  labelKey: TranslationKey;
  link?: string;
  fragment?: string;
}

@Component({
  selector: 'app-breadcrumbs',
  imports: [BreadcrumbModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <nav [attr.aria-label]="i18n.t('crumb.home')">
      <p-breadcrumb [model]="model()" [home]="home()" [dt]="tokens" />
    </nav>
  `,
})
export class Breadcrumbs {
  protected readonly i18n = inject(I18nService);

  readonly items = input.required<Crumb[]>();

  protected readonly tokens = {
    background: 'transparent',
    padding: '0',
    gap: '0.5rem',
    item: {
      color: 'var(--app-ink-muted)',
      hoverColor: 'var(--app-brand)',
      iconColor: 'var(--app-ink-muted)',
      iconHoverColor: 'var(--app-brand)',
    },
    separator: { color: 'color-mix(in srgb, var(--app-ink-muted) 55%, transparent)' },
  };

  protected readonly home = computed<MenuItem>(() => ({
    icon: 'pi pi-home',
    routerLink: '/',
    title: this.i18n.t('crumb.home'),
  }));

  protected readonly model = computed<MenuItem[]>(() =>
    this.items().map((crumb) => ({
      label: this.i18n.t(crumb.labelKey),
      routerLink: crumb.link,
      fragment: crumb.fragment,
    })),
  );
}
