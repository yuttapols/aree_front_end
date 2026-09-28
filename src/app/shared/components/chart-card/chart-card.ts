import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ChartModule } from 'primeng/chart';

import { Panel } from '../panel/panel';

export type ChartKind = 'line' | 'bar' | 'doughnut' | 'pie';

@Component({
  selector: 'app-chart-card',
  imports: [ChartModule, Panel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <app-panel [heading]="heading()" [subtitle]="subtitle()">
      <div [style.height]="height()">
        <p-chart [type]="type()" [data]="data()" [options]="options()" height="100%" />
      </div>
    </app-panel>
  `,
})
export class ChartCard {
  readonly heading = input.required<string>();
  readonly subtitle = input<string | null>(null);
  readonly type = input<ChartKind>('line');
  readonly data = input.required<unknown>();
  readonly options = input<unknown>({});
  readonly height = input('18rem');
}
