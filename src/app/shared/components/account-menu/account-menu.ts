import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';

import { UserRole } from '../../../core/api/models/user.model';
import { AuthStore } from '../../../core/auth/auth.store';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslationKey } from '../../../core/i18n/translations';
import { formatNumber } from '../../utils/format';
import { Avatar } from '../avatar/avatar';
import { PointsChip } from '../points-chip/points-chip';
import { StatusTag } from '../status-tag/status-tag';

const ROLE_KEYS: Record<UserRole, TranslationKey> = {
  CUSTOMER: 'status.role.CUSTOMER',
  STAFF: 'status.role.STAFF',
  ADMIN: 'status.role.ADMIN',
};

@Component({
  selector: 'app-account-menu',
  imports: [MenuModule, Avatar, PointsChip, StatusTag],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex' },
  template: `
    @if (auth.user(); as user) {
      <button
        type="button"
        class="flex h-12 max-w-64 items-center gap-2 rounded-2xl border border-white/15 bg-white/10 pr-3 pl-1.5 text-sm font-semibold text-white transition hover:bg-white/20 active:scale-95"
        aria-haspopup="menu"
        [attr.aria-label]="i18n.t('nav.account')"
        (click)="accountMenu.toggle($event)"
      >
        @if (auth.isCustomer()) {
          <app-points-chip [points]="user.pointsBalance" />
        }
        <app-avatar [url]="user.avatarUrl" [name]="user.nickname" tone="glass" />
        <span class="hidden max-w-32 truncate md:inline">{{ user.nickname }}</span>
        @if (showRole()) {
          <app-status-tag class="hidden md:inline-flex" kind="role" [value]="user.role" />
        }
        <i class="pi pi-chevron-down text-[0.65rem] text-white/70"></i>
      </button>
      <p-menu
        #accountMenu
        [model]="items()"
        [popup]="true"
        appendTo="body"
        styleClass="!w-72 !rounded-2xl !p-2 !shadow-xl"
        [dt]="menuTokens"
      >
        <ng-template #start>
          <div class="bg-royal relative mb-2 overflow-hidden rounded-xl p-4 text-white">
            <i
              class="pi pi-star-fill pointer-events-none absolute -top-4 -right-3 text-[4.5rem] text-white/10"
            ></i>
            <div class="relative flex items-center gap-3">
              <app-avatar [url]="user.avatarUrl" [name]="user.nickname" size="large" tone="glass" />
              <div class="min-w-0">
                <p class="truncate font-bold">{{ user.nickname }}</p>
                <p class="truncate text-xs text-white/70">
                  {{ user.memberCode ?? i18n.t(roleKeys[user.role]) }}
                </p>
              </div>
            </div>
            @if (auth.isCustomer()) {
              <div
                class="relative mt-3 flex items-center justify-between rounded-lg bg-white/10 px-3 py-2"
              >
                <span class="text-xs text-white/75">{{ i18n.t('member.points') }}</span>
                <span class="font-display text-accent text-lg leading-none font-extrabold">
                  {{ format(user.pointsBalance) }}
                  <i class="pi pi-star-fill text-[0.6rem]"></i>
                </span>
              </div>
            }
          </div>
        </ng-template>
      </p-menu>
    }
  `,
})
export class AccountMenu {
  protected readonly i18n = inject(I18nService);
  protected readonly auth = inject(AuthStore);

  readonly items = input.required<MenuItem[]>();
  readonly showRole = input(false);

  protected readonly format = formatNumber;
  protected readonly roleKeys = ROLE_KEYS;
  protected readonly menuTokens = {
    list: { gap: '0.25rem', padding: '0' },
    item: { padding: '0.8rem 1rem', borderRadius: '0.85rem', gap: '0.75rem' },
    separator: { borderColor: 'var(--app-line)' },
  };
}
