import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { DrawerModule } from 'primeng/drawer';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { filter, map } from 'rxjs';

import { AuthStore } from '../../core/auth/auth.store';
import { CartService } from '../../core/cart/cart.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/translations';
import { ThemeService } from '../../core/theme/theme.service';
import { SignOutService } from '../../shared/services/sign-out.service';
import { AccountMenu } from '../../shared/components/account-menu/account-menu';
import { BrandLogo } from '../../shared/components/brand-logo/brand-logo';
import { IconButton } from '../../shared/components/icon-button/icon-button';
import { LangSwitch } from '../../shared/components/lang-switch/lang-switch';

interface NavLink {
  labelKey: TranslationKey;
  link: string;
  fragment?: string;
  icon: string;
}

interface AccountLink {
  labelKey: TranslationKey;
  icon: string;
  link: string;
}

const CUSTOMER_LINKS: AccountLink[] = [
  { labelKey: 'profile.nav.info', icon: 'pi pi-id-card', link: '/profile/info' },
  { labelKey: 'profile.nav.overview', icon: 'pi pi-th-large', link: '/profile' },
  { labelKey: 'profile.nav.orders', icon: 'pi pi-receipt', link: '/profile/orders' },
  { labelKey: 'profile.nav.points', icon: 'pi pi-star', link: '/profile/points' },
];

const STAFF_LINKS: AccountLink[] = [
  { labelKey: 'nav.backoffice', icon: 'pi pi-briefcase', link: '/backoffice' },
];

