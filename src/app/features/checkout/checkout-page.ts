import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { catchError, debounceTime, map, of, switchMap } from 'rxjs';

import { ApiException } from '../../core/api/models/common.model';
import { OrderResponse, QuoteRequest, QuoteResponse } from '../../core/api/models/order.model';
import { OrderApi } from '../../core/api/services/order.api';
import { AuthService } from '../../core/auth/auth.service';
import { AuthStore } from '../../core/auth/auth.store';
import { CartService } from '../../core/cart/cart.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { ShopInfoStore } from '../../core/shop/shop-info.store';
import { Crumb } from '../../shared/components/breadcrumbs/breadcrumbs';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { FormField } from '../../shared/components/form-field/form-field';
import { ImageUpload } from '../../shared/components/image-upload/image-upload';
import { OrderSummary } from '../../shared/components/order-summary/order-summary';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { Panel } from '../../shared/components/panel/panel';
import { ShopStatus } from '../../shared/components/shop-status/shop-status';
import { ProgressStep, StepProgress } from '../../shared/components/step-progress/step-progress';
import { PaymentMethodPicker } from '../../shared/components/payment-method-picker/payment-method-picker';
import { PhoneInput } from '../../shared/components/phone-input/phone-input';
import { PointRedeem } from '../../shared/components/point-redeem/point-redeem';
import { PointsChip } from '../../shared/components/points-chip/points-chip';
import { PromoCodeInput } from '../../shared/components/promo-code-input/promo-code-input';
import { QtyStepper } from '../../shared/components/qty-stepper/qty-stepper';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { cartSummaryLines } from '../../shared/utils/order-lines';
import {
  requiredText,
  shouldShowError,
  textField,
  thaiPhone,
  validationMessage,
} from '../../shared/utils/validators';
import { TEXT_LIMITS, cleanOptionalText, cleanText } from '../../shared/utils/sanitize';

