import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-summary-row',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex items-center justify-between',
    '[class.text-ink-muted]': '!emphasis()',
    '[class.text-sm]': '!emphasis()',
    '[class.text-ink]': 'emphasis()',
  },
  template: `
    <span [class.text-lg]="emphasis()" [class.font-bold]="emphasis()">{{ label() }}</span>
    <span [class.text-2xl]="emphasis()" [class.font-bold]="emphasis()" class="tabular-nums">{{
      value()
    }}</span>
  `,
})
export class SummaryRow {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly emphasis = input(false);
}
