import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { AuthStore } from '../../core/auth/auth.store';
import { I18nService } from '../../core/i18n/i18n.service';
import { SignOutService } from '../../shared/services/sign-out.service';
import { Avatar } from '../../shared/components/avatar/avatar';
import { PAGE_HEADER_CONTAINER } from '../../shared/components/page-header/page-header';
import { SideNav, SideNavItem } from '../../shared/components/side-nav/side-nav';
import { formatNumber } from '../../shared/utils/format';

@Component({
  selector: 'app-profile-layout',
  imports: [RouterLink, RouterOutlet, Avatar, SideNav],
  providers: [{ provide: PAGE_HEADER_CONTAINER, useValue: 'px-4 md:px-8' }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex">
      <app-side-nav
        storageKey="roti.sidebar.profile"
        [items]="items"
        [footerItems]="footerItems"
        [ariaLabel]="i18n.t('member.menu')"
        (actionClick)="onAction($event)"
      >
        @if (auth.user(); as user) {
          <div
            sideNavHeader
            class="bg-royal relative overflow-hidden rounded-2xl p-4 text-white shadow-[0_14px_30px_-16px_rgb(58_20_102/0.8)]"
          >
            <i
              class="pi pi-star-fill pointer-events-none absolute -top-3 -right-3 text-[5.5rem] text-white/10"
            ></i>
            <div class="relative flex items-center gap-3">
              <span class="rounded-full ring-2 ring-white/40">
                <app-avatar
                  [url]="user.avatarUrl"
                  [name]="user.nickname"
                  size="large"
                  tone="glass"
                />
              </span>
              <div class="min-w-0">
                <p class="truncate text-sm font-bold">{{ user.nickname }}</p>
                <p class="text-[0.7rem] tracking-wider text-white/70">{{ user.memberCode }}</p>
              </div>
            </div>
            @if (auth.isCustomer()) {
              <a
                routerLink="/profile/points"
                class="relative mt-4 flex items-end justify-between rounded-xl bg-white/10 px-3 py-2.5 transition hover:bg-white/15"
              >
                <span class="text-[0.7rem] text-white/75">{{ i18n.t('member.points') }}</span>
                <span
                  class="font-display text-accent text-2xl leading-none font-extrabold tabular-nums"
                >
                  {{ format(user.pointsBalance) }}
                  <i class="pi pi-star-fill text-xs"></i>
                </span>
              </a>
            }
          </div>
        }
        @if (auth.user(); as user) {
          <a
            sideNavHeaderCompact
            routerLink="/profile/info"
            class="ring-brand/30 ring-offset-card rounded-full ring-2 ring-offset-2"
            [attr.aria-label]="user.nickname"
          >
            <app-avatar [url]="user.avatarUrl" [name]="user.nickname" size="large" />
          </a>
        }
      </app-side-nav>
      <div class="min-w-0 flex-1">
        <router-outlet />
      </div>
    </div>
  `,
})
export class ProfileLayout {
  protected readonly i18n = inject(I18nService);
  protected readonly auth = inject(AuthStore);
  private readonly authService = inject(AuthService);
  private readonly signOutFlow = inject(SignOutService);

  protected readonly format = formatNumber;

  protected readonly items: SideNavItem[] = [
    {
      id: 'overview',
      labelKey: 'profile.nav.overview',
      icon: 'pi pi-th-large',
      link: '/profile',
      exact: true,
      group: 'sidenav.account',
    },
    {
      id: 'info',
      labelKey: 'profile.nav.info',
      icon: 'pi pi-id-card',
      link: '/profile/info',
      group: 'sidenav.account',
    },
    {
      id: 'orders',
      labelKey: 'profile.nav.orders',
      icon: 'pi pi-receipt',
      link: '/profile/orders',
      group: 'sidenav.activity',
    },
    {
      id: 'points',
      labelKey: 'profile.nav.points',
      icon: 'pi pi-star',
      link: '/profile/points',
      group: 'sidenav.activity',
    },
  ];

  protected readonly footerItems: SideNavItem[] = [
    {
      id: 'menu',
      labelKey: 'member.backToMenu',
      icon: 'pi pi-shopping-bag',
      link: '/',
      fragment: 'menu',
      exact: true,
    },
    {
      id: 'logout',
      labelKey: 'member.signOut',
      icon: 'pi pi-sign-out',
      action: 'logout',
      tone: 'danger',
    },
  ];

  constructor() {
    this.authService.reloadMe().subscribe();
  }

  protected onAction(action: string): void {
    if (action === 'logout') {
      this.signOutFlow.request();
    }
  }
}
