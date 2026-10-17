import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  model,
  viewChild,
} from '@angular/core';

import { I18nService } from '../../../core/i18n/i18n.service';
import { MoneyPipe } from '../../pipes/money.pipe';

const BANKNOTES = [20, 50, 100, 500, 1000];
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'BACK'];
const MAX_RECEIVED = 999_999;

@Component({
  selector: 'app-cash-pad',
  imports: [MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="grid gap-4 sm:grid-cols-2">
      <div class="flex flex-col gap-3">
        <label
          class="border-brand bg-brand-soft ring-brand/15 block cursor-text rounded-2xl border-2 px-4 py-3 ring-4 transition"
        >
          <span class="text-brand flex items-center gap-1.5 text-xs font-bold">
            <span class="bg-brand h-2 w-2 animate-pulse rounded-full"></span>
            {{ i18n.t('pos.cashReceived') }}
          </span>
          <span class="font-display text-ink mt-1 flex items-baseline gap-1 text-3xl font-bold">
            <span>฿</span>
            <input
              #receivedField
              type="text"
              inputmode="numeric"
              autocomplete="off"
              maxlength="6"
              class="caret-brand text-ink w-full min-w-0 bg-transparent tabular-nums outline-none placeholder:text-ink-muted/40"
              placeholder="0"
              [value]="received() || ''"
              (input)="onType($any($event.target))"
            />
          </span>
        </label>
        <div
          class="rounded-2xl px-4 py-3 transition"
          [class]="
            enough()
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
              : 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'
          "
        >
          <p class="text-xs font-semibold">
            {{ enough() ? i18n.t('pos.change') : i18n.t('pos.shortBy') }}
          </p>
          <p class="font-display mt-1 text-3xl font-bold tabular-nums">
            {{ (enough() ? change() : shortBy()) | money }}
          </p>
        </div>
        <div class="grid grid-cols-3 gap-2">
          <button type="button" [class]="chipClass(received() === total())" (click)="setExact()">
            {{ i18n.t('pos.exact') }}
          </button>
          @for (note of quickAmounts(); track note) {
            <button
              type="button"
              [class]="chipClass(received() === note)"
              (click)="received.set(note)"
            >
              ฿{{ note.toLocaleString('en-US') }}
            </button>
          }
        </div>
      </div>

      <div class="grid grid-cols-3 gap-2">
        @for (key of keys; track key) {
          <button
            type="button"
            class="bg-canvas text-ink hover:bg-brand-soft font-display h-14 rounded-2xl text-xl font-bold transition active:scale-95"
            [attr.aria-label]="key === 'BACK' ? i18n.t('pos.backspace') : key"
            (click)="press(key)"
          >
            @if (key === 'BACK') {
              <i class="pi pi-delete-left text-lg"></i>
            } @else {
              {{ key }}
            }
          </button>
        }
      </div>
    </div>
  `,
})
export class CashPad {
  protected readonly i18n = inject(I18nService);

  readonly total = input.required<number>();
  readonly received = model(0);

  private readonly receivedField = viewChild<ElementRef<HTMLInputElement>>('receivedField');

  protected readonly quickAmounts = computed(() => {
    const total = this.total();
    const roundUps = [100, 500, 1000].map((step) => Math.ceil(total / step) * step);
    return [...new Set([...BANKNOTES, ...roundUps])]
      .filter((amount) => amount > total)
      .sort((a, b) => a - b)
      .slice(0, 5);
  });

  constructor() {
    afterNextRender(() => this.receivedField()?.nativeElement.focus());
  }
  protected readonly keys = KEYS;

  protected readonly enough = computed(() => this.received() >= this.total());
  protected readonly change = computed(() => Math.max(0, this.received() - this.total()));
  protected readonly shortBy = computed(() => Math.max(0, this.total() - this.received()));

  protected chipClass(active: boolean): string {
    return active
      ? 'bg-brand text-on-brand border-brand h-11 rounded-xl border-2 text-sm font-bold transition active:scale-95'
      : 'bg-card border-line text-ink hover:border-brand/50 h-11 rounded-xl border-2 text-sm font-bold transition active:scale-95';
  }

  protected onType(field: HTMLInputElement): void {
    const digits = field.value.replace(/D/g, '').slice(0, 6);
    field.value = digits;
    this.received.set(Math.min(MAX_RECEIVED, Number(digits) || 0));
  }

  protected setExact(): void {
    this.received.set(this.total());
  }

  protected press(key: string): void {
    const current = Math.floor(this.received());
    if (key === 'C') {
      this.received.set(0);
    } else if (key === 'BACK') {
      this.received.set(Math.floor(current / 10));
    } else {
      this.received.set(Math.min(MAX_RECEIVED, current * 10 + Number(key)));
    }
  }
}
