import { ChangeDetectionStrategy, Component, input, linkedSignal } from '@angular/core';

import { PlatePalette } from '../../../core/models/menu.model';
import { FoodPlate } from '../food-plate/food-plate';

@Component({
  selector: 'app-product-image',
  imports: [FoodPlate],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @if (src() && !failed()) {
      <img
        [src]="src()"
        [alt]="label()"
        loading="lazy"
        decoding="async"
        [class]="imageClass()"
        (error)="failed.set(true)"
      />
    } @else {
      <app-food-plate [class]="plateClass()" [palette]="palette()" [label]="label()" />
    }
  `,
})
export class ProductImage {
  readonly src = input<string | null | undefined>(null);
  readonly palette = input.required<PlatePalette>();
  readonly label = input('');
  readonly imageClass = input('h-full w-full object-cover');
  readonly plateClass = input('mx-auto h-full');

  protected readonly failed = linkedSignal({ source: this.src, computation: () => false });
}
