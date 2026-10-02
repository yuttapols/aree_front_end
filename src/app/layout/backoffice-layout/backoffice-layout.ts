import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { MenuItem } from 'primeng/api';

import { OrderApi } from '../../core/api/services/order.api';
import { AuthStore } from '../../core/auth/auth.store';
import { I18nService } from '../../core/i18n/i18n.service';
import { ThemeService } from '../../core/theme/theme.service';
import { SignOutService } from '../../shared/services/sign-out.service';
import { AccountMenu } from '../../shared/components/account-menu/account-menu';
import { Avatar } from '../../shared/components/avatar/avatar';
import { BrandLogo } from '../../shared/components/brand-logo/brand-logo';
import { IconButton } from '../../shared/components/icon-button/icon-button';
import { LangSwitch } from '../../shared/components/lang-switch/lang-switch';
import { PAGE_HEADER_CONTAINER } from '../../shared/components/page-header/page-header';
import { SideNav, SideNavItem } from '../../shared/components/side-nav/side-nav';
import { StatusTag } from '../../shared/components/status-tag/status-tag';

const PENDING_POLL_MS = 15_000;

const STAFF_ITEMS: SideNavItem[] = [
  { id: 'today', labelKey: 'bo.nav.today', icon: 'pi pi-home', link: '/backoffice/today' },
  {
    id: 'pos',
    labelKey: 'bo.nav.pos',
    icon: 'pi pi-calculator',
    link: '/backoffice/pos',
    hidden: true,
  },
  {
    id: 'kitchen',
    labelKey: 'bo.nav.kitchen',
    icon: 'pi pi-objects-column',
    link: '/backoffice/kitchen',
    hidden: true,
  },
  { id: 'orders', labelKey: 'bo.nav.orders', icon: 'pi pi-receipt', link: '/backoffice/orders' },
  {
    id: 'payments',
    labelKey: 'bo.nav.payments',
    icon: 'pi pi-wallet',
    link: '/backoffice/payments/pending',
    hidden: true,
  },
  {
    id: 'customers',
    labelKey: 'bo.nav.customers',
    icon: 'pi pi-users',
    link: '/backoffice/customers',
  },
];

const STAFF_GROUPED = STAFF_ITEMS.map((item) => ({ ...item, group: 'bo.group.store' as const }));

const ADMIN_ITEMS: SideNavItem[] = [
  {
    id: 'dashboard',
    labelKey: 'bo.nav.dashboard',
    icon: 'pi pi-chart-bar',
    link: '/backoffice/dashboard',
  },
  { id: 'catalog', labelKey: 'bo.nav.catalog', icon: 'pi pi-book', link: '/backoffice/catalog' },
  {
    id: 'promotions',
    labelKey: 'bo.nav.promotions',
    icon: 'pi pi-percentage',
    link: '/backoffice/promotions',
  },
  { id: 'staff', labelKey: 'bo.nav.staff', icon: 'pi pi-id-card', link: '/backoffice/staff' },
  { id: 'settings', labelKey: 'bo.nav.settings', icon: 'pi pi-cog', link: '/backoffice/settings' },
];

const ADMIN_GROUPED = ADMIN_ITEMS.map((item) => ({ ...item, group: 'bo.group.manage' as const }));

