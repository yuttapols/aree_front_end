import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';

import { I18nService } from '../../core/i18n/i18n.service';

@Component({
  selector: 'app-status-page',
  imports: [RouterLink, ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
      <p class="font-display text-accent text-7xl font-extrabold">{{ forbidden() ? 403 : 404 }}</p>
      <h1 class="text-ink mt-3 text-2xl font-bold">
        {{ i18n.t(forbidden() ? 'status.forbidden.title' : 'status.notFound.title') }}
      </h1>
      <p class="text-ink-muted mt-2 text-sm">
        {{ i18n.t(forbidden() ? 'status.forbidden.hint' : 'status.notFound.hint') }}
      </p>
      <a
        pButton
        routerLink="/"
        class="mt-6"
        [label]="i18n.t('crumb.home')"
        icon="pi pi-home"
        [rounded]="true"
      ></a>
    </div>
  `,
})
export class StatusPage {
  protected readonly i18n = inject(I18nService);

  readonly kind = input<'forbidden' | 'notFound'>('notFound');

  protected readonly forbidden = computed(() => this.kind() === 'forbidden');
}
