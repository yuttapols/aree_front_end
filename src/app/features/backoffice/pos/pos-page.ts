import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { catchError, debounceTime, finalize, of, switchMap } from 'rxjs';

import { OrderResponse, QuoteResponse } from '../../../core/api/models/order.model';
import { OrderApi } from '../../../core/api/services/order.api';
import { CatalogStore } from '../../../core/catalog/catalog.store';
import { I18nService } from '../../../core/i18n/i18n.service';
import { MenuItem } from '../../../core/models/menu.model';
import { CategoryTab, CategoryTabs } from '../../../shared/components/category-tabs/category-tabs';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import {
  ItemOptionsDialog,
  OptionsResult,
} from '../../../shared/components/item-options-dialog/item-options-dialog';
import { MemberLookup } from '../../../shared/components/member-lookup/member-lookup';
import { OrderSummary } from '../../../shared/components/order-summary/order-summary';
import { PointRedeem } from '../../../shared/components/point-redeem/point-redeem';
import { ProductTile } from '../../../shared/components/product-tile/product-tile';
import { PromoCodeInput } from '../../../shared/components/promo-code-input/promo-code-input';
import { QtyStepper } from '../../../shared/components/qty-stepper/qty-stepper';
import { QuickRegisterDialog } from '../../../shared/components/quick-register-dialog/quick-register-dialog';
import { SearchBox } from '../../../shared/components/search-box/search-box';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { cartSummaryLines } from '../../../shared/utils/order-lines';
import { PosStore } from './pos.store';

const ALL = 'all';

