import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { catchError, finalize, of } from 'rxjs';

import { OrderResponse } from '../../core/api/models/order.model';
import { OrderApi } from '../../core/api/services/order.api';
import { AuthStore } from '../../core/auth/auth.store';
import { I18nService } from '../../core/i18n/i18n.service';
import { Crumb } from '../../shared/components/breadcrumbs/breadcrumbs';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { ImageUpload } from '../../shared/components/image-upload/image-upload';
import { LoadingSkeleton } from '../../shared/components/loading-skeleton/loading-skeleton';
import { OrderSummary } from '../../shared/components/order-summary/order-summary';
import { OrderTimeline } from '../../shared/components/order-timeline/order-timeline';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { Panel } from '../../shared/components/panel/panel';
import { PaymentMethodPicker } from '../../shared/components/payment-method-picker/payment-method-picker';
import { StatusTag } from '../../shared/components/status-tag/status-tag';
import { ThaiDatePipe } from '../../shared/pipes/thai-date.pipe';
import { orderSummaryLines } from '../../shared/utils/order-lines';

const POLL_MS = 10_000;
const FINAL_STATUSES = ['COMPLETED', 'CANCELLED'];

@Component({
  selector: 'app-track-order-page',
  imports: [
    RouterLink,
    ButtonModule,
    EmptyState,
    ImageUpload,
    LoadingSkeleton,
    OrderSummary,
    OrderTimeline,
    PageHeader,
    Panel,
    PaymentMethodPicker,
    StatusTag,
    ThaiDatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header
      [title]="i18n.t('track.title')"
      [crumbs]="crumbs"
      container="mx-auto max-w-5xl px-4 md:px-6"
    />

    <div class="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-10">
      @if (order(); as current) {
        @if (placed()) {
          <div
            class="bg-card border-line shadow-soft animate-pop mb-5 flex flex-col items-center gap-2 rounded-3xl border p-6 text-center"
          >
            <span
              class="grid h-14 w-14 place-items-center rounded-full bg-[#4a7c4e] text-white shadow-lg"
            >
              <i class="pi pi-check text-2xl"></i>
            </span>
            <h2 class="text-ink text-2xl font-bold">{{ i18n.t('success.title') }}</h2>
            <p class="text-ink-muted text-sm">{{ i18n.t('track.saveLink') }}</p>
            <p-button
              [label]="i18n.t('track.copyLink')"
              icon="pi pi-link"
              size="small"
              [outlined]="true"
              [rounded]="true"
              (onClick)="copyLink()"
            />
          </div>
        }

        <div class="grid items-start gap-5 lg:grid-cols-[1fr_22rem]">
          <div class="flex flex-col gap-5">
            <app-panel>
              <div class="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p class="text-ink-muted text-xs">{{ i18n.t('success.queue') }}</p>
                  <p class="font-display text-accent text-6xl leading-none font-extrabold">
                    {{ current.queueNo }}
                  </p>
                </div>
                <div class="text-right">
                  <app-status-tag kind="order" [value]="current.status" />
                  <p class="text-ink mt-2 text-sm font-semibold">#{{ current.orderNo }}</p>
                  <p class="text-ink-muted text-xs">
                    {{ current.createdAt | thaiDate: i18n.lang() : 'datetime' }}
                  </p>
                </div>
              </div>
              <p class="bg-canvas text-ink mt-4 rounded-2xl px-4 py-3 text-sm">
                <i class="pi pi-info-circle text-brand mr-2"></i>{{ statusHint() }}
              </p>
              @if (current.customerName) {
                <p class="text-ink-muted mt-3 text-sm">
                  <i class="pi pi-user text-brand mr-1 text-xs"></i>
                  {{ i18n.t('success.recipient') }}: {{ current.customerName }}
                </p>
              }
            </app-panel>

            @if (current.status === 'PENDING_PAYMENT') {
              <app-panel [heading]="i18n.t('track.payment')">
                @if (latestPayment(); as payment) {
                  <div
                    class="mb-4 flex items-center justify-between gap-3 rounded-2xl px-4 py-3"
                    [class]="payment.status === 'REJECTED' ? 'bg-red-500/10' : 'bg-accent-soft'"
                  >
                    <div class="text-sm">
                      <p class="text-ink font-semibold">
                        {{ i18n.pick(payment.methodName, payment.methodNameEn) }}
                      </p>
                      @if (payment.status === 'REJECTED') {
                        <p class="text-xs text-red-500">
                          {{
                            i18n.t('track.slipRejected', { reason: payment.rejectReason ?? '-' })
                          }}
                        </p>
                      } @else {
                        <p class="text-ink-muted text-xs">{{ i18n.t('track.slipWaiting') }}</p>
                      }
                    </div>
                    <app-status-tag kind="payment" [value]="payment.status" />
                  </div>
                }
                @if (!hasPendingSlip()) {
                  <app-payment-method-picker
                    [methods]="methods()"
                    [amount]="current.totalAmount - current.paidAmount"
                    [(selected)]="method"
                  />
                  @if (methodRequiresSlip()) {
                    <div class="border-line mt-4 flex flex-col gap-3 border-t pt-4">
                      <app-image-upload
                        mode="inline"
                        [url]="slip()"
                        (urlChange)="slip.set($event)"
                      />
                      <p-button
                        [label]="i18n.t('track.sendSlip')"
                        icon="pi pi-send"
                        [rounded]="true"
                        [disabled]="!slip()"
                        [loading]="sending()"
                        (onClick)="sendSlip(current)"
                      />
                    </div>
                  } @else {
                    <p class="text-ink-muted mt-3 text-sm">{{ i18n.t('track.payAtCounter') }}</p>
                  }
                }
              </app-panel>
            }

            <app-panel [heading]="i18n.t('checkout.summary')">
              <app-order-summary
                [lines]="lines()"
                [subtotal]="current.subtotal"
                [total]="current.totalAmount"
                [promotions]="current.appliedPromotions"
                [pointDiscount]="current.pointDiscount"
                [pointsRedeemed]="current.pointsRedeemed"
                [pointsToEarn]="current.pointsEarned || current.pointsToEarn"
                [pointsLabel]="
                  current.pointsEarned
                    ? i18n.t('track.pointsEarned')
                    : i18n.t('track.pointsOnPickup')
                "
                [pickupLabel]="i18n.t('checkout.pickupFee')"
              />
              @if (current.note) {
                <p class="bg-canvas text-ink-muted mt-4 rounded-xl px-3 py-2 text-xs">
                  <i class="pi pi-comment mr-1"></i>{{ current.note }}
                </p>
              }
            </app-panel>
          </div>

          <div class="flex flex-col gap-5 lg:sticky lg:top-24">
            <app-panel [heading]="i18n.t('track.timeline')">
              <app-order-timeline [order]="current" />
              @if (current.cancelReason) {
                <p class="mt-2 text-xs text-red-500">{{ current.cancelReason }}</p>
              }
            </app-panel>
            <a
              pButton
              routerLink="/"
              fragment="menu"
              [label]="i18n.t('success.again')"
              [rounded]="true"
              size="large"
              [fluid]="true"
            ></a>
          </div>
        </div>
      } @else if (notFound()) {
        <div class="bg-card border-line shadow-soft mx-auto max-w-xl rounded-3xl border p-6">
          <app-empty-state icon="pi pi-search" [title]="i18n.t('track.notFound')">
            <a pButton routerLink="/" [label]="i18n.t('checkout.backToMenu')" [rounded]="true"></a>
          </app-empty-state>
        </div>
      } @else {
        <app-loading-skeleton variant="list" [count]="4" />
      }
    </div>
  `,
})
export class TrackOrderPage {
  protected readonly i18n = inject(I18nService);
  private readonly orderApi = inject(OrderApi);
  private readonly messages = inject(MessageService);
  protected readonly auth = inject(AuthStore);

  readonly token = input.required<string>();
  readonly placed = input<string>();

  protected readonly crumbs: Crumb[] = [
    { labelKey: 'crumb.menu', link: '/', fragment: 'menu' },
    { labelKey: 'track.title' },
  ];

  protected readonly order = signal<OrderResponse | null>(null);
  protected readonly notFound = signal(false);
  protected readonly sending = signal(false);
  protected readonly slip = signal<string | null>(null);
  protected readonly method = signal<string | null>(null);

  protected readonly methods = toSignal(
    this.orderApi.paymentMethods('ONLINE').pipe(catchError(() => of([]))),
    { initialValue: [] },
  );

  protected readonly lines = computed(() =>
    orderSummaryLines(this.order()?.items ?? [], this.i18n),
  );

  protected readonly latestPayment = computed(() => this.order()?.payments.at(-1) ?? null);
  protected readonly hasPendingSlip = computed(() => this.latestPayment()?.status === 'PENDING');
  protected readonly methodRequiresSlip = computed(
    () => this.methods().find((method) => method.code === this.method())?.requiresSlip ?? false,
  );

  protected readonly statusHint = computed(() => {
    const order = this.order();
    if (!order) {
      return '';
    }
    if (order.status === 'PENDING_PAYMENT') {
      return this.i18n.t(this.hasPendingSlip() ? 'track.hint.verifying' : 'track.hint.pending');
    }
    return this.i18n.t(`track.hint.${order.status}`);
  });

  constructor() {
    effect(() => {
      const token = this.token();
      this.load(token, false);
    });
    effect(() => {
      const order = this.order();
      if (order && !this.method()) {
        this.method.set(order.paymentMethodCode ?? this.methods()[0]?.code ?? null);
      }
    });
    const timer = setInterval(() => {
      const order = this.order();
      if (order && !FINAL_STATUSES.includes(order.status)) {
        this.load(this.token(), true);
      }
    }, POLL_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  protected copyLink(): void {
    navigator.clipboard?.writeText(window.location.href.split('?')[0] ?? '').catch(() => undefined);
    this.messages.add({ severity: 'success', summary: this.i18n.t('track.linkCopied') });
  }

  protected sendSlip(order: OrderResponse): void {
    const slip = this.slip();
    const method = this.method();
    if (!slip || !method) {
      return;
    }
    this.sending.set(true);
    this.orderApi
      .attachSlip(order.trackingToken, {
        methodCode: method,
        amount: order.totalAmount - order.paidAmount,
        slipUrl: slip,
      })
      .pipe(finalize(() => this.sending.set(false)))
      .subscribe(() => {
        this.slip.set(null);
        this.messages.add({ severity: 'success', summary: this.i18n.t('track.slipSent') });
        this.load(order.trackingToken, true);
      });
  }

  private load(token: string, background: boolean): void {
    this.orderApi.track(token, background).subscribe({
      next: (order) => this.order.set(order),
      error: () => {
        if (!this.order()) {
          this.notFound.set(true);
        }
      },
    });
  }
}
