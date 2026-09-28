import { ChangeDetectionStrategy, Component, InjectionToken, inject, input } from '@angular/core';

import { Breadcrumbs, Crumb } from '../breadcrumbs/breadcrumbs';

export const PAGE_HEADER_CONTAINER = new InjectionToken<string>('PAGE_HEADER_CONTAINER', {
  factory: () => 'mx-auto max-w-6xl px-4 md:px-6',
});

@Component({
  selector: 'app-page-header',
  imports: [Breadcrumbs],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <header [class]="container() ?? defaultContainer">
      <div class="pt-5 md:pt-6">
        <app-breadcrumbs [items]="crumbs()" />
        <h1 class="sr-only">{{ title() }}</h1>
      </div>
    </header>
  `,
})
export class PageHeader {
  protected readonly defaultContainer = inject(PAGE_HEADER_CONTAINER);

  readonly title = input.required<string>();
  readonly crumbs = input.required<Crumb[]>();
  readonly container = input<string | null>(null);
}
