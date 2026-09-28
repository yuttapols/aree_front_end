import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ProgressBarModule } from 'primeng/progressbar';

import { I18nService } from '../../core/i18n/i18n.service';
import { TIER_LABEL_KEY } from '../../core/member/member-tier';
import { MemberService } from '../../core/member/member.service';
import { FavoritesService } from '../../core/menu/favorites.service';
import { Crumb } from '../../shared/components/breadcrumbs/breadcrumbs';
import { CtaLink } from '../../shared/components/cta-link/cta-link';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { StatCard } from '../../shared/components/stat-card/stat-card';
import { TierChip } from '../../shared/components/tier-chip/tier-chip';
import { formatDate, formatNumber } from '../../shared/utils/format';
import { formatBaht } from '../../shared/utils/price';

const RECENT_ORDER_LIMIT = 5;

@Component({
  selector: 'app-member-dashboard',
  imports: [ProgressBarModule, CtaLink, PageHeader, StatCard, TierChip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header [title]="i18n.t('member.dashboard')" [crumbs]="crumbs" />

    @if (member.profile(); as profile) {
      <div class="mx-auto flex max-w-5xl flex-col gap-5 px-4 py-6 md:px-8 md:py-8">
        <section class="bg-royal relative overflow-hidden rounded-3xl p-6 text-white md:p-8">
          <i
            class="pi pi-star-fill pointer-events-none absolute -top-6 -right-6 text-[9rem] text-white/5"
          ></i>
          <div class="relative flex flex-wrap items-end justify-between gap-6">
            <div>
              <app-tier-chip [tier]="member.tier().tier" />
              <h2 class="font-display mt-3 text-2xl font-bold md:text-3xl">
                {{ i18n.t('member.greeting', { name: profile.name }) }}
              </h2>
              <p class="mt-1 text-sm text-white/70">{{ i18n.t('member.pointsRate') }}</p>
            </div>
            <div class="text-right">
              <p class="text-xs text-white/70">{{ i18n.t('member.points') }}</p>
              <p class="font-display text-accent text-5xl leading-none font-extrabold tabular-nums">
                {{ formatNumber(profile.points) }}
              </p>
            </div>
          </div>

          <div class="relative mt-6">
            <p-progressbar
              [value]="member.tier().percent"
              [showValue]="false"
              [dt]="progressTokens"
            />
            <p class="mt-2 text-xs text-white/80">{{ nextTierText() }}</p>
          </div>
        </section>

        <div class="grid gap-4 sm:grid-cols-3">
          <app-stat-card
            icon="pi pi-receipt"
            [label]="i18n.t('member.stat.orders')"
            [value]="formatNumber(profile.orders.length)"
          />
          <app-stat-card
            icon="pi pi-wallet"
            tone="accent"
            [label]="i18n.t('member.stat.spent')"
            [value]="formatBaht(totalSpent())"
          />
          <app-stat-card
            icon="pi pi-heart-fill"
            [label]="i18n.t('member.stat.favorites')"
            [value]="formatNumber(favorites.ids().size)"
          />
        </div>

        <section class="bg-card border-line shadow-soft rounded-3xl border p-5 md:p-6">
          <h2 class="text-ink mb-2 text-lg font-bold">{{ i18n.t('member.recentOrders') }}</h2>
          @if (recentOrders().length) {
            <ul class="divide-line divide-y">
              @for (order of recentOrders(); track order.orderNo) {
                <li class="flex items-center gap-4 py-3.5">
                  <span
                    class="bg-brand-soft text-brand grid h-11 w-11 shrink-0 place-items-center rounded-2xl"
                  >
                    <i class="pi pi-receipt"></i>
                  </span>
                  <div class="min-w-0 flex-1">
                    <p class="text-ink truncate text-sm font-semibold">#{{ order.orderNo }}</p>
                    <p class="text-ink-muted truncate text-xs">
                      {{ formatDate(order.placedAt, i18n.lang(), true) }} ·
                      {{ i18n.t('member.itemCount', { n: order.itemCount }) }}
                    </p>
                  </div>
                  <div class="shrink-0 text-right">
                    <p class="text-ink text-sm font-bold tabular-nums">
                      {{ formatBaht(order.total) }}
                    </p>
                    <p class="text-accent text-xs font-semibold">
                      {{ i18n.t('member.pointsEarned', { n: order.pointsEarned }) }}
                    </p>
                  </div>
                </li>
              }
            </ul>
          } @else {
            <div class="py-8 text-center">
              <span
                class="bg-brand-soft text-brand mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full"
              >
                <i class="pi pi-inbox text-xl"></i>
              </span>
              <p class="text-ink-muted mb-4 text-sm">{{ i18n.t('member.noOrders') }}</p>
              <app-cta-link fragment="menu" [label]="i18n.t('member.orderNow')" />
            </div>
          }
        </section>
      </div>
    }
  `,
})
export class MemberDashboard {
  protected readonly i18n = inject(I18nService);
  protected readonly member = inject(MemberService);
  protected readonly favorites = inject(FavoritesService);

  protected readonly formatBaht = formatBaht;
  protected readonly formatNumber = formatNumber;
  protected readonly formatDate = formatDate;

  protected readonly crumbs: Crumb[] = [{ labelKey: 'member.dashboard' }];

  protected readonly progressTokens = {
    background: 'rgb(255 255 255 / 0.15)',
    height: '0.6rem',
    borderRadius: '999px',
    value: { background: 'var(--app-accent)' },
  };

  protected readonly recentOrders = computed(() =>
    (this.member.profile()?.orders ?? []).slice(0, RECENT_ORDER_LIMIT),
  );

  protected readonly totalSpent = computed(() =>
    (this.member.profile()?.orders ?? []).reduce((total, order) => total + order.total, 0),
  );

  protected readonly nextTierText = computed(() => {
    const { nextTier, pointsToNext } = this.member.tier();
    if (!nextTier) {
      return this.i18n.t('member.topTier');
    }
    return this.i18n.t('member.toNextTier', {
      n: formatNumber(pointsToNext),
      tier: this.i18n.t(TIER_LABEL_KEY[nextTier]),
    });
  });
}
