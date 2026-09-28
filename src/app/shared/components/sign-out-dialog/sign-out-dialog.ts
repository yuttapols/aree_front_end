import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';

import { AuthStore } from '../../../core/auth/auth.store';
import { I18nService } from '../../../core/i18n/i18n.service';
import { SignOutService } from '../../services/sign-out.service';

@Component({
  selector: 'app-sign-out-dialog',
  imports: [ButtonModule, DialogModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-dialog
      [visible]="signOut.open()"
      (visibleChange)="!$event && signOut.cancel()"
      [modal]="true"
      [draggable]="false"
      [closable]="!signOut.busy()"
      [dismissableMask]="!signOut.busy()"
      [breakpoints]="{ '640px': '94vw' }"
      [style]="{ width: '28rem' }"
      [showHeader]="false"
      contentStyleClass="!p-0"
    >
      <header class="bg-royal relative overflow-hidden px-6 pt-7 pb-6 text-center text-white">
        <i
          class="pi pi-star-fill pointer-events-none absolute -top-8 -right-6 text-[8rem] text-white/10"
        ></i>
        <span
          class="relative mx-auto grid h-16 w-16 place-items-center rounded-full bg-red-500 shadow-lg ring-8 ring-white/15"
        >
          <i class="pi pi-sign-out text-2xl"></i>
        </span>
        <h2 class="font-display relative mt-4 text-2xl font-bold">
          {{ i18n.t('signOut.title') }}
        </h2>
        @if (auth.user(); as user) {
          <p class="relative mt-1 text-sm text-white/75">
            {{ i18n.t('signOut.account', { name: user.nickname }) }}
          </p>
        }
      </header>

      <p class="text-ink-muted px-6 pt-6 text-center">{{ i18n.t('signOut.message') }}</p>

      <footer class="grid grid-cols-2 gap-3 p-6">
        <p-button
          [label]="i18n.t('common.cancel')"
          severity="secondary"
          [outlined]="true"
          [rounded]="true"
          size="large"
          [fluid]="true"
          [disabled]="signOut.busy()"
          (onClick)="signOut.cancel()"
        />
        <p-button
          [label]="i18n.t('member.signOut')"
          icon="pi pi-sign-out"
          severity="danger"
          [rounded]="true"
          size="large"
          [fluid]="true"
          [loading]="signOut.busy()"
          (onClick)="signOut.confirm()"
        />
      </footer>
    </p-dialog>
  `,
})
export class SignOutDialog {
  protected readonly i18n = inject(I18nService);
  protected readonly auth = inject(AuthStore);
  protected readonly signOut = inject(SignOutService);
}
