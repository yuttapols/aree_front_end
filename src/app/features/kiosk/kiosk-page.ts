import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { catchError, debounceTime, of, switchMap } from 'rxjs';

import { OrderResponse } from '../../core/api/models/order.model';
import { OrderApi } from '../../core/api/services/order.api';
import { CartService } from '../../core/cart/cart.service';
import { fallbackPalette } from '../../core/catalog/catalog.mapper';
import { CatalogStore } from '../../core/catalog/catalog.store';
import { I18nService } from '../../core/i18n/i18n.service';
import { ALL_CATEGORIES, MenuFilterService } from '../../core/menu/menu-filter.service';
import { MenuItem } from '../../core/models/menu.model';
import { BrandLogo } from '../../shared/components/brand-logo/brand-logo';
import { FoodPlate } from '../../shared/components/food-plate/food-plate';
import {
  ItemOptionsDialog,
  OptionsResult,
} from '../../shared/components/item-options-dialog/item-options-dialog';
import { LangSwitch } from '../../shared/components/lang-switch/lang-switch';
import { LineExtras } from '../../shared/components/line-extras/line-extras';
import { LoadingSkeleton } from '../../shared/components/loading-skeleton/loading-skeleton';
import { ProductImage } from '../../shared/components/product-image/product-image';
import { QtyStepper } from '../../shared/components/qty-stepper/qty-stepper';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { SummaryLine, cartSummaryLines } from '../../shared/utils/order-lines';
import { TEXT_LIMITS, cleanText } from '../../shared/utils/sanitize';
import { CartActions } from '../cart/cart-actions.service';

const RESET_SECONDS = 20;
const PAY_AT_COUNTER_METHOD = 'CASH';

type KioskStage = 'menu' | 'review';

