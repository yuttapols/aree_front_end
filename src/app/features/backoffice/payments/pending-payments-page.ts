import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { ImageModule } from 'primeng/image';
import { TextareaModule } from 'primeng/textarea';
import { finalize } from 'rxjs';

import { PaymentResponse } from '../../../core/api/models/order.model';
import { OrderApi } from '../../../core/api/services/order.api';
import { I18nService } from '../../../core/i18n/i18n.service';
import { Crumb } from '../../../shared/components/breadcrumbs/breadcrumbs';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { LoadingSkeleton } from '../../../shared/components/loading-skeleton/loading-skeleton';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { ThaiDatePipe } from '../../../shared/pipes/thai-date.pipe';

const POLL_MS = 15_000;

@Component({
  selector: 'app-pending-payments-page',
  imports: [
    FormsModule,
    RouterLink,
    ButtonModule,
    DialogModule,
    ImageModule,
    TextareaModule,
    EmptyState,
    LoadingSkeleton,
    PageHeader,
    MoneyPipe,
    ThaiDatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header [title]="i18n.t('bo.nav.payments')" [crumbs]="crumbs" />

    <div class="px-4 py-6 md:px-8">
      @if (payments(); as list) {
        @if (list.length) {
          <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            @for (payment of list; track payment.id) {
              <article class="bg-card border-line shadow-soft flex gap-4 rounded-3xl border p-4">
                @if (payment.slipUrl) {
                  <p-image
                    [src]="payment.slipUrl"
                    alt="slip"
                    width="110"
                    [preview]="true"
                    imageClass="rounded-xl border border-line object-cover h-40 w-[110px]"
                  />
                }
                <div class="flex min-w-0 flex-1 flex-col">
                  <a
                    [routerLink]="['/backoffice/orders', payment.orderId]"
                    class="text-ink text-sm font-bold hover:underline"
                  >
                    #{{ payment.orderNo }}
                  </a>
                  <p class="text-ink-muted text-xs">{{ payment.customerName ?? '-' }}</p>
                  <p class="text-ink-muted text-xs">
                    {{ payment.createdAt | thaiDate: i18n.lang() : 'datetime' }}
                  </p>
                  <p class="text-ink mt-2 text-xs">
                    {{ i18n.pick(payment.methodName, payment.methodNameEn) }}
                  </p>
                  <p class="font-display text-accent text-2xl font-extrabold">
                    {{ payment.amount | money }}
                  </p>
                  @if (payment.amount !== payment.orderTotal) {
                    <p class="text-xs font-semibold text-red-500">
                      {{ i18n.t('bo.payments.mismatch', { n: (payment.orderTotal | money) }) }}
                    </p>
                  }
                  <div class="mt-auto flex gap-2 pt-3">
                    <p-button
                      [label]="i18n.t('bo.payments.approve')"
                      icon="pi pi-check"
                      size="small"
                      [rounded]="true"
                      [loading]="busy() === payment.id"
                      (onClick)="verify(payment, true)"
                    />
                    <p-button
                      [label]="i18n.t('bo.payments.reject')"
                      icon="pi pi-times"
                      size="small"
                      severity="danger"
                      [outlined]="true"
                      [rounded]="true"
                      (onClick)="rejecting.set(payment)"
                    />
                  </div>
                </div>
              </article>
            }
          </div>
        } @else {
          <app-empty-state
            icon="pi pi-check-circle"
            [title]="i18n.t('bo.payments.empty')"
            [hint]="i18n.t('bo.payments.emptyHint')"
          />
        }
      } @else {
        <app-loading-skeleton variant="list" [count]="3" />
      }
    </div>

    <p-dialog
      [visible]="rejecting() !== null"
      (visibleChange)="!$event && rejecting.set(null)"
      [modal]="true"
      [draggable]="false"
      [header]="i18n.t('bo.payments.reject')"
      [style]="{ width: '26rem' }"
      [breakpoints]="{ '640px': '94vw' }"
    >
      <label class="text-ink mb-2 block text-sm font-semibold" for="reject-reason"
        >{{ i18n.t('bo.payments.rejectReason') }} *</label
      >
      <textarea
        pTextarea
        id="reject-reason"
        rows="3"
        class="w-full rounded-xl"
        [ngModel]="reason()"
        (ngModelChange)="reason.set($event)"
      ></textarea>
      <ng-template #footer>
        <p-button [label]="i18n.t('common.cancel')" [text]="true" (onClick)="rejecting.set(null)" />
        <p-button
          [label]="i18n.t('bo.payments.reject')"
          severity="danger"
          [rounded]="true"
          [disabled]="!reason().trim()"
          (onClick)="confirmReject()"
        />
      </ng-template>
    </p-dialog>
  `,
})
export class PendingPaymentsPage {
  protected readonly i18n = inject(I18nService);
  private readonly api = inject(OrderApi);
  private readonly messages = inject(MessageService);

  protected readonly crumbs: Crumb[] = [
    { labelKey: 'bo.title', link: '/backoffice' },
    { labelKey: 'bo.nav.payments' },
  ];
  protected readonly payments = signal<PaymentResponse[] | null>(null);
  protected readonly busy = signal<number | null>(null);
  protected readonly rejecting = signal<PaymentResponse | null>(null);
  protected readonly reason = signal('');

  constructor() {
    this.load(false);
    const timer = setInterval(() => this.load(true), POLL_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  protected verify(payment: PaymentResponse, approve: boolean, reason: string | null = null): void {
    this.busy.set(payment.id);
    this.api
      .verifyPayment(payment.id, approve, reason)
      .pipe(finalize(() => this.busy.set(null)))
      .subscribe(() => {
        this.messages.add({
          severity: approve ? 'success' : 'info',
          summary: this.i18n.t(approve ? 'bo.payments.approved' : 'bo.payments.rejected'),
          detail: `#${payment.orderNo}`,
        });
        this.load(true);
      });
  }

  protected confirmReject(): void {
    const payment = this.rejecting();
    if (payment) {
      this.verify(payment, false, this.reason().trim());
      this.rejecting.set(null);
      this.reason.set('');
    }
  }

  private load(background: boolean): void {
    this.api.payments('PENDING', background).subscribe((payments) => this.payments.set(payments));
  }
}
