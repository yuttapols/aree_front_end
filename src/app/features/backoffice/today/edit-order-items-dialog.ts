import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
} from '@angular/core';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { toObservable } from '@angular/core/rxjs-interop';
import {
  Observable,
  catchError,
  concatMap,
  filter,
  finalize,
  forkJoin,
  of,
  switchMap,
  take,
  throwError,
} from 'rxjs';

import { OrderResponse } from '../../../core/api/models/order.model';
import { OrderApi } from '../../../core/api/services/order.api';
import { cartLineKey } from '../../../core/cart/cart.service';
import { CatalogStore } from '../../../core/catalog/catalog.store';
import { I18nService } from '../../../core/i18n/i18n.service';
import { MenuItem, MenuOption } from '../../../core/models/menu.model';
import {
  ItemOptionsDialog,
  OptionsResult,
} from '../../../shared/components/item-options-dialog/item-options-dialog';
import { LineExtras } from '../../../shared/components/line-extras/line-extras';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { cartSummaryLines } from '../../../shared/utils/order-lines';
import { resolveOrderOptions } from '../../../shared/utils/options';
import { sumOptionPrices } from '../../../shared/utils/price';

interface EditLine {
  key: string;
  originalKey: string;
  item: MenuItem;
  options: MenuOption[];
  qty: number;
  unitPrice: number;
  note: string | null;
}

function toEditLine(
  item: MenuItem,
  options: MenuOption[],
  qty: number,
  note: string | null,
): EditLine {
  const key = cartLineKey(item, options);
  return {
    key,
    originalKey: key,
    item,
    options,
    qty,
    unitPrice: item.price + sumOptionPrices(options),
    note,
  };
}