@Component({
  selector: 'app-pos-page',
  imports: [
    FormsModule,
    ButtonModule,
    InputTextModule,
    CategoryTabs,
    EmptyState,
    ItemOptionsDialog,
    MemberLookup,
    OrderSummary,
    PointRedeem,
    ProductTile,
    PromoCodeInput,
    QtyStepper,
    QuickRegisterDialog,
    SearchBox,
    MoneyPipe,
  ],
  providers: [PosStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="grid"
      [class]="
        embedded()
          ? 'bg-card border-line shadow-soft rounded-3xl border lg:grid-cols-[1fr_24rem]'
          : 'min-h-[calc(100dvh-72px)] lg:grid-cols-[1fr_26rem]'
      "
    >
      <section class="flex min-w-0 flex-col gap-4 p-4 md:p-6">
        <div class="flex flex-wrap items-center gap-3">
          @if (embedded()) {
            <h2 class="font-display text-ink text-2xl font-bold">{{ i18n.t('bo.nav.pos') }}</h2>
          } @else {
            <h1 class="font-display text-ink text-2xl font-bold">{{ i18n.t('bo.nav.pos') }}</h1>
          }
          <app-search-box
            class="ml-auto w-full sm:w-72"
            [placeholder]="i18n.t('search.placeholder')"
            [clearLabel]="i18n.t('search.clear')"
            (search)="query.set($event)"
          />
        </div>
        <app-category-tabs
          [tabs]="tabs()"
          [selected]="category()"
          (selectedChange)="category.set($event)"
        />
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          @for (item of products(); track item.id) {
            <app-product-tile [item]="item" [qty]="store.qtyOf(item.id)" (pick)="pick($event)" />
          } @empty {
            <app-empty-state
              class="col-span-full"
              icon="pi pi-search"
              [title]="i18n.t('menu.empty')"
            />
          }
        </div>
      </section>

      <aside
        class="bg-card border-line flex flex-col border-t lg:sticky lg:border-t-0 lg:border-l"
        [class]="
          embedded()
            ? 'rounded-b-3xl lg:top-[88px] lg:max-h-[calc(100dvh-104px)] lg:self-start lg:rounded-r-3xl lg:rounded-bl-none'
            : 'lg:top-[72px] lg:h-[calc(100dvh-72px)]'
        "
      >
        <div class="border-line flex items-center justify-between border-b px-5 py-4">
          <h2 class="text-ink text-lg font-bold">{{ i18n.t('pos.bill') }} · {{ store.count() }}</h2>
          @if (store.count()) {
            <button
              type="button"
              class="text-ink-muted hover:text-accent text-xs"
              (click)="store.reset()"
            >
              {{ i18n.t('pos.clearBill') }}
            </button>
          }
        </div>

        <div class="flex-1 overflow-y-auto px-5 py-3">
          @if (store.lines().length) {
            <ul class="divide-line divide-y">
              @for (line of summaryLines(); track line.key) {
                <li class="flex items-start justify-between gap-3 py-2.5">
                  <div class="min-w-0 flex-1">
                    <p class="text-ink text-sm font-semibold">{{ line.name }}</p>
                    @if (line.extras) {
                      <p class="text-ink-muted text-xs">{{ line.extras }}</p>
                    }
                    <app-qty-stepper
                      class="mt-1.5"
                      size="sm"
                      [qty]="line.qty"
                      (increment)="store.change(line.key, 1)"
                      (decrement)="store.change(line.key, -1)"
                    />
                  </div>
                  <span class="text-ink text-sm font-bold tabular-nums">{{
                    line.total | money: false
                  }}</span>
                </li>
              }
            </ul>
          } @else {
            <app-empty-state
              icon="pi pi-shopping-cart"
              [title]="i18n.t('pos.emptyBill')"
              [hint]="i18n.t('pos.emptyHint')"
            />
          }

          <div class="border-line mt-3 flex flex-col gap-4 border-t pt-4">
            <div>
              <p class="text-ink mb-2 text-sm font-semibold">{{ i18n.t('pos.member') }}</p>
              <app-member-lookup
                [member]="store.member()"
                (memberChange)="store.setMember($event)"
                (registerRequested)="registerPhone.set($event); registerOpen.set(true)"
              />
            </div>
            <app-promo-code-input
              [appliedCode]="store.promoCode()"
              [error]="quote()?.promoCodeError ?? null"
              (apply)="store.promoCode.set($event)"
              (remove)="store.promoCode.set(null)"
            />
            @if (store.member() && quote(); as current) {
              <app-point-redeem
                [balance]="current.pointsBalance ?? 0"
                [max]="current.maxRedeemablePoints"
                [min]="current.redeemMinPoints"
                [perBaht]="current.redeemPointsPerBaht"
                [points]="store.redeemPoints()"
                (pointsChange)="store.redeemPoints.set($event)"
              />
            }
            <input
              pInputText
              class="rounded-xl"
              [placeholder]="i18n.t('checkout.notePlaceholder')"
              [ngModel]="store.note()"
              (ngModelChange)="store.note.set($event)"
            />
          </div>
        </div>

        <div class="border-line border-t px-5 py-4">
          <app-order-summary
            [showLines]="false"
            [subtotal]="quote()?.subtotal ?? store.subtotal()"
            [total]="quote()?.totalAmount ?? store.subtotal()"
            [promotions]="quote()?.appliedPromotions ?? []"
            [pointDiscount]="quote()?.pointDiscount ?? 0"
            [pointsRedeemed]="quote()?.pointsRedeemed ?? 0"
            [pointsToEarn]="store.member() ? (quote()?.pointsToEarn ?? 0) : 0"
          />
          <p-button
            styleClass="mt-4"
            [label]="i18n.t('pos.addToQueue')"
            icon="pi pi-list"
            size="large"
            [rounded]="true"
            [fluid]="true"
            [disabled]="!store.lines().length"
            [loading]="creating()"
            (onClick)="charge()"
          />
        </div>
      </aside>
    </div>

    <app-item-options-dialog
      [item]="optionsItem()"
      (added)="addWithOptions($event)"
      (closed)="optionsItem.set(null)"
    />
    <app-quick-register-dialog
      [(visible)]="registerOpen"
      [initialPhone]="registerPhone()"
      (registered)="store.setMember($event)"
    />
  `,
})
export class PosPage {
  protected readonly i18n = inject(I18nService);
  protected readonly store = inject(PosStore);
  private readonly catalog = inject(CatalogStore);
  private readonly orderApi = inject(OrderApi);
  private readonly messages = inject(MessageService);
  private readonly router = inject(Router);

  readonly embedded = input(false);
  readonly orderCreated = output<OrderResponse>();

  protected readonly category = signal(ALL);
  protected readonly query = signal('');
  protected readonly optionsItem = signal<MenuItem | null>(null);
  protected readonly creating = signal(false);
  protected readonly registerOpen = signal(false);
  protected readonly registerPhone = signal('');

  protected readonly tabs = computed<CategoryTab[]>(() => [
    { id: ALL, label: this.i18n.t('category.all') },
    ...this.catalog.categories().map((category) => ({
      id: category.id,
      label: this.i18n.text(category.name),
    })),
  ]);

  protected readonly products = computed(() => {
    const category = this.category();
    const query = this.query().toLowerCase();
    return this.catalog
      .items()
      .filter((item) => category === ALL || item.categoryId === category)
      .filter(
        (item) =>
          !query || `${item.code} ${item.name.th} ${item.name.en}`.toLowerCase().includes(query),
      );
  });

  protected readonly summaryLines = computed(() => cartSummaryLines(this.store.lines(), this.i18n));

  protected readonly quote = toSignal(
    toObservable(
      computed(() => ({
        items: this.store.requestItems(),
        customerPhone: this.store.member()?.phone ?? null,
        promoCode: this.store.promoCode(),
        redeemPoints: this.store.redeemPoints() || null,
      })),
    ).pipe(
      debounceTime(200),
      switchMap((request) =>
        request.items.length
          ? this.orderApi.quote({ channel: 'WALK_IN', ...request }).pipe(
              catchError(() => {
                this.store.redeemPoints.set(0);
                return of(null);
              }),
            )
          : of(null),
      ),
    ),
    { initialValue: null as QuoteResponse | null },
  );

  constructor() {
    this.catalog.refresh();
    effect(() => {
      if (!this.store.member()) {
        this.store.redeemPoints.set(0);
      }
    });
  }

  protected pick(item: MenuItem): void {
    if (item.optionGroups.some((group) => group.options.length)) {
      this.optionsItem.set(item);
      return;
    }
    this.store.add(item);
  }

  protected addWithOptions(result: OptionsResult): void {
    this.store.add(result.item, result.options, result.qty);
    this.optionsItem.set(null);
  }

  protected charge(): void {
    const quote = this.quote();
    this.creating.set(true);
    this.orderApi
      .createPos({
        items: this.store.requestItems(),
        customerPhone: this.store.member()?.phone ?? null,
        note: this.store.note().trim() || null,
        promoCode: quote?.promoCodeError ? null : this.store.promoCode(),
        redeemPoints: this.store.redeemPoints() || null,
      })
      .pipe(finalize(() => this.creating.set(false)))
      .subscribe((order) => {
        this.store.reset();
        this.messages.add({
          severity: 'success',
          summary: this.i18n.t('pos.queued'),
          detail: this.i18n.t('pos.queueIs', { n: order.queueNo }),
        });
        if (this.embedded()) {
          this.orderCreated.emit(order);
        } else {
          this.router.navigate(['/backoffice/today']);
        }
      });
  }
}
