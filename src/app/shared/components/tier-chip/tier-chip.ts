import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { I18nService } from '../../../core/i18n/i18n.service';
import { TIER_LABEL_KEY } from '../../../core/member/member-tier';
import { MemberTier } from '../../../core/models/member.model';

const TIER_CLASS: Record<MemberTier, string> = {
  bronze: 'bg-[#f3e1d0] text-[#8a5a2b] dark:bg-[#3d2a1a] dark:text-[#e8b98a]',
  silver: 'bg-[#e6e8ee] text-[#4b5566] dark:bg-[#2c3140] dark:text-[#c3cad8]',
  gold: 'bg-[#fdf0c4] text-[#8a6300] dark:bg-[#3d3212] dark:text-[#f5d36b]',
};

@Component({
  selector: 'app-tier-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex' },
  template: `
    <span
      class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.7rem] font-bold tracking-wide uppercase"
      [class]="tierClass()"
    >
      <i class="pi pi-crown text-[0.65rem]"></i>
      {{ i18n.t(labelKey()) }}
    </span>
  `,
})
export class TierChip {
  protected readonly i18n = inject(I18nService);

  readonly tier = input.required<MemberTier>();

  protected readonly tierClass = computed(() => TIER_CLASS[this.tier()]);
  protected readonly labelKey = computed(() => TIER_LABEL_KEY[this.tier()]);
}
