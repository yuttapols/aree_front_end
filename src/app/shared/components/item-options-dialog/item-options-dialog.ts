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
import { DialogModule } from 'primeng/dialog';

import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslationKey } from '../../../core/i18n/translations';
import { MenuItem, MenuOption } from '../../../core/models/menu.model';
import { ProductImage } from '../product-image/product-image';
import { OptionSelector } from '../option-selector/option-selector';
import { QtyStepper } from '../qty-stepper/qty-stepper';
import { defaultSelection, isSelectionValid } from '../../utils/options';
import { formatBaht, sumOptionPrices } from '../../utils/price';

export interface OptionsResult {
  item: MenuItem;
  options: MenuOption[];
  qty: number;
}

@Component({
  selector: 'app-item-options-dialog',
  imports: [DialogModule, OptionSelector, ProductImage, QtyStepper],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-dialog
      [visible]="item() !== null"
      (visibleChange)="!$event && closed.emit()"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [showHeader]="false"
      [breakpoints]="{ '640px': '96vw' }"
      [style]="{ width: '36rem', borderRadius: '2rem', overflow: 'hidden' }"
      [contentStyle]="{ padding: '0' }"
    >
      @if (item(); as current) {
        <div class="bg-royal relative aspect-[16/10] w-full overflow-hidden">
          <app-product-image
            class="h-full w-full"
            [src]="current.imageUrl"
            [palette]="current.palette"
            [label]="i18n.text(current.name)"
            imageClass="h-full w-full object-cover"
            plateClass="mx-auto h-[82%] translate-y-[10%] drop-shadow-[0_18px_24px_rgb(0_0_0/0.35)]"
          />
          <button
            type="button"
            class="text-ink absolute top-4 right-4 grid h-12 w-12 place-items-center rounded-full bg-white/90 shadow-lg backdrop-blur transition hover:bg-white active:scale-90"
            [attr.aria-label]="i18n.t('common.close')"
            (click)="closed.emit()"
          >
            <i class="pi pi-times text-lg" aria-hidden="true"></i>
          </button>
          <span
            class="bg-accent font-display absolute bottom-4 left-4 -rotate-6 rounded-2xl px-5 py-2 text-3xl font-extrabold text-white shadow-[0_12px_24px_-8px_rgb(0_0_0/0.45)]"
            >{{ formatBaht(current.price) }}</span
          >
          @if (current.originalPrice && current.originalPrice > current.price) {
            <span
              class="absolute bottom-5 left-36 rounded-full bg-black/45 px-3 py-1 text-sm font-semibold text-white line-through"
              >{{ formatBaht(current.originalPrice) }}</span
            >
          }
        </div>

        <div class="px-6 pt-5 pb-6">
          <h2 class="font-display text-ink text-3xl leading-tight font-extrabold">
            {{ i18n.text(current.name) }}
          </h2>
          @if (i18n.text(current.description); as description) {
            <p class="text-ink-muted mt-1">{{ description }}</p>
          }
          @if (current.optionGroups.length) {
            <app-option-selector
              class="mt-6"
              [groups]="current.optionGroups"
              [selected]="selected()"
              (selectedChange)="selected.set($event)"
            />
          }
        </div>
      }
      <ng-template #footer>
        @if (item(); as current) {
          <div class="flex w-full items-center gap-4">
            @if (showQty()) {
              <app-qty-stepper
                [qty]="qty()"
                [min]="1"
                [addLabel]="i18n.t('cart.increaseQty', { name: i18n.text(current.name) })"
                [removeLabel]="i18n.t('cart.decreaseQty', { name: i18n.text(current.name) })"
                (increment)="qty.set(qty() + 1)"
                (decrement)="qty.set(qty() - 1)"
              />
            } @else {
              <span class="text-ink-muted font-bold">×{{ qty() }}</span>
            }
            <button
              type="button"
              class="bg-accent flex h-14 flex-1 items-center justify-between gap-3 rounded-2xl px-5 text-lg font-bold text-white shadow-[0_12px_28px_-10px_rgb(249_115_22/0.9)] transition active:scale-[0.98] disabled:opacity-40 disabled:shadow-none"
              [disabled]="!valid()"
              (click)="confirm(current)"
            >
              <span class="flex items-center gap-2"
                ><i class="pi pi-shopping-bag" aria-hidden="true"></i
                >{{ i18n.t(confirmLabelKey()) }}</span
              >
              <span class="font-display text-xl tabular-nums">{{ formatBaht(total()) }}</span>
            </button>
          </div>
        }
      </ng-template>
    </p-dialog>
  `,
})
export class ItemOptionsDialog {
  protected readonly i18n = inject(I18nService);

  readonly item = input<MenuItem | null>(null);
  readonly initialOptions = input<MenuOption[] | null>(null);
  readonly initialQty = input(1);
  readonly showQty = input(true);
  readonly confirmLabelKey = input<TranslationKey>('options.add');

  readonly added = output<OptionsResult>();
  readonly closed = output<void>();

  protected readonly selected = signal<MenuOption[]>([]);
  protected readonly qty = signal(1);
  protected readonly formatBaht = formatBaht;

  protected readonly total = computed(() => {
    const item = this.item();
    return item ? (item.price + sumOptionPrices(this.selected())) * this.qty() : 0;
  });

  protected readonly valid = computed(() => {
    const item = this.item();
    return !!item && isSelectionValid(item.optionGroups, this.selected());
  });

  constructor() {
    effect(() => {
      const item = this.item();
      const initial = this.initialOptions();
      this.selected.set(item ? (initial ?? defaultSelection(item.optionGroups)) : []);
      this.qty.set(this.initialQty());
    });
  }

  protected confirm(item: MenuItem): void {
    this.added.emit({ item, options: this.selected(), qty: this.qty() });
  }
}