@Component({
  selector: 'app-checkout-page',
  imports: [
    ShopStatus,
    StepProgress,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    EmptyState,
    FormField,
    ImageUpload,
    OrderSummary,
    PageHeader,
    Panel,
    PaymentMethodPicker,
    PhoneInput,
    PointRedeem,
    PointsChip,
    PromoCodeInput,
    QtyStepper,
    MoneyPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header [title]="i18n.t('checkout.title')" [crumbs]="crumbs" />

    <div class="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10">
      @if (cart.isEmpty()) {
        <div class="bg-card border-line shadow-soft mx-auto max-w-xl rounded-3xl border p-6">
          <app-empty-state icon="pi pi-inbox" [title]="i18n.t('checkout.emptyTitle')">
            <a
              pButton
              routerLink="/"
              fragment="menu"
              [label]="i18n.t('checkout.backToMenu')"
              icon="pi pi-arrow-left"
              [rounded]="true"
            ></a>
          </app-empty-state>
        </div>
      } @else {
        @if (!shop.acceptingOrders()) {
          <app-shop-status class="mb-5" />
        }
        <app-step-progress class="mb-5" [steps]="steps()" />
        <div class="grid items-start gap-5 lg:grid-cols-[1fr_24rem]">
          <div class="flex flex-col gap-5">
            <app-panel
              icon="pi pi-shopping-bag"
              [heading]="i18n.t('checkout.items', { n: cart.count() })"
            >
              <a
                panelActions
                routerLink="/"
                fragment="menu"
                class="text-brand text-sm font-semibold hover:underline"
              >
                <i class="pi pi-plus mr-1 text-xs"></i>{{ i18n.t('checkout.addMore') }}
              </a>
              <ul class="divide-line divide-y">
                @for (line of cart.lines(); track line.key) {
                  <li class="flex items-start justify-between gap-3 py-3">
                    <div class="min-w-0 flex-1">
                      <p class="text-ink text-sm font-semibold">{{ i18n.text(line.item.name) }}</p>
                      <p class="text-ink-muted mt-0.5 text-xs">{{ extras(line.key) }}</p>
                      <app-qty-stepper
                        class="mt-2"
                        size="sm"
                        [qty]="line.qty"
                        (increment)="cart.increment(line.key)"
                        (decrement)="cart.decrement(line.key)"
                      />
                    </div>
                    <span class="text-ink text-sm font-bold tabular-nums">
                      {{ line.unitPrice * line.qty | money: false }}
                    </span>
                  </li>
                }
              </ul>
            </app-panel>

            <app-panel icon="pi pi-user" [heading]="i18n.t('checkout.customer')">
              @if (auth.isCustomer() && auth.user(); as user) {
                <div
                  class="bg-brand-soft mb-4 flex items-center justify-between gap-3 rounded-2xl px-4 py-3"
                >
                  <div class="min-w-0">
                    <p class="text-ink truncate text-sm font-bold">{{ user.nickname }}</p>
                    <p class="text-ink-muted text-xs">{{ user.memberCode }}</p>
                  </div>
                  <app-points-chip [points]="user.pointsBalance" />
                </div>
              } @else {
                <div
                  class="bg-accent-soft mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl px-4 py-3"
                >
                  <p class="text-accent text-sm font-semibold">
                    <i class="pi pi-star-fill mr-1 text-xs"></i>
                    {{ i18n.t('checkout.loginToEarn', { n: quote()?.pointsToEarn ?? 0 }) }}
                  </p>
                  <a
                    routerLink="/login"
                    [queryParams]="{ returnUrl: '/checkout' }"
                    class="text-brand text-sm font-bold underline underline-offset-4"
                  >
                    {{ i18n.t('login.title') }}
                  </a>
                </div>
              }
              <form class="grid gap-4 sm:grid-cols-2" [formGroup]="form" novalidate>
                <app-form-field
                  inputId="checkout-name"
                  [label]="i18n.t('checkout.recipient') + ' *'"
                  [error]="errorFor('name')"
                >
                  <input
                    pInputText
                    id="checkout-name"
                    formControlName="name"
                    autocomplete="name"
                    class="rounded-xl"
                    [fluid]="true"
                    [placeholder]="i18n.t('checkout.recipientPlaceholder')"
                    [invalid]="!!errorFor('name')"
                  />
                </app-form-field>
                @if (!auth.isCustomer()) {
                  <app-form-field
                    inputId="checkout-phone"
                    [label]="i18n.t('register.phone')"
                    [error]="errorFor('phone')"
                  >
                    <app-phone-input
                      inputId="checkout-phone"
                      formControlName="phone"
                      [invalid]="!!errorFor('phone')"
                    />
                  </app-form-field>
                }
                <app-form-field
                  class="sm:col-span-2"
                  inputId="checkout-note"
                  [label]="i18n.t('checkout.note')"
                >
                  <textarea
                    pTextarea
                    id="checkout-note"
                    formControlName="note"
                    rows="2"
                    class="w-full rounded-xl"
                    [placeholder]="i18n.t('checkout.notePlaceholder')"
                  ></textarea>
                </app-form-field>
              </form>
            </app-panel>

            <app-panel icon="pi pi-wallet" [heading]="i18n.t('checkout.payment')">
              <app-payment-method-picker
                [methods]="paymentMethods()"
                [amount]="quote()?.totalAmount ?? cart.subtotal()"
                [(selected)]="paymentMethod"
              />
              @if (requiresSlip()) {
                <div class="border-line mt-4 border-t pt-4">
                  <p class="text-ink mb-2 text-sm font-semibold">{{ i18n.t('checkout.slip') }}</p>
                  <app-image-upload
                    mode="inline"
                    [url]="slipUrl()"
                    (urlChange)="onSlipUrlChange($event)"
                    (fileChange)="slipFile.set($event)"
                  />
                  <p class="text-ink-muted mt-2 text-xs">{{ i18n.t('checkout.slipLater') }}</p>
                </div>
              }
            </app-panel>
          </div>

          <div class="flex flex-col gap-5 lg:sticky lg:top-24">
            <app-panel icon="pi pi-ticket" [heading]="i18n.t('checkout.discounts')">
              <app-promo-code-input
                [appliedCode]="promoCode()"
                [error]="quote()?.promoCodeError ?? null"
                [loading]="quoting()"
                (apply)="promoCode.set($event)"
                (remove)="promoCode.set(null)"
              />
              @if (auth.isCustomer() && quote(); as current) {
                <div class="border-line mt-4 border-t pt-4">
                  <app-point-redeem
                    [balance]="current.pointsBalance ?? 0"
                    [max]="current.maxRedeemablePoints"
                    [min]="current.redeemMinPoints"
                    [perBaht]="current.redeemPointsPerBaht"
                    [(points)]="redeemPoints"
                  />
                </div>
              }
            </app-panel>

            <app-panel icon="pi pi-receipt" [heading]="i18n.t('checkout.summary')">
              <app-order-summary
                [showLines]="false"
                [subtotal]="quote()?.subtotal ?? cart.subtotal()"
                [total]="quote()?.totalAmount ?? cart.subtotal()"
                [promotions]="quote()?.appliedPromotions ?? []"
                [pointDiscount]="quote()?.pointDiscount ?? 0"
                [pointsRedeemed]="quote()?.pointsRedeemed ?? 0"
                [pointsToEarn]="auth.isCustomer() ? (quote()?.pointsToEarn ?? 0) : 0"
                [pickupLabel]="i18n.t('checkout.pickupFee')"
              />
              <p-button
                styleClass="mt-5"
                [label]="i18n.t('checkout.confirm')"
                icon="pi pi-check"
                [rounded]="true"
                size="large"
                [fluid]="true"
                [loading]="placing()"
                [disabled]="!paymentMethod() || !shop.acceptingOrders()"
                (onClick)="confirm()"
              />
              <a
                pButton
                routerLink="/"
                fragment="menu"
                class="mt-2"
                [label]="i18n.t('checkout.edit')"
                [text]="true"
                [fluid]="true"
              ></a>
            </app-panel>
          </div>
        </div>
      }
    </div>
  `,
})
export class CheckoutPage {
  protected readonly i18n = inject(I18nService);
  protected readonly cart = inject(CartService);
  protected readonly auth = inject(AuthStore);
  protected readonly shop = inject(ShopInfoStore);
  private readonly authService = inject(AuthService);
  private readonly orderApi = inject(OrderApi);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);

  protected readonly crumbs: Crumb[] = [
    { labelKey: 'crumb.menu', link: '/', fragment: 'menu' },
    { labelKey: 'crumb.checkout' },
  ];

  protected readonly submitted = signal(false);
  protected readonly placing = signal(false);
  protected readonly quoting = signal(false);
  protected readonly promoCode = signal<string | null>(null);
  protected readonly redeemPoints = signal(0);
  protected readonly paymentMethod = signal<string | null>(null);
  protected readonly slipUrl = signal<string | null>(null);
  protected readonly slipFile = signal<File | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: [this.auth.user()?.nickname ?? '', textField(TEXT_LIMITS.personName, true)],
    phone: ['', [Validators.maxLength(TEXT_LIMITS.phone), thaiPhone]],
    note: ['', textField(TEXT_LIMITS.note)],
  });

  private readonly formValid = toSignal(
    this.form.statusChanges.pipe(map((status) => status === 'VALID')),
    { initialValue: this.form.valid },
  );

  protected readonly steps = computed<ProgressStep[]>(() => [
    {
      label: this.i18n.t('checkout.stepItems'),
      icon: 'pi pi-shopping-bag',
      done: !this.cart.isEmpty(),
    },
    { label: this.i18n.t('checkout.customer'), icon: 'pi pi-user', done: this.formValid() },
    { label: this.i18n.t('checkout.payment'), icon: 'pi pi-wallet', done: !!this.paymentMethod() },
  ]);

  protected readonly paymentMethods = toSignal(
    this.orderApi.paymentMethods('ONLINE').pipe(catchError(() => of([]))),
    { initialValue: [] },
  );

  private readonly quoteRequest = computed<QuoteRequest>(() => ({
    channel: 'ONLINE',
    items: this.cart.requestItems(),
    promoCode: this.promoCode(),
    redeemPoints: this.redeemPoints() || null,
  }));

  protected readonly quote = toSignal(
    toObservable(this.quoteRequest).pipe(
      debounceTime(250),
      switchMap((request) => {
        if (!request.items.length) {
          return of(null);
        }
        this.quoting.set(true);
        return this.orderApi.quote(request).pipe(
          catchError(() => {
            this.redeemPoints.set(0);
            return of(null);
          }),
        );
      }),
    ),
    { initialValue: null as QuoteResponse | null },
  );

  protected readonly requiresSlip = computed(
    () =>
      this.paymentMethods().find((method) => method.code === this.paymentMethod())?.requiresSlip ??
      false,
  );

  private readonly lines = computed(() => cartSummaryLines(this.cart.lines(), this.i18n));

  constructor() {
    this.shop.load();
    effect(() => {
      this.quote();
      this.quoting.set(false);
    });
    effect(() => {
      const methods = this.paymentMethods();
      if (!this.paymentMethod() && methods.length) {
        this.paymentMethod.set(methods[0]?.code ?? null);
      }
    });
    effect(() => {
      const user = this.auth.user();
      const phone = this.form.controls.phone;
      if (this.auth.isCustomer()) {
        phone.disable();
      } else {
        phone.enable();
      }
      if (user && !this.form.controls.name.value) {
        this.form.controls.name.setValue(user.nickname);
      }
    });
  }

  protected onSlipUrlChange(url: string | null): void {
    this.slipUrl.set(url);
    if (!url) {
      this.slipFile.set(null);
    }
  }

  protected extras(key: string): string {
    return (
      this.lines().find((line) => line.key === key)?.extras || this.i18n.t('checkout.noExtras')
    );
  }

  protected errorFor(field: 'name' | 'phone'): string | null {
    const control = this.form.controls[field];
    if (!shouldShowError(control, this.submitted())) {
      return null;
    }
    return field === 'name'
      ? this.i18n.t('checkout.recipientRequired')
      : validationMessage(control, this.i18n);
  }

  protected confirm(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      const target = this.form.controls.name.invalid ? 'checkout-name' : 'checkout-phone';
      this.document.getElementById(target)?.focus();
      return;
    }
    const method = this.paymentMethod();
    if (!method) {
      return;
    }
    const value = this.form.getRawValue();
    const quote = this.quote();
    this.placing.set(true);
    this.orderApi
      .createOnline({
        items: this.cart.requestItems(),
        guestName: cleanText(value.name, TEXT_LIMITS.personName),
        guestPhone: this.auth.isCustomer() ? null : value.phone,
        note: cleanOptionalText(value.note, TEXT_LIMITS.note),
        paymentMethodCode: method,
        promoCode: quote?.promoCodeError ? null : this.promoCode(),
        redeemPoints: this.redeemPoints() || null,
      })
      .pipe(
        switchMap((order) => {
          const slip = this.slipFile();
          if (!slip || !this.requiresSlip()) {
            return of(order);
          }
          return this.orderApi
            .attachSlip(order.trackingToken, {
              methodCode: method,
              amount: order.totalAmount,
              slip,
            })
            .pipe(
              map(() => order),
              catchError(() => of(order)),
            );
        }),
      )
      .subscribe({
        next: (order: OrderResponse) => {
          this.placing.set(false);
          this.cart.clear();
          if (this.auth.isLoggedIn()) {
            this.authService.reloadMe().subscribe();
          }
          this.router.navigate(['/track', order.trackingToken], { queryParams: { placed: 1 } });
        },
        error: (error: ApiException) => {
          this.placing.set(false);
          if (error.code.startsWith('PROMOTION')) {
            this.promoCode.set(null);
          }
        },
      });
  }
}
