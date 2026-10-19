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
import { LoadingSkeleton } from '../../shared/components/loading-skeleton/loading-skeleton';
import { OrderSummary } from '../../shared/components/order-summary/order-summary';
import { OrderTimeline } from '../../shared/components/order-timeline/order-timeline';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { Panel } from '../../shared/components/panel/panel';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { StatusTag } from '../../shared/components/status-tag/status-tag';
import { ThaiDatePipe } from '../../shared/pipes/thai-date.pipe';
import { OrderLinesService } from '../../shared/services/order-lines.service';
import { isTrackingToken } from '../../shared/utils/sanitize';

const POLL_MS = 10_000;
const FINAL_STATUSES = ['COMPLETED', 'CANCELLED'];

@Component({
  selector: 'app-track-order-page',
  imports: [
    RouterLink,
    ButtonModule,
    EmptyState,
    LoadingSkeleton,
    OrderSummary,
    OrderTimeline,
    PageHeader,
    Panel,
    MoneyPipe,
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
              class="grid h-14 w-14 place-items-center rounded-full bg-emerald-500 text-white shadow-lg ring-8 ring-emerald-500/15"
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
            <section
              class="bg-royal animate-rise relative overflow-hidden rounded-3xl p-6 text-white shadow-[0_24px_48px_-24px_rgb(58_20_102/0.7)] md:p-7"
            >
              <span
                class="pointer-events-none absolute -top-20 -right-12 h-56 w-56 rounded-full bg-white/10"
              ></span>
              <span
                class="bg-accent/20 pointer-events-none absolute -bottom-24 left-1/4 h-56 w-56 rounded-full blur-2xl"
              ></span>
              <div class="relative flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p class="text-xs font-semibold tracking-widest text-white/70 uppercase">
                    {{ i18n.t('success.queue') }}
                  </p>
                  <p
                    class="font-display text-accent text-7xl leading-none font-extrabold drop-shadow-[0_6px_16px_rgb(0_0_0/0.35)] md:text-8xl"
                  >
                    {{ current.queueNo }}
                  </p>
                </div>
                <div class="text-right">
                  <app-status-tag kind="order" [value]="current.status" />
                  <p class="mt-2 text-sm font-semibold">#{{ current.orderNo }}</p>
                  <p class="text-xs text-white/70">
                    {{ current.createdAt | thaiDate: i18n.lang() : 'datetime' }}
                  </p>
                </div>
              </div>
              <p class="relative mt-5 rounded-2xl bg-white/10 px-4 py-3 text-sm backdrop-blur">
                <i class="pi pi-info-circle text-accent mr-2"></i>{{ statusHint() }}
              </p>
              @if (current.customer?.nickname ?? current.guestName; as recipient) {
                <p class="relative mt-3 text-sm text-white/80">
                  <i class="pi pi-user text-accent mr-1 text-xs"></i>
                  {{ i18n.t('success.recipient') }}: {{ recipient }}
                </p>
              }
            </section>

            @if (current.remainingAmount > 0 && current.status !== 'CANCELLED') {
              <app-panel [heading]="i18n.t('track.payment')">
                <div class="bg-canvas flex items-center gap-4 rounded-2xl p-4">
                  <span
                    class="bg-brand text-on-brand grid h-12 w-12 shrink-0 place-items-center rounded-xl text-lg"
                  >
                    <i [class]="chosenMethod()?.icon || 'pi pi-wallet'"></i>
                  </span>
                  <div class="min-w-0 flex-1">
                    <p class="text-ink-muted text-xs">{{ i18n.t('track.paidWith') }}</p>
                    <p class="text-ink text-lg font-bold">
                      {{
                        chosenMethod()
                          ? i18n.name(chosenMethod()!)
                          : i18n.t('track.payAtCounterShort')
                      }}
                    </p>
                  </div>
                  <div class="text-right">
                    <p class="text-ink-muted text-xs">{{ i18n.t('track.amountDue') }}</p>
                    <p class="font-display text-ink text-xl font-bold tabular-nums">
                      {{ current.remainingAmount | money }}
                    </p>
                  </div>
                </div>
                <p class="text-ink-muted mt-3 flex items-center gap-2 text-sm">
                  <i class="pi pi-info-circle text-brand"></i>{{ i18n.t('track.payAtCounter') }}
                </p>
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
  private readonly orderLines = inject(OrderLinesService);
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

  protected readonly methods = toSignal(
    this.orderApi.paymentMethods('ONLINE').pipe(catchError(() => of([]))),
    { initialValue: [] },
  );

  protected readonly lines = computed(() => this.orderLines.summarize(this.order()?.items ?? []));

  protected readonly latestPayment = computed(() => this.order()?.payments.at(-1) ?? null);
  protected readonly hasPendingSlip = computed(() => this.latestPayment()?.status === 'PENDING');
  protected readonly chosenMethod = computed(() => {
    const order = this.order();
    const code = order?.paymentMethodCode ?? this.latestPayment()?.methodCode ?? null;
    return code ? (this.methods().find((method) => method.code === code) ?? null) : null;
  });

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

  private load(token: string, background: boolean): void {
    if (!isTrackingToken(token)) {
      this.notFound.set(true);
      return;
    }
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