@Component({
  selector: 'app-navbar',
  imports: [
    FormsModule,
    RouterLink,
    DrawerModule,
    ToggleSwitchModule,
    AccountMenu,
    BrandLogo,
    IconButton,
    LangSwitch,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'sticky top-0 z-40 block' },
  template: `
    <nav class="bg-royal shadow-[0_10px_30px_-12px_rgb(58_20_102/0.55)]">
      <div class="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 md:px-6">
        <app-icon-button
          class="lg:hidden"
          variant="glass"
          icon="pi pi-bars"
          [label]="i18n.t('nav.openMenu')"
          (pressed)="mobileOpen.set(true)"
        />

        <a routerLink="/" class="group flex min-w-0 items-center gap-3">
          <app-brand-logo
            class="-my-2 hidden h-16 transition group-hover:scale-105 group-hover:-rotate-3 sm:block"
          />
          <span class="min-w-0 leading-tight">
            <span
              class="font-display block truncate text-2xl font-extrabold tracking-tight text-white md:text-[1.7rem]"
            >
              {{ i18n.t('brand.name') }}
            </span>
            <span class="block truncate text-xs font-medium text-white/70">{{
              i18n.t('brand.tagline')
            }}</span>
          </span>
        </a>

        <ul class="ml-auto hidden items-center gap-1 lg:flex">
          @for (link of links; track link.labelKey) {
            <li>
              <a
                [routerLink]="link.link"
                [fragment]="link.fragment"
                class="rounded-xl px-3 py-2 text-sm font-medium text-white/85 transition hover:bg-white/10 hover:text-white"
              >
                {{ i18n.t(link.labelKey) }}
              </a>
            </li>
          }
        </ul>

        <div class="ml-auto flex shrink-0 items-center gap-2 lg:ml-3">
          <app-lang-switch class="hidden sm:inline-flex" variant="glass" />
          <app-icon-button
            class="hidden sm:inline-flex"
            variant="glass"
            [icon]="theme.isDark() ? 'pi pi-sun' : 'pi pi-moon'"
            [label]="i18n.t('nav.theme')"
            (pressed)="theme.toggle()"
          />
          <app-icon-button
            variant="glass"
            icon="pi pi-shopping-bag"
            [label]="i18n.t('nav.cart')"
            [badge]="cart.count()"
            (pressed)="cart.drawerOpen.set(true)"
          />
          @if (auth.isLoggedIn()) {
            <app-account-menu [items]="accountMenuItems()" />
          } @else {
            <a
              routerLink="/login"
              class="flex h-12 items-center rounded-2xl border border-white/15 bg-white/10 px-4 text-sm font-semibold whitespace-nowrap text-white transition hover:-translate-y-0.5 hover:bg-white/20 active:scale-95"
            >
              {{ i18n.t('nav.register') }}
            </a>
          }
        </div>
      </div>
    </nav>

    <p-drawer
      [visible]="mobileOpen()"
      (visibleChange)="mobileOpen.set($event)"
      position="left"
      [header]="i18n.t('brand.name')"
      styleClass="!w-80"
    >
      <ul class="flex flex-col gap-1">
        @for (link of links; track link.labelKey) {
          <li>
            <a
              [routerLink]="link.link"
              [fragment]="link.fragment"
              (click)="mobileOpen.set(false)"
              [class]="drawerItemClass"
            >
              <i [class]="link.icon" class="text-brand"></i>
              {{ i18n.t(link.labelKey) }}
            </a>
          </li>
        }
      </ul>
      <ul class="border-line mt-4 flex flex-col gap-1 border-t pt-4">
        @for (link of accountLinks(); track link.link) {
          <li>
            <a [routerLink]="link.link" (click)="mobileOpen.set(false)" [class]="drawerItemClass">
              <i [class]="link.icon" class="text-brand"></i>
              {{ i18n.t(link.labelKey) }}
            </a>
          </li>
        }
        @if (auth.isLoggedIn()) {
          <li>
            <button
              type="button"
              [class]="drawerItemClass + ' w-full'"
              (click)="mobileOpen.set(false); signOut()"
            >
              <i class="pi pi-sign-out text-brand"></i>
              {{ i18n.t('member.signOut') }}
            </button>
          </li>
        }
      </ul>
      <div class="border-line mt-6 flex flex-col gap-4 border-t pt-6">
        <div class="flex items-center justify-between">
          <span class="text-ink text-sm font-medium">{{ i18n.t('nav.language') }}</span>
          <app-lang-switch />
        </div>
        <label class="flex items-center justify-between">
          <span class="text-ink text-sm font-medium">{{ i18n.t('nav.darkMode') }}</span>
          <p-toggleswitch [ngModel]="theme.isDark()" (ngModelChange)="theme.toggle()" />
        </label>
      </div>
    </p-drawer>
  `,
})
export class Navbar {
  protected readonly i18n = inject(I18nService);
  protected readonly theme = inject(ThemeService);
  protected readonly cart = inject(CartService);
  protected readonly auth = inject(AuthStore);
  private readonly signOutFlow = inject(SignOutService);
  private readonly router = inject(Router);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );

  private readonly inProfile = computed(() => this.url().startsWith('/profile'));

  protected readonly mobileOpen = signal(false);
  protected readonly drawerItemClass =
    'text-ink hover:bg-brand-soft hover:text-brand flex items-center gap-3 rounded-2xl px-4 py-3 font-medium transition';

  protected readonly links: NavLink[] = [
    { labelKey: 'nav.home', link: '/', fragment: 'home', icon: 'pi pi-home' },
    { labelKey: 'nav.menu', link: '/', fragment: 'menu', icon: 'pi pi-th-large' },
    { labelKey: 'nav.offers', link: '/promotions', icon: 'pi pi-percentage' },
    { labelKey: 'nav.contact', link: '/', fragment: 'contact', icon: 'pi pi-map-marker' },
  ];

  protected readonly accountLinks = computed<AccountLink[]>(() => {
    if (!this.auth.isLoggedIn()) {
      return [{ labelKey: 'nav.register', icon: 'pi pi-user-plus', link: '/login' }];
    }
    return this.auth.isStaff() ? STAFF_LINKS : CUSTOMER_LINKS;
  });

  protected readonly accountMenuItems = computed<MenuItem[]>(() => {
    if (this.auth.isCustomer()) {
      const contextual: MenuItem = this.inProfile()
        ? {
            label: this.i18n.t('member.backToMenu'),
            icon: 'pi pi-shopping-bag',
            routerLink: '/',
            fragment: 'menu',
          }
        : {
            label: this.i18n.t('member.signOut'),
            icon: 'pi pi-sign-out',
            styleClass: 'menu-danger',
            command: () => this.signOut(),
          };
      return [
        {
          label: this.i18n.t('profile.nav.info'),
          icon: 'pi pi-id-card',
          routerLink: '/profile/info',
        },
        { separator: true },
        contextual,
      ];
    }
    return [
      ...STAFF_LINKS.map((link) => ({
        label: this.i18n.t(link.labelKey),
        icon: link.icon,
        routerLink: link.link,
      })),
      { separator: true },
      {
        label: this.i18n.t('member.signOut'),
        icon: 'pi pi-sign-out',
        styleClass: 'menu-danger',
        command: () => this.signOut(),
      },
    ];
  });

  protected signOut(): void {
    this.signOutFlow.request();
  }
}