@Component({
  selector: 'app-edit-order-items-dialog',
  imports: [ButtonModule, DialogModule, ItemOptionsDialog, LineExtras, MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-dialog
      [(visible)]="visible"
      [modal]="true"
      [draggable]="false"
      [dismissableMask]="!saving()"
      [closable]="!saving()"
      [style]="{ width: '40rem' }"
      [breakpoints]="{ '640px': '95vw' }"
      [header]="i18n.t('bo.editItems.title', { n: order().queueNo })"
    >
      @if (loading()) {
        <p class="text-ink-muted py-8 text-center">
          <i class="pi pi-spin pi-spinner mr-2"></i>{{ i18n.t('bo.editItems.loading') }}
        </p>
      } @else if (unresolved()) {
        <p
          class="rounded-xl bg-red-50 px-4 py-3 font-semibold text-red-600 dark:bg-red-500/10 dark:text-red-400"
        >
          <i class="pi pi-exclamation-triangle mr-2"></i>{{ i18n.t('bo.editItems.unresolved') }}
        </p>
      } @else {
        <ul class="divide-line divide-y">
          @for (line of lines(); track line.key; let index = $index) {
            <li class="flex flex-wrap items-center gap-3 py-3">
              <div class="min-w-0 flex-1">
                <p class="text-ink font-bold">{{ i18n.text(line.item.name) }}</p>
                @if (summary()[index]; as described) {
                  @if (described.extras || described.omitted.length) {
                    <p class="text-ink-muted mt-0.5 text-sm">
                      <app-line-extras [line]="described" />
                    </p>
                  }
                }
                @if (line.note) {
                  <p class="text-accent mt-0.5 text-sm font-semibold">
                    <i class="pi pi-comment mr-1 text-xs"></i>{{ line.note }}
                  </p>
                }
                <p class="text-ink-muted mt-1 text-sm tabular-nums">
                  {{ line.unitPrice * line.qty | money: false }}
                </p>
              </div>
              <div class="flex items-center gap-2">
                <span
                  class="bg-brand-soft text-brand font-display grid h-10 min-w-10 place-items-center rounded-xl px-2 font-extrabold"
                  >×{{ line.qty }}</span
                >
                @if (line.item.optionGroups.length) {
                  <p-button
                    icon="pi pi-pencil"
                    [label]="i18n.t('bo.editItems.editOptions')"
                    [rounded]="true"
                    [disabled]="saving()"
                    (onClick)="editing.set(line)"
                  />
                }
              </div>
            </li>
          }
        </ul>
        <div class="border-line mt-2 flex items-baseline justify-between border-t pt-3">
          <span class="text-ink-muted text-sm">{{ i18n.t('bo.editItems.subtotal') }}</span>
          <span class="font-display text-ink text-xl font-bold tabular-nums">{{
            subtotal() | money
          }}</span>
        </div>
      }
      <div class="dialog-actions flex justify-end gap-2">
        <p-button
          [label]="i18n.t('common.cancel')"
          severity="secondary"
          [text]="true"
          [disabled]="saving()"
          (onClick)="visible.set(false)"
        />
        <p-button
          [label]="i18n.t('bo.editItems.save')"
          icon="pi pi-check"
          [loading]="saving()"
          [disabled]="!dirty() || !lines().length || unresolved() || loading()"
          (onClick)="save()"
        />
      </div>
    </p-dialog>

    @if (editing(); as line) {
      <app-item-options-dialog
        [item]="line.item"
        [initialOptions]="line.options"
        [initialQty]="line.qty"
        [showQty]="false"
        confirmLabelKey="bo.editItems.updateOptions"
        (added)="applyOptions(line.key, $event)"
        (closed)="editing.set(null)"
      />
    }
  `,
})
export class EditOrderItemsDialog {
  protected readonly i18n = inject(I18nService);
  private readonly api = inject(OrderApi);
  private readonly catalog = inject(CatalogStore);
  private readonly messages = inject(MessageService);

  readonly visible = model(false);
  readonly order = input.required<OrderResponse>();
  readonly updated = output<OrderResponse>();

  protected readonly lines = signal<EditLine[]>([]);
  protected readonly loading = signal(false);
  protected readonly unresolved = signal(false);
  protected readonly saving = signal(false);
  protected readonly dirty = signal(false);
  protected readonly editing = signal<EditLine | null>(null);

  protected readonly summary = computed(() => cartSummaryLines(this.lines(), this.i18n));
  private readonly catalogReady = toObservable(this.catalog.loaded).pipe(filter(Boolean), take(1));
  protected readonly subtotal = computed(() =>
    this.lines().reduce((total, line) => total + line.unitPrice * line.qty, 0),
  );

  constructor() {
    effect(() => {
      if (this.visible()) {
        untracked(() => this.prepare());
      }
    });
  }

  protected applyOptions(key: string, result: OptionsResult): void {
    this.lines.update((lines) =>
      lines.map((line) =>
        line.key === key
          ? {
              ...line,
              options: result.options,
              key: cartLineKey(line.item, result.options),
              unitPrice: line.item.price + sumOptionPrices(result.options),
            }
          : line,
      ),
    );
    this.editing.set(null);
    this.dirty.set(this.lines().some((line) => line.key !== line.originalKey));
  }

  protected save(): void {
    const changes = this.lines()
      .map((line, position) => ({ line, position }))
      .filter(({ line }) => line.key !== line.originalKey);
    if (!changes.length) {
      this.visible.set(false);
      return;
    }
    const orderId = this.order().id;
    this.saving.set(true);
    changes
      .reduce(
        (chain, { line, position }) =>
          chain.pipe(
            concatMap((latest) => {
              const itemId = latest.items?.[position]?.id;
              if (itemId == null) {
                return throwError(() => new Error('ORDER_ITEM_ID_MISSING'));
              }
              return this.api.updateItem(orderId, itemId, {
                productId: line.item.productId,
                quantity: line.qty,
                optionItemIds: line.options.map((option) => option.optionItemId),
                note: line.note,
              });
            }),
          ),
        of(this.order()),
      )
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe((order) => {
        this.messages.add({ severity: 'success', summary: this.i18n.t('bo.editItems.saved') });
        this.visible.set(false);
        this.updated.emit(order);
      });
  }

  private prepare(): void {
    const orderItems = this.order().items ?? [];
    this.dirty.set(false);
    this.unresolved.set(false);
    this.lines.set([]);
    this.loading.set(true);
    this.catalog.load();
    this.catalogReady
      .pipe(
        switchMap(() =>
          forkJoin(orderItems.map((orderItem) => this.productWithOptions(orderItem.productId))),
        ),
        finalize(() => this.loading.set(false)),
      )
      .subscribe((items) => {
        const lines: EditLine[] = [];
        orderItems.forEach((orderItem, index) => {
          const item = items[index];
          const options = item ? resolveOrderOptions(item, orderItem.options) : [];
          if (!item || options.some((option) => !option)) {
            this.unresolved.set(true);
            return;
          }
          lines.push(
            toEditLine(item, options as MenuOption[], orderItem.quantity, orderItem.note ?? null),
          );
        });
        this.lines.set(lines);
      });
  }

  private productWithOptions(productId: number): Observable<MenuItem | null> {
    const item = this.catalog.byId(String(productId));
    return item ? this.catalog.withOptions(item).pipe(catchError(() => of(null))) : of(null);
  }
}