@Component({
  selector: 'app-backoffice-layout',
  imports: [
    RouterLink,
    RouterOutlet,
    AccountMenu,
    Avatar,
    BrandLogo,
    IconButton,
    LangSwitch,
    SideNav,
    StatusTag,
  ],
  providers: [{ provide: PAGE_HEADER_CONTAINER, useValue: 'px-4 md:px-8' }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="bg-royal sticky top-0 z-40 shadow-[0_10px_30px_-12px_rgb(58_20_102/0.55)]">
      <div class="flex items-center gap-3 px-4 py-3 md:px-6">
        <a routerLink="/backoffice" class="flex min-w-0 items-center gap-3">
          <app-brand-logo class="-my-2 h-14 md:h-16" />
          <span class="min-w-0 leading-tight">
            <span class="font-display block truncate text-xl font-extrabold text-white md:text-2xl">
              {{ i18n.t('brand.name') }}
            </span>
            <span class="block truncate text-xs font-medium text-white/70">{{
              i18n.t('bo.title')
            }}</span>
          </span>
        </a>

        <div class="ml-auto flex shrink-0 items-center gap-2">
          <app-icon-button
            class="hidden sm:inline-flex"
            variant="glass"
            icon="pi pi-shop"
            [label]="i18n.t('bo.storefront')"
            (pressed)="openStorefront()"
          />
          <app-lang-switch class="hidden sm:inline-flex" variant="glass" />
          <app-icon-button
            variant="glass"
            [icon]="theme.isDark() ? 'pi pi-sun' : 'pi pi-moon'"
            [label]="i18n.t('nav.theme')"
            (pressed)="theme.toggle()"
          />
          <app-account-menu [items]="menuItems()" [showRole]="true" />
        </div>
      </div>
    </header>

    <div class="flex">
      <app-side-nav
        storageKey="roti.sidebar.backoffice"
        [items]="items()"
        [footerItems]="footerItems"
        [ariaLabel]="i18n.t('bo.title')"
        (actionClick)="onAction($event)"
      >
        @if (auth.user(); as user) {
          <div
            sideNavHeader
            class="bg-royal relative overflow-hidden rounded-2xl p-4 text-white shadow-[0_14px_30px_-16px_rgb(58_20_102/0.8)]"
          >
            <i
              class="pi pi-briefcase pointer-events-none absolute -right-3 -bottom-4 text-[5rem] text-white/10"
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
              <div class="flex min-w-0 flex-col items-start gap-1">
                <p class="w-full truncate text-sm font-bold">{{ user.nickname }}</p>
                <app-status-tag kind="role" [value]="user.role" />
              </div>
            </div>
          </div>
        }
        @if (auth.user(); as user) {
          <span
            sideNavHeaderCompact
            class="ring-brand/30 ring-offset-card rounded-full ring-2 ring-offset-2"
          >
            <app-avatar [url]="user.avatarUrl" [name]="user.nickname" size="large" />
          </span>
        }
      </app-side-nav>
      <main class="min-h-[calc(100dvh-72px)] min-w-0 flex-1">
        <router-outlet />
      </main>
    </div>
  `,
})
export class BackofficeLayout {
  protected readonly i18n = inject(I18nService);
  protected readonly theme = inject(ThemeService);
  protected readonly auth = inject(AuthStore);
  private readonly signOutFlow = inject(SignOutService);
  private readonly orderApi = inject(OrderApi);

  private readonly pendingPayments = signal(0);

  protected readonly footerItems: SideNavItem[] = [
    { id: 'storefront', labelKey: 'bo.storefront', icon: 'pi pi-shop', link: '/', exact: true },
    {
      id: 'logout',
      labelKey: 'member.signOut',
      icon: 'pi pi-sign-out',
      action: 'logout',
      tone: 'danger',
    },
  ];

  protected readonly items = computed<SideNavItem[]>(() => {
    const staff = STAFF_GROUPED.map((item) =>
      item.id === 'payments' ? { ...item, badge: this.pendingPayments() || null } : item,
    );
    return this.auth.isAdmin() ? [...staff, ...ADMIN_GROUPED] : staff;
  });

  protected readonly menuItems = computed<MenuItem[]>(() => [
    { label: this.i18n.t('bo.storefront'), icon: 'pi pi-shop', routerLink: '/' },
    { separator: true },
    {
      label: this.i18n.t('member.signOut'),
      icon: 'pi pi-sign-out',
      styleClass: 'menu-danger',
      command: () => this.logout(),
    },
  ]);

  constructor() {
    this.loadPending();
    const timer = setInterval(() => this.loadPending(), PENDING_POLL_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  protected onAction(action: string): void {
    if (action === 'logout') {
      this.logout();
    }
  }

  protected openStorefront(): void {
    window.open('/', '_blank');
  }

  private logout(): void {
    this.signOutFlow.request();
  }

  private loadPending(): void {
    this.orderApi.payments('PENDING', true).subscribe({
      next: (payments) => this.pendingPayments.set(payments.length),
      error: () => this.pendingPayments.set(0),
    });
  }
}
