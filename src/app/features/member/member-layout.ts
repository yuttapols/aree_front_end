import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AvatarModule } from 'primeng/avatar';
import { TooltipModule } from 'primeng/tooltip';

import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/translations';
import { MemberService } from '../../core/member/member.service';
import { PointsChip } from '../../shared/components/points-chip/points-chip';
import { TierChip } from '../../shared/components/tier-chip/tier-chip';
import { readStorage, writeStorage } from '../../shared/utils/storage';
import { MemberActions } from './member-actions.service';

const SIDEBAR_KEY = 'roti.sidebar';
const SIDEBAR_STATES = ['collapsed', 'expanded'] as const;

interface SidebarLink {
  labelKey: TranslationKey;
  icon: string;
  link: string;
}

@Component({
  selector: 'app-member-layout',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    AvatarModule,
    TooltipModule,
    PointsChip,
    TierChip,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex">
      <aside
        class="bg-card border-line sticky top-[72px] h-[calc(100dvh-72px)] shrink-0 border-r transition-[width] duration-300"
        [class]="collapsed() ? 'w-[4.5rem]' : 'w-[4.5rem] md:w-64'"
      >
        <nav
          class="flex h-full flex-col gap-1 overflow-x-hidden overflow-y-auto p-3"
          [attr.aria-label]="i18n.t('member.menu')"
        >
          @if (member.profile(); as profile) {
            <div
              class="mb-3 flex items-center gap-3 rounded-2xl p-1.5"
              [class]="collapsed() ? '' : 'md:bg-canvas md:p-3'"
            >
              <p-avatar
                icon="pi pi-user"
                shape="circle"
                size="large"
                styleClass="!bg-brand !text-on-brand shrink-0"
              />
              <div
                class="min-w-0 flex-col items-start gap-1"
                [class]="collapsed() ? 'hidden' : 'hidden md:flex'"
              >
                <p class="text-ink w-full truncate text-sm font-bold">{{ profile.name }}</p>
                <div class="flex flex-wrap gap-1">
                  <app-tier-chip [tier]="member.tier().tier" />
                  <app-points-chip [points]="profile.points" />
                </div>
              </div>
            </div>
          }

          @for (item of links; track item.link) {
            <a
              [routerLink]="item.link"
              routerLinkActive="!bg-brand-soft !text-brand"
              [pTooltip]="i18n.t(item.labelKey)"
              tooltipPosition="right"
              [tooltipDisabled]="!collapsed()"
              [attr.aria-label]="i18n.t(item.labelKey)"
              [class]="itemClass"
            >
              <i [class]="item.icon" class="w-5 shrink-0 text-center text-lg"></i>
              <span [class]="labelClass()">{{ i18n.t(item.labelKey) }}</span>
            </a>
          }

          <div class="border-line mt-auto flex flex-col gap-1 border-t pt-3">
            <a
              routerLink="/"
              fragment="menu"
              [pTooltip]="i18n.t('member.backToMenu')"
              tooltipPosition="right"
              [tooltipDisabled]="!collapsed()"
              [attr.aria-label]="i18n.t('member.backToMenu')"
              [class]="itemClass"
            >
              <i class="pi pi-shopping-bag w-5 shrink-0 text-center text-lg"></i>
              <span [class]="labelClass()">{{ i18n.t('member.backToMenu') }}</span>
            </a>
            <button
              type="button"
              [pTooltip]="i18n.t('member.signOut')"
              tooltipPosition="right"
              [tooltipDisabled]="!collapsed()"
              [attr.aria-label]="i18n.t('member.signOut')"
              [class]="itemClass"
              (click)="actions.signOut()"
            >
              <i class="pi pi-sign-out w-5 shrink-0 text-center text-lg"></i>
              <span [class]="labelClass()">{{ i18n.t('member.signOut') }}</span>
            </button>
            <button
              type="button"
              class="text-ink-muted hover:text-brand border-line hidden h-11 items-center justify-center gap-2 rounded-2xl border text-sm transition md:flex"
              [attr.aria-label]="i18n.t(collapsed() ? 'member.expand' : 'member.collapse')"
              [attr.aria-expanded]="!collapsed()"
              (click)="toggle()"
            >
              <i
                class="pi"
                [class.pi-angle-double-right]="collapsed()"
                [class.pi-angle-double-left]="!collapsed()"
              ></i>
              @if (!collapsed()) {
                <span>{{ i18n.t('member.collapse') }}</span>
              }
            </button>
          </div>
        </nav>
      </aside>

      <div class="min-w-0 flex-1">
        <router-outlet />
      </div>
    </div>
  `,
})
export class MemberLayout {
  protected readonly i18n = inject(I18nService);
  protected readonly member = inject(MemberService);
  protected readonly actions = inject(MemberActions);

  protected readonly collapsed = signal(readStorage(SIDEBAR_KEY, SIDEBAR_STATES) === 'collapsed');

  protected readonly labelClass = computed(() =>
    this.collapsed() ? 'hidden' : 'hidden truncate md:inline',
  );

  protected readonly itemClass =
    'text-ink hover:bg-canvas hover:text-brand flex h-11 w-full items-center gap-3 rounded-2xl px-3.5 text-sm font-medium transition';

  protected readonly links: SidebarLink[] = [
    { labelKey: 'member.dashboard', icon: 'pi pi-th-large', link: '/member/dashboard' },
    { labelKey: 'member.profile', icon: 'pi pi-id-card', link: '/member/profile' },
  ];

  constructor() {
    effect(() => writeStorage(SIDEBAR_KEY, this.collapsed() ? 'collapsed' : 'expanded'));
  }

  protected toggle(): void {
    this.collapsed.update((collapsed) => !collapsed);
  }
}
