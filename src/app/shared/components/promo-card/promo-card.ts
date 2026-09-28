import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';

import { PromotionResponse } from '../../../core/api/models/loyalty.model';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ThaiDatePipe } from '../../pipes/thai-date.pipe';
import { promotionConditions, promotionHeadline } from '../../utils/promotion';

@Component({
  selector: 'app-promo-card',
  imports: [RouterLink, ThaiDatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <article
      class="bg-card border-line shadow-soft flex h-full flex-col overflow-hidden rounded-3xl border"
    >
      <a
        [routerLink]="['/promotions', promotion().id]"
        class="bg-royal relative block overflow-hidden px-5 py-6 text-white"
      >
        @if (promotion().bannerUrl) {
          <img
            [src]="promotion().bannerUrl"
            alt=""
            class="absolute inset-0 h-full w-full object-cover opacity-40"
          />
        }
        <i
          class="pi pi-tag pointer-events-none absolute -right-4 -bottom-6 text-[7rem] text-white/10"
        ></i>
        <p class="font-display text-accent relative text-3xl font-extrabold">{{ headline() }}</p>
        <h3 class="relative mt-1 text-lg leading-snug font-bold">{{ i18n.name(promotion()) }}</h3>
      </a>
      <div class="flex flex-1 flex-col gap-3 p-5">
        <p class="text-ink-muted text-sm">
          {{ i18n.pick(promotion().description, promotion().descriptionEn) }}
        </p>
        @if (conditions().length) {
          <ul class="flex flex-wrap gap-1.5">
            @for (condition of conditions(); track condition) {
              <li
                class="bg-card-muted text-ink-muted rounded-full px-2.5 py-1 text-[0.7rem] font-semibold"
              >
                {{ condition }}
              </li>
            }
          </ul>
        }
        <div class="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
          <span class="text-ink-muted text-xs">
            <i class="pi pi-calendar mr-1 text-[0.65rem]"></i>
            {{
              i18n.t('promo.until', { date: (promotion().endAt | thaiDate: i18n.lang() : 'date') })
            }}
          </span>
          @if (promotion().code; as code) {
            <button
              type="button"
              class="border-brand text-brand hover:bg-brand-soft rounded-full border border-dashed px-3 py-1 text-xs font-bold tracking-wider transition"
              [attr.aria-label]="i18n.t('promo.copyCode')"
              (click)="copy(code)"
            >
              <i class="pi pi-copy mr-1 text-[0.65rem]"></i>{{ code }}
            </button>
          } @else {
            <span class="text-accent text-xs font-semibold">{{ i18n.t('promo.autoApply') }}</span>
          }
        </div>
      </div>
    </article>
  `,
})
export class PromoCard {
  protected readonly i18n = inject(I18nService);
  private readonly messages = inject(MessageService);

  readonly promotion = input.required<PromotionResponse>();

  protected readonly headline = computed(() => promotionHeadline(this.promotion(), this.i18n));
  protected readonly conditions = computed(() => promotionConditions(this.promotion(), this.i18n));

  protected copy(code: string): void {
    navigator.clipboard?.writeText(code).catch(() => undefined);
    this.messages.add({ severity: 'success', summary: this.i18n.t('promo.copied', { code }) });
  }
}
