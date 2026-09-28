import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';

import { PromotionResponse } from '../../core/api/models/loyalty.model';
import { PromotionApi } from '../../core/api/services/promotion.api';
import { CatalogStore } from '../../core/catalog/catalog.store';
import { I18nService } from '../../core/i18n/i18n.service';
import { MenuItem } from '../../core/models/menu.model';
import { CartActions } from '../cart/cart-actions.service';
import { Crumb } from '../../shared/components/breadcrumbs/breadcrumbs';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { LoadingSkeleton } from '../../shared/components/loading-skeleton/loading-skeleton';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { Panel } from '../../shared/components/panel/panel';
import { ProductTile } from '../../shared/components/product-tile/product-tile';
import { ThaiDatePipe } from '../../shared/pipes/thai-date.pipe';
import { promotionConditions, promotionHeadline } from '../../shared/utils/promotion';
import {
  ItemOptionsDialog,
  OptionsResult,
} from '../../shared/components/item-options-dialog/item-options-dialog';

@Component({
  selector: 'app-promotion-detail-page',
  imports: [
    RouterLink,
    ButtonModule,
    EmptyState,
    ItemOptionsDialog,
    LoadingSkeleton,
    PageHeader,
    Panel,
    ProductTile,
    ThaiDatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header
      [title]="i18n.t('promo.title')"
      [crumbs]="crumbs"
      container="mx-auto max-w-5xl px-4 md:px-6"
    />

    <div class="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-10">
      @if (promotion(); as current) {
        <section class="bg-royal relative overflow-hidden rounded-[2rem] p-6 text-white md:p-10">
          <i
            class="pi pi-tag pointer-events-none absolute -right-6 -bottom-10 text-[12rem] text-white/10"
          ></i>
          <p class="font-display text-accent relative text-4xl font-extrabold md:text-6xl">
            {{ headline() }}
          </p>
          <h2 class="relative mt-2 text-2xl font-bold md:text-3xl">{{ i18n.name(current) }}</h2>
          <p class="relative mt-2 max-w-xl text-white/80">
            {{ i18n.pick(current.description, current.descriptionEn) }}
          </p>
          <div class="relative mt-5 flex flex-wrap items-center gap-3">
            @if (current.code; as code) {
              <button
                type="button"
                class="rounded-full border border-dashed border-white/60 px-4 py-2 text-sm font-bold tracking-widest transition hover:bg-white/10"
                (click)="copy(code)"
              >
                <i class="pi pi-copy mr-2"></i>{{ code }}
              </button>
            } @else {
              <span class="bg-accent rounded-full px-4 py-2 text-sm font-bold">
                {{ i18n.t('promo.autoApply') }}
              </span>
            }
            <span class="text-sm text-white/80">
              {{ current.startAt | thaiDate: i18n.lang() : 'date' }} –
              {{ current.endAt | thaiDate: i18n.lang() : 'date' }}
            </span>
          </div>
        </section>

        <div class="mt-5 grid gap-5 md:grid-cols-[1fr_2fr]">
          <app-panel [heading]="i18n.t('promo.conditions')">
            <ul class="flex flex-col gap-2 text-sm">
              @for (condition of conditions(); track condition) {
                <li class="text-ink flex items-start gap-2">
                  <i class="pi pi-check-circle text-brand mt-0.5 text-xs"></i>{{ condition }}
                </li>
              } @empty {
                <li class="text-ink-muted">{{ i18n.t('promo.noConditions') }}</li>
              }
            </ul>
          </app-panel>
          <app-panel [heading]="i18n.t('promo.products')">
            @if (products().length) {
              <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
                @for (item of products(); track item.id) {
                  <app-product-tile [item]="item" (pick)="actions.add(item)" />
                }
              </div>
            } @else {
              <p class="text-ink-muted text-sm">{{ i18n.t('promo.allProducts') }}</p>
              <a
                pButton
                routerLink="/"
                fragment="menu"
                class="mt-4"
                [label]="i18n.t('hero.cta')"
                icon="pi pi-arrow-right"
                iconPos="right"
                [rounded]="true"
              ></a>
            }
          </app-panel>
        </div>
      } @else if (notFound()) {
        <app-empty-state icon="pi pi-percentage" [title]="i18n.t('promo.notFound')">
          <a
            pButton
            routerLink="/promotions"
            [label]="i18n.t('promo.backToList')"
            [rounded]="true"
          ></a>
        </app-empty-state>
      } @else {
        <app-loading-skeleton variant="list" [count]="3" />
      }
    </div>

    <app-item-options-dialog
      [item]="actions.optionsItem()"
      (added)="addWithOptions($event)"
      (closed)="actions.closeOptions()"
    />
  `,
})
export class PromotionDetailPage {
  protected readonly i18n = inject(I18nService);
  protected readonly actions = inject(CartActions);
  private readonly api = inject(PromotionApi);
  private readonly catalog = inject(CatalogStore);
  private readonly messages = inject(MessageService);

  readonly id = input.required<string>();

  protected readonly crumbs: Crumb[] = [
    { labelKey: 'promo.title', link: '/promotions' },
    { labelKey: 'promo.detail' },
  ];

  protected readonly promotion = signal<PromotionResponse | null>(null);
  protected readonly notFound = signal(false);

  protected readonly headline = computed(() => {
    const promotion = this.promotion();
    return promotion ? promotionHeadline(promotion, this.i18n) : '';
  });

  protected readonly conditions = computed(() => {
    const promotion = this.promotion();
    return promotion ? promotionConditions(promotion, this.i18n) : [];
  });

  protected readonly products = computed<MenuItem[]>(() => {
    const promotion = this.promotion();
    return promotion
      ? this.catalog.items().filter((item) => item.promotionIds.includes(promotion.id))
      : [];
  });

  constructor() {
    this.catalog.load();
    effect(() => {
      this.api.publicDetail(Number(this.id())).subscribe({
        next: (promotion) => this.promotion.set(promotion),
        error: () => this.notFound.set(true),
      });
    });
  }

  protected copy(code: string): void {
    navigator.clipboard?.writeText(code).catch(() => undefined);
    this.messages.add({ severity: 'success', summary: this.i18n.t('promo.copied', { code }) });
  }

  protected addWithOptions(result: OptionsResult): void {
    this.actions.add(result.item, result.options, result.qty);
    this.actions.closeOptions();
  }
}
