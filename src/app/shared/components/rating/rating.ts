import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { formatCompact } from '../../utils/price';

@Component({
  selector: 'app-rating',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex items-center gap-1 text-xs' },
  template: `
    <i class="pi pi-star-fill text-[0.7rem] text-[#f5b301]"></i>
    <span class="text-ink font-semibold">{{ value().toFixed(1) }}</span>
    @if (count()) {
      <span class="text-ink-muted">({{ compactCount() }})</span>
    }
  `,
})
export class Rating {
  readonly value = input.required<number>();
  readonly count = input(0);

  protected readonly compactCount = computed(() => formatCompact(this.count()));
}
