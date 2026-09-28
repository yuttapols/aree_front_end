import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { BrandLogo } from '../brand-logo/brand-logo';

@Component({
  selector: 'app-auth-card',
  imports: [BrandLogo],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="bg-card border-line shadow-soft animate-pop rounded-3xl border p-6 md:p-7">
      <div class="text-center">
        <app-brand-logo class="mx-auto block h-28" />
        <h2 class="font-display text-ink mt-3 text-2xl font-bold">{{ heading() }}</h2>
        <p class="text-ink-muted mt-1 text-sm">{{ subtitle() }}</p>
      </div>

      <ng-content />

      <div class="border-line text-ink-muted mt-6 border-t pt-5 text-center text-sm">
        <ng-content select="[authFooter]" />
      </div>
    </div>
  `,
})
export class AuthCard {
  readonly heading = input.required<string>();
  readonly subtitle = input.required<string>();
}
