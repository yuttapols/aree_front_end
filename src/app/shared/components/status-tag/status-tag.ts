import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TagModule } from 'primeng/tag';

import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslationKey } from '../../../core/i18n/translations';

export type StatusKind =
  'order' | 'payment' | 'channel' | 'userStatus' | 'role' | 'promotion' | 'pointType' | 'active';

type Severity = 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast';

const STATUS_MAP: Record<StatusKind, Record<string, [Severity, TranslationKey]>> = {
  order: {
    PENDING_PAYMENT: ['warn', 'status.order.PENDING_PAYMENT'],
    CONFIRMED: ['info', 'status.order.CONFIRMED'],
    PREPARING: ['contrast', 'status.order.PREPARING'],
    READY: ['success', 'status.order.READY'],
    COMPLETED: ['secondary', 'status.order.COMPLETED'],
    CANCELLED: ['danger', 'status.order.CANCELLED'],
  },
  payment: {
    PENDING: ['warn', 'status.payment.PENDING'],
    PAID: ['success', 'status.payment.PAID'],
    REJECTED: ['danger', 'status.payment.REJECTED'],
    REFUNDED: ['secondary', 'status.payment.REFUNDED'],
  },
  channel: {
    WALK_IN: ['info', 'status.channel.WALK_IN'],
    ONLINE: ['contrast', 'status.channel.ONLINE'],
  },
  userStatus: {
    ACTIVE: ['success', 'status.user.ACTIVE'],
    SUSPENDED: ['danger', 'status.user.SUSPENDED'],
  },
  role: {
    CUSTOMER: ['secondary', 'status.role.CUSTOMER'],
    STAFF: ['info', 'status.role.STAFF'],
    ADMIN: ['contrast', 'status.role.ADMIN'],
  },
  promotion: {
    RUNNING: ['success', 'status.promotion.RUNNING'],
    SCHEDULED: ['info', 'status.promotion.SCHEDULED'],
    EXPIRED: ['secondary', 'status.promotion.EXPIRED'],
    INACTIVE: ['danger', 'status.promotion.INACTIVE'],
  },
  pointType: {
    EARN: ['success', 'status.point.EARN'],
    REDEEM: ['info', 'status.point.REDEEM'],
    ADJUST: ['contrast', 'status.point.ADJUST'],
    EXPIRE: ['danger', 'status.point.EXPIRE'],
    REVERSE: ['warn', 'status.point.REVERSE'],
  },
  active: {
    true: ['success', 'status.active.true'],
    false: ['secondary', 'status.active.false'],
  },
};

@Component({
  selector: 'app-status-tag',
  imports: [TagModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex' },
  template: `<p-tag [severity]="entry()[0]" [value]="label()" [rounded]="true" />`,
})
export class StatusTag {
  private readonly i18n = inject(I18nService);

  readonly kind = input.required<StatusKind>();
  readonly value = input.required<string | boolean>();

  protected readonly entry = computed<[Severity, TranslationKey | null]>(
    () => STATUS_MAP[this.kind()][String(this.value())] ?? ['secondary', null],
  );

  protected readonly label = computed(() => {
    const key = this.entry()[1];
    return key ? this.i18n.t(key) : String(this.value());
  });
}
