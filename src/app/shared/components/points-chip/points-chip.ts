import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { I18nService } from '../../../core/i18n/i18n.service';
import { formatNumber } from '../../utils/format';

@Component({
  selector: 'app-points-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex' },
  template: `
    <span
      class="bg-accent inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap text-white tabular-nums"
      [attr.title]="i18n.t('member.points')"
    >
      <i class="pi pi-star-fill text-[0.65rem]"></i>
      {{ label() }}
    </span>
  `,
})
export class PointsChip {
  protected readonly i18n = inject(I18nService);

  readonly points = input.required<number>();

  protected readonly label = computed(() =>
    this.i18n.t('member.pointsUnit', { n: formatNumber(this.points()) }),
  );
}
