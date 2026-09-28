import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AvatarModule } from 'primeng/avatar';

import { I18nService } from '../../core/i18n/i18n.service';
import { TIER_LABEL_KEY } from '../../core/member/member-tier';
import { MemberService } from '../../core/member/member.service';
import { Crumb } from '../../shared/components/breadcrumbs/breadcrumbs';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { PointsChip } from '../../shared/components/points-chip/points-chip';
import { SummaryRow } from '../../shared/components/summary-row/summary-row';
import { TierChip } from '../../shared/components/tier-chip/tier-chip';
import { formatDate, formatNumber } from '../../shared/utils/format';

@Component({
  selector: 'app-member-profile',
  imports: [AvatarModule, PageHeader, PointsChip, SummaryRow, TierChip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header [title]="i18n.t('member.profile')" [crumbs]="crumbs" />

    @if (member.profile(); as profile) {
      <div class="mx-auto max-w-2xl px-4 py-6 md:px-8 md:py-8">
        <div class="bg-card border-line shadow-soft animate-pop rounded-3xl border p-6 md:p-8">
          <div class="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
            <p-avatar
              icon="pi pi-user"
              shape="circle"
              size="xlarge"
              styleClass="!bg-brand !text-on-brand shrink-0"
            />
            <div class="min-w-0">
              <h2 class="font-display text-ink truncate text-2xl font-bold">{{ profile.name }}</h2>
              <div class="mt-1.5 flex flex-wrap justify-center gap-1.5 sm:justify-start">
                <app-tier-chip [tier]="member.tier().tier" />
                <app-points-chip [points]="profile.points" />
              </div>
            </div>
          </div>

          <div class="border-line mt-6 flex flex-col gap-4 border-t pt-6">
            <app-summary-row [label]="i18n.t('register.name')" [value]="profile.name" />
            <app-summary-row [label]="i18n.t('register.phone')" [value]="profile.phone" />
            <app-summary-row
              [label]="i18n.t('member.joinedAt')"
              [value]="formatDate(profile.joinedAt, i18n.lang())"
            />
            <app-summary-row
              [label]="i18n.t('member.tier')"
              [value]="i18n.t(tierLabelKey[member.tier().tier])"
            />
            <app-summary-row
              [label]="i18n.t('member.points')"
              [value]="i18n.t('member.pointsUnit', { n: formatNumber(profile.points) })"
            />
          </div>
        </div>
      </div>
    }
  `,
})
export class MemberProfile {
  protected readonly i18n = inject(I18nService);
  protected readonly member = inject(MemberService);

  protected readonly tierLabelKey = TIER_LABEL_KEY;
  protected readonly formatDate = formatDate;
  protected readonly formatNumber = formatNumber;

  protected readonly crumbs: Crumb[] = [
    { labelKey: 'member.dashboard', link: '/member/dashboard' },
    { labelKey: 'member.profile' },
  ];
}