@Component({
  selector: 'app-kiosk-page',
  imports: [
    FormsModule,
    InputTextModule,
    BrandLogo,
    FoodPlate,
    ItemOptionsDialog,
    LangSwitch,
    LineExtras,
    LoadingSkeleton,
    MoneyPipe,
    ProductImage,
    QtyStepper,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-canvas flex h-dvh flex-col">
      <header class="bg-royal flex shrink-0 items-center gap-3 px-4 py-2 md:px-6">
        <app-brand-logo class="h-14" />
        <span class="font-display hidden text-2xl font-extrabold text-white sm:block">{{
          i18n.t('brand.name')
        }}</span>
        <app-lang-switch class="ml-auto" variant="glass" />
        <button
          type="button"
          class="flex h-12 items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 font-semibold text-white transition active:scale-95"
          (click)="startOver()"
        >
          <i class="pi pi-refresh" aria-hidden="true"></i>{{ i18n.t('kiosk.startOver') }}
        </button>
      </header>

      @if (stage() === 'menu') {
        <div class="flex min-h-0 flex-1 flex-col md:flex-row">
          <nav
            class="bg-royal flex shrink-0 gap-2 overflow-x-auto px-3 pb-3 [scrollbar-width:none] md:w-40 md:flex-col md:overflow-y-auto md:pt-2 lg:w-48"
            [attr.aria-label]="i18n.t('kiosk.categories')"
          >
            @for (category of categories(); track category.id) {
              @let active = filter.category() === category.id;
              <button
                type="button"
                class="flex min-w-24 shrink-0 flex-col items-center gap-2 rounded-3xl px-2 py-4 text-center transition active:scale-95"
                [class]="
                  active
                    ? 'bg-accent text-white shadow-[0_12px_28px_-10px_rgb(249_115_22/0.8)]'
                    : 'text-white/75 hover:bg-white/10'
                "
                [attr.aria-pressed]="active"
                (click)="filter.category.set(category.id)"
              >
                <span
                  class="grid h-16 w-16 place-items-center rounded-full bg-white p-1.5 transition"
                  [class]="active ? 'ring-4 ring-white/40' : 'opacity-90'"
                >
                  <app-food-plate class="h-full w-full" [palette]="category.palette" />
                </span>
                <span class="font-display text-base leading-tight font-bold">{{
                  category.label
                }}</span>
              </button>
            }
          </nav>

          <main class="min-h-0 flex-1 overflow-y-auto p-4 pb-36 md:p-8 md:pb-36">
            <div class="mb-6 flex items-end justify-between gap-4">
              <h1
                class="font-display text-ink text-4xl leading-none font-extrabold tracking-tight md:text-6xl"
              >
                {{ activeCategoryLabel() }}
              </h1>
              @if (catalog.loaded()) {
                <span class="text-ink-muted shrink-0 pb-1 text-lg">{{
                  i18n.t('kiosk.menuCount', { n: filter.items().length })
                }}</span>
              }
            </div>
            @if (catalog.failed() && !catalog.items().length) {
              <div
                role="alert"
                class="bg-card border-line flex flex-col items-center gap-3 rounded-3xl border border-dashed px-6 py-12 text-center"
              >
                <i class="pi pi-exclamation-circle text-accent text-3xl" aria-hidden="true"></i>
                <p class="text-ink font-semibold">{{ i18n.t('menu.loadError') }}</p>
                <button
                  type="button"
                  class="bg-brand text-on-brand inline-flex min-h-12 items-center gap-2 rounded-full px-6 font-bold"
                  [disabled]="catalog.loading()"
                  (click)="catalog.refresh()"
                >
                  <i
                    class="pi pi-refresh"
                    [class.pi-spin]="catalog.loading()"
                    aria-hidden="true"
                  ></i
                  >{{ i18n.t('menu.retry') }}
                </button>
              </div>
            } @else if (catalog.loaded()) {
              <ul class="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-6">
                @for (item of filter.items(); track item.id) {
                  @let qty = qtyOf(item.id);
                  <li>
                    <button
                      type="button"
                      class="bg-card shadow-soft relative flex h-full w-full flex-col rounded-[2rem] p-3 text-left transition active:scale-[0.97] disabled:opacity-50"
                      [class]="qty ? 'ring-accent ring-4' : ''"
                      [disabled]="item.soldOut"
                      (click)="add(item)"
                    >
                      <div
                        class="bg-brand-soft relative aspect-[4/3] w-full overflow-hidden rounded-[1.5rem]"
                      >
                        <app-product-image
                          class="h-full"
                          [src]="item.imageUrl"
                          [palette]="item.palette"
                          [label]="i18n.text(item.name)"
                          imageClass="h-full w-full object-cover"
                        />
                        @if (item.soldOut) {
                          <span
                            class="absolute inset-0 grid place-items-center bg-black/55 text-xl font-bold text-white"
                            >{{ i18n.t('kiosk.soldOut') }}</span
                          >
                        }
                      </div>
                      <span
                        class="bg-accent font-display absolute top-6 -left-2 -rotate-6 rounded-2xl px-4 py-1.5 text-2xl font-extrabold text-white shadow-[0_10px_20px_-8px_rgb(249_115_22/0.9)]"
                        >{{ item.price | money: false }}</span
                      >
                      @if (qty) {
                        @for (count of [qty]; track count) {
                          <span
                            class="bg-royal animate-pop absolute top-5 right-5 grid h-11 min-w-11 place-items-center rounded-full px-2 text-lg font-extrabold text-white shadow-lg"
                            [attr.aria-label]="i18n.t('kiosk.inOrder', { n: count })"
                            >{{ count }}</span
                          >
                        }
                      }
                      <div class="flex flex-1 items-end gap-3 px-2 pt-4 pb-1">
                        <div class="min-w-0 flex-1">
                          <p class="font-display text-ink text-xl leading-snug font-bold">
                            {{ i18n.text(item.name) }}
                          </p>
                          @if (i18n.text(item.description); as description) {
                            <p class="text-ink-muted mt-0.5 line-clamp-1 text-sm">
                              {{ description }}
                            </p>
                          }
                        </div>
                        <span
                          class="bg-brand grid h-14 w-14 shrink-0 place-items-center rounded-full text-white shadow-md"
                          aria-hidden="true"
                          ><i class="pi pi-plus text-xl"></i
                        ></span>
                      </div>
                    </button>
                  </li>
                }
              </ul>
            } @else {
              <app-loading-skeleton variant="card" [count]="8" />
            }
          </main>
        </div>
      } @else {
        <main class="min-h-0 flex-1 overflow-y-auto p-4 pb-32 md:p-8 md:pb-32">
          <div class="mx-auto flex max-w-3xl flex-col gap-5">
            <h1 class="font-display text-ink text-3xl font-extrabold">
              {{ i18n.t('kiosk.yourOrder') }}
            </h1>
            <ul class="bg-card border-line shadow-soft rounded-3xl border px-5">
              @for (line of cart.lines(); track line.key) {
                <li class="border-line flex items-center gap-4 border-b py-4 last:border-b-0">
                  <div class="bg-brand-soft h-20 w-20 shrink-0 overflow-hidden rounded-2xl p-1">
                    <app-product-image
                      class="h-full"
                      [src]="line.item.imageUrl"
                      [palette]="line.item.palette"
                      [label]="i18n.text(line.item.name)"
                      imageClass="h-full w-full rounded-xl object-cover"
                    />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-ink text-lg font-bold">{{ i18n.text(line.item.name) }}</p>
                    <p class="text-ink-muted text-sm">
                      <app-line-extras [line]="summaryLine(line.key)" />
                    </p>
                    <app-qty-stepper
                      class="mt-2 inline-block"
                      [qty]="line.qty"
                      [addLabel]="i18n.t('cart.increaseQty', { name: i18n.text(line.item.name) })"
                      [removeLabel]="
                        i18n.t('cart.decreaseQty', { name: i18n.text(line.item.name) })
                      "
                      (increment)="cart.increment(line.key)"
                      (decrement)="cart.decrement(line.key)"
                    />
                  </div>
                  <span class="font-display text-ink text-xl font-bold tabular-nums">{{
                    line.unitPrice * line.qty | money: false
                  }}</span>
                </li>
              } @empty {
                <li class="text-ink-muted py-12 text-center">{{ i18n.t('kiosk.empty') }}</li>
              }
            </ul>
            <div class="bg-card border-line shadow-soft flex flex-col gap-2 rounded-3xl border p-5">
              <label for="kiosk-name" class="text-ink text-lg font-bold"
                >{{ i18n.t('kiosk.name') }} *</label
              >
              <input
                pInputText
                id="kiosk-name"
                class="h-14 rounded-2xl text-lg"
                autocomplete="off"
                [maxlength]="nameLimit"
                [placeholder]="i18n.t('kiosk.namePlaceholder')"
                [invalid]="nameMissing()"
                [ngModel]="name()"
                (ngModelChange)="name.set($event)"
              />
              @if (nameMissing()) {
                <p class="text-sm font-semibold text-red-600 dark:text-red-400">
                  {{ i18n.t('kiosk.nameRequired') }}
                </p>
              }
            </div>
          </div>
        </main>
      }

      <footer
        class="bg-royal fixed inset-x-0 bottom-0 z-30 flex items-center gap-4 px-4 py-4 text-white shadow-[0_-16px_40px_-20px_rgb(58_20_102/0.9)] md:px-8"
      >
        @if (stage() === 'review') {
          <button
            type="button"
            class="flex h-16 shrink-0 items-center gap-2 rounded-2xl border-2 border-white/25 px-5 text-lg font-bold transition hover:bg-white/10 active:scale-95"
            (click)="stage.set('menu')"
          >
            <i class="pi pi-arrow-left" aria-hidden="true"></i>{{ i18n.t('kiosk.addMore') }}
          </button>
        } @else {
          <span
            class="relative grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white/10"
            [attr.aria-label]="i18n.t('kiosk.itemCount', { n: cart.count() })"
          >
            <i class="pi pi-shopping-bag text-2xl" aria-hidden="true"></i>
            <span
              class="bg-accent absolute -top-2 -right-2 grid h-8 min-w-8 place-items-center rounded-full px-1.5 text-base font-extrabold"
              >{{ cart.count() }}</span
            >
          </span>
          <ul
            class="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto py-1 [scrollbar-width:none]"
            [attr.aria-label]="i18n.t('kiosk.yourOrder')"
          >
            @for (line of cart.lines(); track line.key) {
              <li class="shrink-0">
                <button
                  type="button"
                  class="animate-pop flex h-16 max-w-64 items-center gap-3 rounded-2xl bg-white/10 py-2 pr-4 pl-2 text-left transition hover:bg-white/15 active:scale-95"
                  (click)="stage.set('review')"
                >
                  <span class="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-white p-0.5">
                    <app-product-image
                      class="h-full"
                      [src]="line.item.imageUrl"
                      [palette]="line.item.palette"
                      imageClass="h-full w-full rounded-[0.6rem] object-cover"
                    />
                  </span>
                  <span class="min-w-0">
                    <span class="flex items-center gap-1.5 font-bold">
                      <span class="truncate">{{ i18n.text(line.item.name) }}</span>
                      <span class="bg-accent shrink-0 rounded-full px-1.5 text-xs leading-5"
                        >×{{ line.qty }}</span
                      >
                    </span>
                    <span class="block truncate text-xs text-white/70">
                      @if (extrasText(line.key); as extras) {
                        {{ extras }} ·
                      }
                      {{ line.unitPrice * line.qty | money: false }}
                    </span>
                  </span>
                </button>
              </li>
            } @empty {
              <li class="text-sm text-white/60">{{ i18n.t('kiosk.empty') }}</li>
            }
          </ul>
        }
        <div class="ml-auto min-w-0 text-right">
          <p class="text-sm text-white/70">{{ i18n.t('cart.total') }}</p>
          <p class="font-display text-3xl font-extrabold tabular-nums md:text-4xl">
            {{ total() | money }}
          </p>
        </div>
        @if (stage() === 'menu') {
          <button
            type="button"
            class="bg-accent flex h-16 items-center gap-2 rounded-2xl px-8 text-xl font-bold text-white shadow-[0_12px_28px_-10px_rgb(249_115_22/0.9)] transition active:scale-[0.98] disabled:opacity-40 disabled:shadow-none md:px-10"
            [disabled]="cart.isEmpty()"
            (click)="stage.set('review')"
          >
            {{ i18n.t('kiosk.checkout') }}<i class="pi pi-arrow-right" aria-hidden="true"></i>
          </button>
        } @else {
          <button
            type="button"
            class="bg-accent flex h-16 items-center gap-2 rounded-2xl px-8 text-xl font-bold text-white shadow-[0_12px_28px_-10px_rgb(249_115_22/0.9)] transition active:scale-[0.98] disabled:opacity-40 disabled:shadow-none md:px-10"
            [disabled]="cart.isEmpty() || placing()"
            [attr.aria-busy]="placing()"
            (click)="placeOrder()"
          >
            <i
              class="pi"
              [class]="placing() ? 'pi-spin pi-spinner' : 'pi-check-circle'"
              aria-hidden="true"
            ></i>
            {{ i18n.t('kiosk.confirm') }}
          </button>
        }
      </footer>
    </div>

    <app-item-options-dialog
      [item]="actions.optionsItem()"
      (added)="addWithOptions($event)"
      (closed)="actions.closeOptions()"
    />

    @if (placed(); as order) {
      <div
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="i18n.t('kiosk.thanks')"
        class="bg-royal fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 p-6 text-center text-white"
      >
        <i class="pi pi-check-circle text-6xl text-emerald-300" aria-hidden="true"></i>
        <p class="font-display text-3xl font-extrabold">{{ i18n.t('kiosk.thanks') }}</p>
        <p class="text-xl text-white/80">{{ i18n.t('kiosk.yourQueue') }}</p>
        <p class="font-display animate-pop text-[10rem] leading-none font-extrabold tabular-nums">
          {{ order.queueNo }}
        </p>
        <p class="max-w-md text-xl text-white/85">{{ i18n.t('kiosk.payAtCounter') }}</p>
        <button
          type="button"
          class="bg-accent mt-4 min-h-16 rounded-full px-12 text-2xl font-bold transition active:scale-95"
          (click)="startOver()"
        >
          {{ i18n.t('kiosk.newOrder', { n: countdown() }) }}
        </button>
      </div>
    }
  `,
})
export class KioskPage {
  protected readonly i18n = inject(I18nService);
  protected readonly cart = inject(CartService);
  protected readonly catalog = inject(CatalogStore);
  protected readonly actions = inject(CartActions);
  protected readonly filter = inject(MenuFilterService);
  private readonly orderApi = inject(OrderApi);

  protected readonly nameLimit = TEXT_LIMITS.personName;
  protected readonly stage = signal<KioskStage>('menu');
  protected readonly name = signal('');
  protected readonly submitted = signal(false);
  protected readonly placing = signal(false);
  protected readonly placed = signal<OrderResponse | null>(null);
  protected readonly countdown = signal(RESET_SECONDS);

  protected readonly categories = computed(() => [
    {
      id: ALL_CATEGORIES,
      label: this.i18n.t('category.all'),
      palette: this.catalog.items()[0]?.palette ?? fallbackPalette(0),
    },
    ...this.catalog
      .categories()
      .filter((category) => this.catalog.items().some((item) => item.categoryId === category.id))
      .map((category) => ({
        id: category.id,
        label: this.i18n.text(category.name),
        palette: category.palette,
      })),
  ]);

  protected readonly activeCategoryLabel = computed(
    () => this.categories().find((category) => category.id === this.filter.category())?.label ?? '',
  );

  private readonly qtyById = computed(() => {
    const totals = new Map<string, number>();
    for (const line of this.cart.lines()) {
      totals.set(line.item.id, (totals.get(line.item.id) ?? 0) + line.qty);
    }
    return totals;
  });

  protected readonly nameMissing = computed(
    () => this.submitted() && !cleanText(this.name(), TEXT_LIMITS.personName),
  );

  private readonly paymentMethods = toSignal(
    this.orderApi.paymentMethods('ONLINE').pipe(catchError(() => of([]))),
    { initialValue: [] },
  );

  private readonly quote = toSignal(
    toObservable(this.cart.requestItems).pipe(
      debounceTime(250),
      switchMap((items) =>
        items.length
          ? this.orderApi.quote({ channel: 'ONLINE', items }).pipe(catchError(() => of(null)))
          : of(null),
      ),
    ),
    { initialValue: null },
  );

  protected readonly total = computed(() => this.quote()?.totalAmount ?? this.cart.subtotal());

  private readonly lines = computed(() => cartSummaryLines(this.cart.lines(), this.i18n));

  constructor() {
    this.catalog.load();
    this.filter.category.set(ALL_CATEGORIES);
    this.filter.query.set('');
    const timer = setInterval(() => {
      if (!this.placed()) {
        return;
      }
      if (this.countdown() <= 1) {
        this.startOver();
      } else {
        this.countdown.update((value) => value - 1);
      }
    }, 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
    effect(() => {
      if (this.cart.drawerOpen()) {
        this.cart.drawerOpen.set(false);
      }
    });
  }

  protected qtyOf(id: string): number {
    return this.qtyById().get(id) ?? 0;
  }

  protected add(item: MenuItem): void {
    this.actions.openOptions(item);
  }

  protected summaryLine(key: string): SummaryLine | undefined {
    return this.lines().find((line) => line.key === key);
  }

  protected extrasText(key: string): string {
    const line = this.summaryLine(key);
    return line ? [line.extras, ...line.omitted].filter(Boolean).join(', ') : '';
  }

  protected addWithOptions(result: OptionsResult): void {
    this.actions.add(result.item, result.options, result.qty);
    this.actions.closeOptions();
  }

  protected placeOrder(): void {
    this.submitted.set(true);
    const guestName = cleanText(this.name(), TEXT_LIMITS.personName);
    const methods = this.paymentMethods();
    const method =
      methods.find((candidate) => candidate.code === PAY_AT_COUNTER_METHOD)?.code ??
      methods[0]?.code;
    if (!guestName || !method || this.cart.isEmpty()) {
      return;
    }
    this.placing.set(true);
    this.orderApi
      .createOnline({
        items: this.cart.requestItems(),
        guestName,
        guestPhone: null,
        note: null,
        paymentMethodCode: method,
        promoCode: null,
        redeemPoints: null,
      })
      .subscribe({
        next: (order) => {
          this.placing.set(false);
          this.cart.clear();
          this.countdown.set(RESET_SECONDS);
          this.placed.set(order);
        },
        error: () => this.placing.set(false),
      });
  }

  protected startOver(): void {
    this.placed.set(null);
    this.name.set('');
    this.submitted.set(false);
    this.cart.clear();
    this.filter.category.set(ALL_CATEGORIES);
    this.stage.set('menu');
  }
}
