import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { PlatePalette } from '../../../core/models/menu.model';

@Component({
  selector: 'app-food-plate',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <svg viewBox="0 0 120 120" class="h-full w-full" role="img" [attr.aria-label]="label()">
      <circle cx="60" cy="60" r="50" class="fill-white dark:fill-[#f4ebdd]" />
      <circle cx="60" cy="60" r="50" fill="none" stroke="#e8dccb" stroke-width="2" />
      <circle cx="60" cy="62" r="36" [attr.fill]="palette().base" />
      <ellipse cx="54" cy="64" rx="22" ry="17" [attr.fill]="palette().main" />
      <ellipse cx="72" cy="52" rx="14" ry="11" [attr.fill]="palette().accent" />
      <circle cx="42" cy="54" r="4" [attr.fill]="palette().garnish" />
      <circle cx="58" cy="80" r="3.5" [attr.fill]="palette().garnish" />
      <circle cx="76" cy="72" r="3" [attr.fill]="palette().garnish" />
      <circle cx="48" cy="74" r="2.5" [attr.fill]="palette().garnish" />
    </svg>
  `,
})
export class FoodPlate {
  readonly palette = input.required<PlatePalette>();
  readonly label = input('');
}
