import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { SummaryLine } from '../../utils/order-lines';

@Component({
  selector: 'app-line-extras',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    @if (line(); as current) {
      @if (current.extras || current.omitted.length) {
        <span>{{ current.extras }}</span>
        @if (current.extras && current.omitted.length) {
          <span>, </span>
        }
        @for (omitted of current.omitted; track omitted; let last = $last) {
          <span class="font-bold text-red-600 dark:text-red-400">{{ omitted }}</span>
          @if (!last) {
            <span>, </span>
          }
        }
      } @else {
        {{ emptyText() }}
      }
    } @else {
      {{ emptyText() }}
    }
  `,
})
export class LineExtras {
  readonly line = input<SummaryLine | undefined>();
  readonly emptyText = input('');
}
