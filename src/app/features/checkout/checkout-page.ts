import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { catchError, debounceTime, finalize, map, of, switchMap } from 'rxjs';

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
import { OrderSummary } from '../../shared/components/order-summary/order-summary';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { ProductImage } from '../../shared/components/product-image/product-image';
import { ShopStatus } from '../../shared/components/shop-status/shop-status';
import { ProgressStep, StepProgress } from '../../shared/components/step-progress/step-progress';
import { PaymentMethodPicker } from '../../shared/components/payment-method-picker/payment-method-picker';
import { PhoneInput } from '../../shared/components/phone-input/phone-input';
import { PointRedeem } from '../../shared/components/point-redeem/point-redeem';
import { PromoCodeInput } from '../../shared/components/promo-code-input/promo-code-input';
import { QtyStepper } from '../../shared/components/qty-stepper/qty-stepper';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { SummaryLine, cartSummaryLines } from '../../shared/utils/order-lines';
import {
  requiredText,
  shouldShowError,
  textField,
  thaiPhone,
  validationMessage,
} from '../../shared/utils/validators';
import { TEXT_LIMITS, cleanOptionalText, cleanText } from '../../shared/utils/sanitize';
import { LineExtras } from '../../shared/components/line-extras/line-extras';

@Component({
  selector: 'app-checkout-page',
  imports: [
    NgTemplateOutlet,
    LineExtras,
    ShopStatus,
    StepProgress,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    TextareaModule,
    EmptyState,
    FormField,
    OrderSummary,
    PageHeader,
    ProductImage,
    PaymentMethodPicker,
    PhoneInput,
    PointRedeem,
    PromoCodeInput,
    QtyStepper,
    MoneyPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header [title]="i18n.t('checkout.title')" [crumbs]="crumbs" />

    <div class="mx-auto max-w-6xl px-4 pt-8 pb-28 md:px-6 md:pt-10 lg:pb-10">
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
        <div class="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_25rem]">
          <div class="flex flex-col gap-6">
            @if (stage() === 'details') {
              <section
                class="bg-card border-line shadow-soft animate-rise overflow-hidden rounded-3xl border"
              >
                <header class="border-line flex items-center gap-3 border-b px-5 py-4 md:px-6">
                  <span
                    class="from-brand to-accent font-display grid h-9 w-9 shrink-0 place-items-center rounded-full bg-linear-to-br text-sm font-extrabold text-white shadow-sm"
                    >1</span
                  >
                  <h2
                    class="font-display text-ink flex flex-1 items-center gap-2 text-lg font-bold"
                  >
                    <i class="pi pi-shopping-bag text-brand text-base"></i
                    >{{ i18n.t('checkout.items', { n: cart.count() }) }}
                  </h2>
                  <a
                    routerLink="/"
                    fragment="menu"
                    class="text-brand hover:bg-brand-soft inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition"
                  >
                    <i class="pi pi-plus text-xs"></i>{{ i18n.t('checkout.addMore') }}
                  </a>
                </header>
                <div class="px-5 py-5 md:px-6">
                  <ul class="flex flex-col gap-3">
                    @for (line of cart.lines(); track line.key) {
                      <li class="bg-canvas flex gap-4 rounded-2xl p-3">
                        <div class="bg-card h-20 w-20 shrink-0 overflow-hidden rounded-xl p-1">
                          <app-product-image
                            class="h-full"
                            [src]="line.item.imageUrl"
                            [palette]="line.item.palette"
                            [label]="i18n.text(line.item.name)"
                            imageClass="h-full w-full rounded-lg object-cover"
                          />
                        </div>
                        <div class="flex min-w-0 flex-1 flex-col">
                          <div class="flex items-start justify-between gap-3">
                            <p class="text-ink font-bold">{{ i18n.text(line.item.name) }}</p>
                            <span class="font-display text-ink text-lg font-bold tabular-nums">
                              {{ line.unitPrice * line.qty | money: false }}
                            </span>
                          </div>
                          <p class="text-ink-muted mt-0.5 text-xs">
                            <app-line-extras
                              [line]="summaryLine(line.key)"
                              [emptyText]="i18n.t('checkout.noExtras')"
                            />
                          </p>
                          <app-qty-stepper
                            class="mt-auto self-start pt-2"
                            size="sm"
                            [qty]="line.qty"
                            [addLabel]="
                              i18n.t('cart.increaseQty', { name: i18n.text(line.item.name) })
                            "
                            [removeLabel]="
                              i18n.t('cart.decreaseQty', { name: i18n.text(line.item.name) })
                            "
                            (increment)="cart.increment(line.key)"
                            (decrement)="cart.decrement(line.key)"
                          />
                        </div>
                      </li>
                    }
                  </ul>
                </div>
              </section>

              <section
                class="bg-card border-line shadow-soft animate-rise overflow-hidden rounded-3xl border"
              >
                <header class="border-line flex items-center gap-3 border-b px-5 py-4 md:px-6">
                  <span
                    class="from-brand to-accent font-display grid h-9 w-9 shrink-0 place-items-center rounded-full bg-linear-to-br text-sm font-extrabold text-white shadow-sm"
                    >2</span
                  >
                  <h2
                    class="font-display text-ink flex flex-1 items-center gap-2 text-lg font-bold"
                  >
                    <i class="pi pi-user text-brand text-base"></i>{{ i18n.t('checkout.customer') }}
                  </h2>
                </header>
                <div class="px-5 py-5 md:px-6">
                  @if (auth.isCustomer() && auth.user(); as user) {
                    <div
                      class="bg-royal relative mb-5 flex items-center gap-4 overflow-hidden rounded-2xl px-5 py-4 text-white"
                    >
                      <i
                        class="pi pi-star-fill pointer-events-none absolute -top-4 -right-2 text-[5rem] text-white/10"
                      ></i>
                      <span
                        class="font-display relative grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/15 text-lg font-bold"
                        >{{ user.nickname.charAt(0) }}</span
                      >
                      <div class="relative min-w-0 flex-1">
                        <p class="truncate font-bold">{{ user.nickname }}</p>
                        <p class="text-xs text-white/70">{{ user.memberCode }}</p>
                      </div>
                      <span
                        class="bg-accent relative inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold"
                      >
                        <i class="pi pi-star-fill text-xs"></i>{{ user.pointsBalance }}
                      </span>
                    </div>
                  } @else if (!auth.isLoggedIn()) {
                    <div
                      class="from-accent/15 to-brand/10 mb-5 flex flex-wrap items-center gap-3 rounded-2xl bg-linear-to-r px-4 py-3"
                    >
                      <span
                        class="bg-accent grid h-9 w-9 place-items-center rounded-full text-white"
                      >
                        <i class="pi pi-star-fill text-sm"></i>
                      </span>
                      <p class="text-ink min-w-0 flex-1 text-sm font-semibold">
                        {{ i18n.t('checkout.loginToEarn', { n: quote()?.pointsToEarn ?? 0 }) }}
                      </p>
                      <a
                        routerLink="/login"
                        [queryParams]="{ returnUrl: '/checkout' }"
                        class="bg-brand text-on-brand rounded-full px-4 py-1.5 text-sm font-bold transition hover:brightness-110"
                      >
                        {{ i18n.t('login.title') }}
                      </a>
                    </div>
                  }
                  <form class="grid gap-5 sm:grid-cols-2" [formGroup]="form" novalidate>
                    <app-form-field
                      inputId="checkout-name"
                      [label]="i18n.t('checkout.recipient') + ' *'"
                      [error]="errorFor('name')"
                    >
                      <p-iconfield>
                        <p-inputicon class="pi pi-user text-brand" />
                        <input
                          pInputText
                          id="checkout-name"
                          formControlName="name"
                          autocomplete="name"
                          class="h-12 rounded-xl"
                          [fluid]="true"
                          [placeholder]="i18n.t('checkout.recipientPlaceholder')"
                          [invalid]="!!errorFor('name')"
                        />
                      </p-iconfield>
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
                </div>
              </section>
            } @else {
              <section
                class="bg-card border-line shadow-soft flex flex-wrap items-center gap-4 rounded-3xl border px-5 py-4 md:px-6"
              >
                <span
                  class="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
                  ><i class="pi pi-check"></i
                ></span>
                <div class="min-w-0 flex-1">
                  <p class="text-ink-muted text-xs">{{ i18n.t('checkout.customer') }}</p>
                  <p class="text-ink truncate font-bold">
                    {{ form.controls.name.value }}
                    @if (form.controls.phone.value) {
                      <span class="text-ink-muted font-normal"
                        >· {{ form.controls.phone.value }}</span
                      >
                    }
                  </p>
                  <p class="text-ink-muted text-xs">
                    {{ i18n.t('checkout.items', { n: cart.count() }) }}
                  </p>
                </div>
                <button
                  type="button"
                  class="text-brand hover:bg-brand-soft inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition"
                  (click)="backToDetails()"
                >
                  <i class="pi pi-pencil text-xs"></i>{{ i18n.t('common.edit') }}
                </button>
              </section>

              <section
                class="bg-card border-line shadow-soft animate-rise overflow-hidden rounded-3xl border"
              >
                <header class="border-line flex items-center gap-3 border-b px-5 py-4 md:px-6">
                  <span
                    class="from-brand to-accent font-display grid h-9 w-9 shrink-0 place-items-center rounded-full bg-linear-to-br text-sm font-extrabold text-white shadow-sm"
                    >3</span
                  >
                  <h2
                    class="font-display text-ink flex flex-1 items-center gap-2 text-lg font-bold"
                  >
                    <i class="pi pi-wallet text-brand text-base"></i
                    >{{ i18n.t('checkout.payment') }}
                  </h2>
                </header>
                <div class="px-5 py-5 md:px-6">
                  <app-payment-method-picker
                    [methods]="paymentMethods()"
                    [amount]="quote()?.totalAmount ?? cart.subtotal()"
                    [(selected)]="paymentMethod"
                  />
                </div>
              </section>
            }
          </div>

          <aside class="lg:sticky lg:top-24">
            <div class="bg-card border-line shadow-lift overflow-hidden rounded-3xl border">
              <div class="bg-royal relative overflow-hidden px-6 py-5 text-white">
                <i
                  class="pi pi-receipt pointer-events-none absolute -top-5 -right-3 text-[6rem] text-white/10"
                ></i>
                <p class="relative text-sm text-white/75">{{ i18n.t('checkout.summary') }}</p>
                <p class="font-display relative mt-1 text-4xl font-extrabold tabular-nums">
                  {{ quote()?.totalAmount ?? cart.subtotal() | money }}
                </p>
                <p class="relative mt-1 text-xs text-white/70">
                  {{ i18n.t('checkout.items', { n: cart.count() }) }}
                </p>
              </div>

              <div class="flex flex-col gap-5 px-6 py-5">
                <div>
                  <p class="text-ink mb-2 flex items-center gap-2 text-sm font-bold">
                    <i class="pi pi-ticket text-brand"></i>{{ i18n.t('checkout.discounts') }}
                  </p>
                  <app-promo-code-input
                    [appliedCode]="promoCode()"
                    [error]="quote()?.promoCodeError ?? null"
                    [loading]="quoting()"
                    (apply)="promoCode.set($event)"
                    (remove)="promoCode.set(null)"
                  />
                  @if (auth.isCustomer() && redeemableQuote(); as current) {
                    <div class="border-line mt-4 border-t pt-4">
                      <app-point-redeem
                        [balance]="current.pointsBalance ?? 0"
                        [max]="current.maxRedeemablePoints ?? 0"
                        [min]="current.redeemMinPoints ?? 0"
                        [perBaht]="current.redeemPointsPerBaht"
                        [(points)]="redeemPoints"
                      />
                    </div>
                  }
                </div>

                <div class="border-line border-t pt-4">
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
                </div>

                <div class="flex flex-col gap-2">
                  <div class="hidden lg:block">
                    <ng-container *ngTemplateOutlet="primaryAction" />
                  </div>
                  <ng-template #primaryAction>
                    <button
                      type="button"
                      [attr.aria-busy]="placing()"
                      class="from-brand to-accent shadow-lift flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r text-lg font-bold text-white transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                      [disabled]="
                        stage() === 'details'
                          ? !shop.acceptingOrders()
                          : placing() || !paymentMethod() || !shop.acceptingOrders()
                      "
                      (click)="stage() === 'details' ? goToPayment() : confirm()"
                    >
                      @if (stage() === 'details') {
                        {{ i18n.t('checkout.nextPayment') }}
                        <i class="pi pi-arrow-right"></i>
                      } @else {
                        <i
                          class="pi"
                          [class]="placing() ? 'pi-spin pi-spinner' : 'pi-check-circle'"
                        ></i>
                        {{ i18n.t('checkout.confirm') }}
                      }
                    </button>
                  </ng-template>
                  @if (stage() === 'details') {
                    <a
                      routerLink="/"
                      fragment="menu"
                      class="text-ink-muted hover:text-brand py-2 text-center text-sm font-semibold transition"
                    >
                      <i class="pi pi-arrow-left mr-1 text-xs"></i>{{ i18n.t('checkout.edit') }}
                    </a>
                  } @else {
                    <button
                      type="button"
                      class="text-ink-muted hover:text-brand py-2 text-center text-sm font-semibold transition"
                      (click)="backToDetails()"
                    >
                      <i class="pi pi-arrow-left mr-1 text-xs"></i>{{ i18n.t('checkout.back') }}
                    </button>
                  }
                  <p
                    class="text-ink-muted bg-canvas flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs"
                  >
                    <i class="pi pi-shop text-brand"></i>{{ i18n.t('checkout.pickupNote') }}
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
        <div
          class="bg-card/95 border-line fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t px-4 py-3 backdrop-blur lg:hidden"
        >
          <div class="shrink-0">
            <p class="text-ink-muted text-xs">{{ i18n.t('cart.total') }}</p>
            <p class="font-display text-brand text-xl font-extrabold tabular-nums">
              {{ quote()?.totalAmount ?? cart.subtotal() | money }}
            </p>
          </div>
          <div class="min-w-0 flex-1">
            <ng-container *ngTemplateOutlet="primaryAction" />
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

  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: [this.auth.user()?.nickname ?? '', textField(TEXT_LIMITS.personName, true)],
    phone: ['', [Validators.maxLength(TEXT_LIMITS.phone), thaiPhone]],
    note: ['', textField(TEXT_LIMITS.note)],
  });

  private readonly formValid = toSignal(
    this.form.statusChanges.pipe(map((status) => status === 'VALID')),
    { initialValue: this.form.valid },
  );

  protected readonly stage = signal<'details' | 'payment'>('details');

  protected readonly steps = computed<ProgressStep[]>(() => [
    {
      label: this.i18n.t('checkout.stepItems'),
      icon: 'pi pi-shopping-bag',
      done: !this.cart.isEmpty(),
    },
    { label: this.i18n.t('checkout.customer'), icon: 'pi pi-user', done: this.formValid() },
    {
      label: this.i18n.t('checkout.payment'),
      icon: 'pi pi-wallet',
      done: this.stage() === 'payment' && !!this.paymentMethod(),
    },
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
          finalize(() => this.quoting.set(false)),
        );
      }),
    ),
    { initialValue: null as QuoteResponse | null },
  );

  private readonly lines = computed(() => cartSummaryLines(this.cart.lines(), this.i18n));

  protected readonly redeemableQuote = computed(() => {
    const quote = this.quote();
    return quote?.maxRedeemablePoints != null && quote.redeemMinPoints != null ? quote : null;
  });

  constructor() {
    this.shop.load();
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
      if (user?.phone && !phone.value) {
        phone.setValue(user.phone);
      }
    });
  }

  protected summaryLine(key: string): SummaryLine | undefined {
    return this.lines().find((line) => line.key === key);
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

  protected goToPayment(): void {
    if (!this.validateDetails()) {
      return;
    }
    this.stage.set('payment');
    this.document.defaultView?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected backToDetails(): void {
    this.stage.set('details');
    this.document.defaultView?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private validateDetails(): boolean {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.stage.set('details');
      const target = this.form.controls.name.invalid ? 'checkout-name' : 'checkout-phone';
      setTimeout(() => this.document.getElementById(target)?.focus());
      return false;
    }
    return true;
  }

  protected confirm(): void {
    if (!this.validateDetails()) {
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
