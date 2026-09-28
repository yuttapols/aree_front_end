import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <section class="bg-card border-line shadow-soft h-full rounded-3xl border p-5 md:p-6">
      @if (heading()) {
        <header class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div class="min-w-0">
            <h2 class="text-ink text-lg font-bold">{{ heading() }}</h2>
            @if (subtitle()) {
              <p class="text-ink-muted text-sm">{{ subtitle() }}</p>
            }
          </div>
          <div class="flex flex-wrap items-center gap-2 empty:hidden">
            <ng-content select="[panelActions]" />
          </div>
        </header>
      }
      <ng-content />
    </section>
  `,
})
export class Panel {
  readonly heading = input<string | null>(null);
  readonly subtitle = input<string | null>(null);
}
