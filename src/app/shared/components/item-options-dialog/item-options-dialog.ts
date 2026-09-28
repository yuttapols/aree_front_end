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
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';

import { I18nService } from '../../../core/i18n/i18n.service';
import { MenuItem, MenuOption } from '../../../core/models/menu.model';
import { FoodPlate } from '../food-plate/food-plate';
import { OptionSelector } from '../option-selector/option-selector';
import { Price } from '../price/price';
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
  imports: [ButtonModule, DialogModule, FoodPlate, OptionSelector, Price, QtyStepper],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-dialog
      [visible]="item() !== null"
      (visibleChange)="!$event && closed.emit()"
      [modal]="true"
      [dismissableMask]="true"
      [draggable]="false"
      [resizable]="false"
      [header]="i18n.t('options.title')"
      [breakpoints]="{ '640px': '94vw' }"
      [style]="{ width: '34rem' }"
    >
      @if (item(); as current) {
        <div class="flex gap-4">
          <div class="bg-card-muted h-24 w-24 shrink-0 overflow-hidden rounded-2xl p-2">
            @if (current.imageUrl) {
              <img
                [src]="current.imageUrl"
                [alt]="i18n.text(current.name)"
                class="h-full w-full rounded-xl object-cover"
              />
            } @else {
              <app-food-plate [palette]="current.palette" />
            }
          </div>
          <div class="min-w-0">
            <h3 class="text-ink text-xl font-bold">{{ i18n.text(current.name) }}</h3>
            <p class="text-ink-muted mt-1 text-sm">{{ i18n.text(current.description) }}</p>
            <app-price
              class="mt-2"
              [amount]="current.price"
              [original]="current.originalPrice"
              size="sm"
            />
          </div>
        </div>

        @if (current.optionGroups.length) {
          <app-option-selector
            class="mt-6"
            [groups]="current.optionGroups"
            [selected]="selected()"
            (selectedChange)="selected.set($event)"
          />
        }

        <div class="mt-6 flex items-center justify-between gap-4">
          <div>
            <p class="text-ink-muted mb-1 text-xs">{{ i18n.t('options.quantity') }}</p>
            <app-qty-stepper
              [qty]="qty()"
              [min]="1"
              (increment)="qty.set(qty() + 1)"
              (decrement)="qty.set(qty() - 1)"
            />
          </div>
          <p-button
            [label]="i18n.t('options.add') + ' · ' + formatBaht(total())"
            icon="pi pi-shopping-bag"
            [rounded]="true"
            size="large"
            [disabled]="!valid()"
            (onClick)="confirm(current)"
          />
        </div>
      }
    </p-dialog>
  `,
})
export class ItemOptionsDialog {
  protected readonly i18n = inject(I18nService);

  readonly item = input<MenuItem | null>(null);

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
      this.selected.set(item ? defaultSelection(item.optionGroups) : []);
      this.qty.set(1);
    });
  }

  protected confirm(item: MenuItem): void {
    this.added.emit({ item, options: this.selected(), qty: this.qty() });
  }
}
