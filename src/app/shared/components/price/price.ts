import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';

export type PriceSize = 'sm' | 'md' | 'lg';

const SIZE_CLASS: Record<PriceSize, string> = {
  sm: 'text-sm',
  md: 'text-xl',
  lg: 'text-2xl',
};

@Component({
  selector: 'app-price',
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex items-baseline gap-1.5' },
  template: `
    <span class="font-bold tracking-tight" [class]="sizeClass()" [class.text-accent]="onSale()">
      ฿{{ amount() | number }}
    </span>
    @if (onSale()) {
      <span class="text-ink-muted text-sm line-through">฿{{ original() | number }}</span>
    }
  `,
})
export class Price {
  readonly amount = input.required<number>();
  readonly original = input<number>();
  readonly size = input<PriceSize>('md');

  protected readonly onSale = computed(() => (this.original() ?? 0) > this.amount());
  protected readonly sizeClass = computed(() => SIZE_CLASS[this.size()]);
}
