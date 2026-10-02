import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';

import { CatalogStore } from '../../../core/catalog/catalog.store';
import { HERO_SLIDES } from '../../../core/data/menu.data';
import { I18nService } from '../../../core/i18n/i18n.service';
import { MenuItem } from '../../../core/models/menu.model';
import { CtaLink } from '../../../shared/components/cta-link/cta-link';
import { FoodPlate } from '../../../shared/components/food-plate/food-plate';
import { promotionHeadline } from '../../../shared/utils/promotion';

interface Slide {
  id: string;
  lineOne: string;
  lineTwo: string;
  highlight: string;
  subtitle: string;
  items: MenuItem[];
  link: string;
  fragment?: string;
  cta: string;
}

const AUTOPLAY_MS = 5000;
const HERO_PLATE_COUNT = 3;

function rotate<T>(items: T[], offset: number): T[] {
  if (!items.length) {
    return items;
  }
  const start = offset % items.length;
  return [...items.slice(start), ...items.slice(0, start)];
}
const AUTOPLAY_TICK_MS = 100;
const SWIPE_THRESHOLD = 40;

@Component({
  selector: 'app-hero-carousel',
  imports: [CtaLink, FoodPlate],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <section
      id="home"
      class="relative overflow-hidden rounded-[2rem] bg-royal text-white shadow-[0_24px_48px_-24px_rgb(58_20_102/0.7)]"
      aria-roledescription="carousel"
      (mouseenter)="paused.set(true)"
      (mouseleave)="paused.set(false)"
      (touchstart)="onTouchStart($event)"
      (touchend)="onTouchEnd($event)"
    >
      <div
        class="pointer-events-none absolute -top-24 -right-16 h-72 w-72 rounded-full bg-white/10"
      ></div>
      <div
        class="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-[#f7931e]/15 blur-2xl"
      ></div>

      <div
        class="flex transition-transform duration-700 ease-out"
        [style.transform]="'translateX(-' + index() * 100 + '%)'"
      >
        @for (slide of slides(); track slide.id; let i = $index) {
          <div
            class="grid min-w-full grid-cols-[1.25fr_1fr] items-center gap-2 px-5 pt-6 pb-12 sm:px-8 md:px-12 md:pt-12 md:pb-16"
            role="group"
            aria-roledescription="slide"
            [attr.aria-hidden]="i !== index()"
          >
            <div class="relative z-10">
              <h2
                class="font-display text-[1.35rem] leading-[1.1] font-extrabold uppercase sm:text-3xl md:text-5xl"
              >
                {{ slide.lineOne }}<br />{{ slide.lineTwo }}
              </h2>
              <p
                class="font-display text-accent mt-1 text-2xl font-extrabold italic sm:text-3xl md:mt-2 md:text-5xl"
              >
                {{ slide.highlight }}
              </p>
              <p class="mt-2 max-w-sm text-xs text-white/80 sm:text-sm md:mt-4 md:text-base">
                {{ slide.subtitle }}
              </p>
              <app-cta-link
                class="mt-4 md:mt-7"
                [label]="slide.cta"
                [link]="slide.link"
                [fragment]="slide.fragment"
              />
            </div>

            <div class="relative aspect-square w-full max-w-80 justify-self-center">
              <div class="absolute inset-[8%] rounded-full bg-white/10"></div>
              @if (slide.items[0]; as item) {
                <app-food-plate
                  class="animate-float absolute top-[12%] left-[4%] w-[68%] drop-shadow-[0_18px_24px_rgb(0_0_0/0.35)]"
                  [palette]="item.palette"
                  [label]="i18n.text(item.name)"
                />
              }
              @if (slide.items[1]; as item) {
                <app-food-plate
                  class="animate-float absolute top-0 right-0 w-[42%] drop-shadow-[0_14px_18px_rgb(0_0_0/0.35)] [animation-delay:-1.3s]"
                  [palette]="item.palette"
                  [label]="i18n.text(item.name)"
                />
              }
              @if (slide.items[2]; as item) {
                <app-food-plate
                  class="animate-float absolute right-[2%] bottom-[2%] w-[38%] drop-shadow-[0_14px_18px_rgb(0_0_0/0.35)] [animation-delay:-2.6s]"
                  [palette]="item.palette"
                  [label]="i18n.text(item.name)"
                />
              }
            </div>
          </div>
        }
      </div>

      @if (slides().length > 1) {
        <div class="absolute inset-x-0 bottom-4 flex justify-center gap-2 md:bottom-6">
          @for (slide of slides(); track slide.id; let i = $index) {
            <button
              type="button"
              class="relative h-2 overflow-hidden rounded-full bg-white/30 transition-all duration-300 hover:bg-white/50"
              [class]="i === index() ? 'w-10' : 'w-2'"
              [attr.aria-label]="i18n.t('hero.slide', { n: i + 1 })"
              [attr.aria-current]="i === index()"
              (click)="goTo(i)"
            >
              @if (i === index()) {
                <span
                  class="absolute inset-0 rounded-full bg-white"
                  [class.animate-fill-x]="autoplay"
                  [style.--fill-duration]="autoplayMs + 'ms'"
                  [style.animation-play-state]="paused() ? 'paused' : 'running'"
                ></span>
              }
            </button>
          }
        </div>
        <div class="absolute right-4 bottom-3 hidden gap-2 md:right-6 md:bottom-5 md:flex">
          <button
            type="button"
            class="grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-white/10 backdrop-blur transition hover:bg-white/25 active:scale-90"
            [attr.aria-label]="i18n.t('hero.prev')"
            (click)="step(-1)"
          >
            <i class="pi pi-chevron-left text-sm"></i>
          </button>
          <button
            type="button"
            class="grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-white/10 backdrop-blur transition hover:bg-white/25 active:scale-90"
            [attr.aria-label]="i18n.t('hero.next')"
            (click)="step(1)"
          >
            <i class="pi pi-chevron-right text-sm"></i>
          </button>
        </div>
      }
    </section>
  `,
})
export class HeroCarousel {
  protected readonly i18n = inject(I18nService);
  private readonly document = inject(DOCUMENT);
  private readonly catalog = inject(CatalogStore);

  protected readonly index = signal(0);
  protected readonly autoplayMs = AUTOPLAY_MS;
  protected autoplay = false;
  private elapsedMs = 0;
  protected readonly paused = signal(false);
  private touchStartX = 0;

  protected readonly slides = computed<Slide[]>(() => {
    const recommended = this.catalog.items().filter((item) => item.recommended);
    const promotionSlides = this.catalog
      .promotions()
      .slice(0, 3)
      .map<Slide>((promotion) => {
        const targeted = this.catalog
          .items()
          .filter((item) => item.promotionIds.includes(promotion.id));
        return {
          id: `promo-${promotion.id}`,
          lineOne: this.i18n.t('hero.promoEyebrow'),
          lineTwo: this.i18n.name(promotion),
          highlight: promotionHeadline(promotion, this.i18n),
          subtitle: this.i18n.pick(promotion.description, promotion.descriptionEn),
          items: (targeted.length ? targeted : recommended).slice(0, 3),
          link: `/promotions/${promotion.id}`,
          cta: this.i18n.t('hero.promoCta'),
        };
      });
    const featured = recommended.length ? recommended : this.catalog.items();
    const brandSlides = HERO_SLIDES.map<Slide>((slide, slideIndex) => ({
      id: slide.id,
      lineOne: this.i18n.text(slide.lineOne),
      lineTwo: this.i18n.text(slide.lineTwo),
      highlight: this.i18n.text(slide.highlight),
      subtitle: this.i18n.text(slide.subtitle),
      items: rotate(featured, slideIndex * HERO_PLATE_COUNT).slice(0, HERO_PLATE_COUNT),
      link: '/',
      fragment: 'menu',
      cta: this.i18n.t('hero.cta'),
    }));
    return [...promotionSlides, ...brandSlides];
  });

  constructor() {
    const reduceMotion = this.document.defaultView?.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (!reduceMotion) {
      this.autoplay = true;
      const timer = setInterval(() => {
        if (this.paused()) {
          return;
        }
        this.elapsedMs += AUTOPLAY_TICK_MS;
        if (this.elapsedMs >= AUTOPLAY_MS) {
          this.step(1);
        }
      }, AUTOPLAY_TICK_MS);
      inject(DestroyRef).onDestroy(() => clearInterval(timer));
    }
  }

  protected goTo(index: number): void {
    this.elapsedMs = 0;
    this.index.set(index);
  }

  protected onTouchStart(event: TouchEvent): void {
    this.paused.set(true);
    this.touchStartX = event.changedTouches[0]?.clientX ?? 0;
  }

  protected onTouchEnd(event: TouchEvent): void {
    const delta = (event.changedTouches[0]?.clientX ?? 0) - this.touchStartX;
    if (Math.abs(delta) > SWIPE_THRESHOLD) {
      this.step(delta < 0 ? 1 : -1);
    }
    this.paused.set(false);
  }

  protected step(direction: number): void {
    this.elapsedMs = 0;
    const total = Math.max(1, this.slides().length);
    this.index.update((index) => (index + direction + total) % total);
  }
}
