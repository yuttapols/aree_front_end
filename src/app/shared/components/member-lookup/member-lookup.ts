import { ChangeDetectionStrategy, Component, inject, model, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { finalize } from 'rxjs';

import { CustomerResponse } from '../../../core/api/models/user.model';
import { UserApi } from '../../../core/api/services/user.api';
import { I18nService } from '../../../core/i18n/i18n.service';
import { formatPhone } from '../../utils/format';
import { Avatar } from '../avatar/avatar';
import { PointsChip } from '../points-chip/points-chip';

@Component({
  selector: 'app-member-lookup',
  imports: [FormsModule, ButtonModule, InputTextModule, Avatar, PointsChip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @if (member(); as current) {
      <div class="bg-brand-soft flex items-center gap-3 rounded-2xl px-3 py-2.5">
        <app-avatar [url]="current.avatarUrl" [name]="current.nickname" />
        <div class="min-w-0 flex-1">
          <p class="text-ink truncate text-sm font-bold">{{ current.nickname }}</p>
          <p class="text-ink-muted truncate text-xs">
            {{ current.memberCode }} · {{ phone(current.phone) }}
          </p>
        </div>
        <app-points-chip [points]="current.pointsBalance" />
        <button
          type="button"
          class="text-ink-muted hover:text-ink grid h-8 w-8 place-items-center rounded-full"
          [attr.aria-label]="i18n.t('common.remove')"
          (click)="member.set(null)"
        >
          <i class="pi pi-times text-xs"></i>
        </button>
      </div>
    } @else {
      <form class="flex gap-2" (ngSubmit)="search()">
        <input
          pInputText
          name="memberQuery"
          class="flex-1 rounded-xl"
          inputmode="tel"
          [placeholder]="i18n.t('memberLookup.placeholder')"
          [ngModel]="query()"
          (ngModelChange)="query.set($event); notFound.set(false)"
        />
        <p-button
          type="submit"
          icon="pi pi-search"
          [rounded]="true"
          [loading]="loading()"
          [ariaLabel]="i18n.t('common.search')"
        />
      </form>
      @if (notFound()) {
        <div class="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span class="text-red-500">{{ i18n.t('memberLookup.notFound') }}</span>
          <p-button
            [label]="i18n.t('memberLookup.quickRegister')"
            icon="pi pi-user-plus"
            size="small"
            [text]="true"
            (onClick)="registerRequested.emit(query())"
          />
        </div>
      }
    }
  `,
})
export class MemberLookup {
  protected readonly i18n = inject(I18nService);
  private readonly api = inject(UserApi);

  readonly member = model<CustomerResponse | null>(null);
  readonly registerRequested = output<string>();

  protected readonly query = signal('');
  protected readonly loading = signal(false);
  protected readonly notFound = signal(false);
  protected readonly phone = formatPhone;

  protected search(): void {
    const value = this.query().trim();
    if (!value) {
      return;
    }
    this.loading.set(true);
    this.api
      .lookupCustomer(value)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (customer) => {
          this.member.set(customer);
          this.query.set('');
        },
        error: () => this.notFound.set(true),
      });
  }
}
