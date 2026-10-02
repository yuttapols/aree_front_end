import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { OrderApi } from '../../core/api/services/order.api';
import { PromotionApi } from '../../core/api/services/promotion.api';
import { UserApi } from '../../core/api/services/user.api';
import { AuthStore } from '../../core/auth/auth.store';
import { I18nService } from '../../core/i18n/i18n.service';
import { FavoritesService } from '../../core/menu/favorites.service';
import { Crumb } from '../../shared/components/breadcrumbs/breadcrumbs';
import { CtaLink } from '../../shared/components/cta-link/cta-link';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { Panel } from '../../shared/components/panel/panel';
import { PromoCard } from '../../shared/components/promo-card/promo-card';
import { QrCode } from '../../shared/components/qr-code/qr-code';
import { StatCard } from '../../shared/components/stat-card/stat-card';
import { StatusTag } from '../../shared/components/status-tag/status-tag';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { ThaiDatePipe } from '../../shared/pipes/thai-date.pipe';
import { formatDate, formatMoney, formatNumber } from '../../shared/utils/format';

const HISTORY_SIZE = 100;
const RECENT_LIMIT = 5;

@Component({
  selector: 'app-profile-overview',
  imports: [
    RouterLink,
    CtaLink,
    EmptyState,
    PageHeader,
    Panel,
    PromoCard,
    QrCode,
    StatCard,
    StatusTag,
    MoneyPipe,
    ThaiDatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header [title]="i18n.t('profile.nav.overview')" [crumbs]="crumbs" />

    @if (auth.user(); as user) {
      <div class="flex flex-col gap-5 px-4 py-6 md:px-8">
        <section
          class="bg-royal animate-rise relative overflow-hidden rounded-3xl p-6 text-white shadow-[0_24px_48px_-24px_rgb(58_20_102/0.7)] md:p-8"
        >
          <span
            class="bg-accent/20 pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full blur-3xl"
          ></span>
          <i
            class="pi pi-star-fill pointer-events-none absolute -top-6 -right-6 text-[9rem] text-white/5"
          ></i>
          <div class="relative flex flex-wrap items-end justify-between gap-6">
            <div>
              <span class="rounded-full bg-white/15 px-3 py-1 text-xs font-bold tracking-wider">
                {{ user.memberCode }}
              </span>
              <h2 class="font-display mt-3 text-2xl font-bold md:text-3xl">
                {{ i18n.t('member.greeting', { name: user.nickname }) }}
              </h2>
              @if (points(); as summary) {
                <p class="mt-1 text-sm text-white/70">
                  {{ i18n.t('member.pointsRate', { n: summary.earnBahtPerPoint }) }}
                </p>
              }
            </div>
            <div class="flex items-end gap-5">
              @if (user.memberCode; as memberCode) {
                <div class="hidden rounded-2xl bg-white p-2 shadow-lg sm:block">
                  <app-qr-code [value]="memberCode" [size]="88" [label]="memberCode" />
                </div>
              }
              <div class="text-right">
                <p class="text-xs text-white/70">{{ i18n.t('member.points') }}</p>
                <p
                  class="font-display text-accent text-5xl leading-none font-extrabold tabular-nums"
                >
                  {{ format(user.pointsBalance) }}
                </p>
                <a
                  routerLink="/profile/points"
                  class="mt-2 inline-block text-xs text-white/80 underline underline-offset-4"
                >
                  {{ i18n.t('profile.viewPoints') }}
                </a>
              </div>
            </div>
          </div>
          @if (points()?.expiringPoints) {
            <p class="relative mt-5 rounded-2xl bg-white/10 px-4 py-2.5 text-xs">
              <i class="pi pi-clock mr-1"></i>
              {{ expiringText() }}
            </p>
          }
        </section>

        <div class="grid gap-4 sm:grid-cols-3">
          <app-stat-card
            icon="pi pi-receipt"
            [label]="i18n.t('member.stat.orders')"
            [value]="format(stats().count)"
          />
          <app-stat-card
            icon="pi pi-wallet"
            tone="accent"
            [label]="i18n.t('member.stat.spent')"
            [value]="money(stats().spent)"
          />
          <app-stat-card
            icon="pi pi-heart-fill"
            [label]="i18n.t('member.stat.favorites')"
            [value]="format(favorites.ids().size)"
          />
        </div>

        <app-panel [heading]="i18n.t('member.recentOrders')">
          <a
            panelActions
            routerLink="/profile/orders"
            class="text-brand text-sm font-semibold hover:underline"
          >
            {{ i18n.t('common.viewAll') }}
          </a>
          @if (recent().length) {
            <ul class="divide-line divide-y">
              @for (order of recent(); track order.orderNo) {
                <li>
                  <a
                    [routerLink]="['/profile/orders', order.orderNo]"
                    class="hover:bg-canvas -mx-2 flex items-center gap-4 rounded-2xl px-2 py-3 transition"
                  >
                    <span
                      class="bg-brand-soft text-brand grid h-11 w-11 shrink-0 place-items-center rounded-2xl"
                    >
                      <i class="pi pi-receipt"></i>
                    </span>
                    <div class="min-w-0 flex-1">
                      <p class="text-ink truncate text-sm font-semibold">#{{ order.orderNo }}</p>
                      <p class="text-ink-muted truncate text-xs">
                        {{ order.createdAt | thaiDate: i18n.lang() : 'datetime' }} ·
                        {{ i18n.t('member.itemCount', { n: order.items.length }) }}
                      </p>
                    </div>
                    <div class="flex shrink-0 flex-col items-end gap-1">
                      <span class="text-ink text-sm font-bold tabular-nums">{{
                        order.totalAmount | money
                      }}</span>
                      <app-status-tag kind="order" [value]="order.status" />
                    </div>
                  </a>
                </li>
              }
            </ul>
          } @else {
            <app-empty-state icon="pi pi-inbox" [title]="i18n.t('member.noOrders')">
              <app-cta-link fragment="menu" [label]="i18n.t('member.orderNow')" />
            </app-empty-state>
          }
        </app-panel>

        @if (promotions().length) {
          <div>
            <h2 class="text-ink mb-3 text-lg font-bold">{{ i18n.t('profile.promotions') }}</h2>
            <div class="grid gap-4 md:grid-cols-2">
              @for (promotion of promotions(); track promotion.id) {
                <app-promo-card [promotion]="promotion" />
              }
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class ProfileOverview {
  protected readonly i18n = inject(I18nService);
  protected readonly auth = inject(AuthStore);
  protected readonly favorites = inject(FavoritesService);

  protected readonly crumbs: Crumb[] = [{ labelKey: 'profile.nav.overview' }];
  protected readonly format = formatNumber;

  private readonly orders = toSignal(
    inject(OrderApi)
      .myOrders(0, HISTORY_SIZE)
      .pipe(
        map((page) => page.items),
        catchError(() => of([])),
      ),
    { initialValue: [] },
  );

  protected readonly points = toSignal(
    inject(UserApi)
      .myPoints()
      .pipe(catchError(() => of(null))),
  );

  protected readonly promotions = toSignal(
    inject(PromotionApi)
      .publicList()
      .pipe(
        map((list) => list.slice(0, 2)),
        catchError(() => of([])),
      ),
    { initialValue: [] },
  );

  protected readonly recent = computed(() => this.orders().slice(0, RECENT_LIMIT));

  protected readonly stats = computed(() => {
    const completed = this.orders().filter((order) => order.status === 'COMPLETED');
    return {
      count: this.orders().filter((order) => order.status !== 'CANCELLED').length,
      spent: completed.reduce((total, order) => total + order.totalAmount, 0),
    };
  });

  protected readonly expiringText = computed(() => {
    const summary = this.points();
    return summary
      ? this.i18n.t('points.expiring', {
          n: formatNumber(summary.expiringPoints),
          date: formatDate(summary.expiringAt, this.i18n.lang()),
        })
      : '';
  });

  protected money(value: number): string {
    return formatMoney(value, false);
  }
}
