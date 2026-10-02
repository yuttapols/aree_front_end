import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <section
      class="bg-card border-line shadow-soft animate-rise h-full rounded-3xl border p-5 transition-shadow duration-300 hover:shadow-lift md:p-6"
    >
      @if (heading()) {
        <header class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div class="flex min-w-0 items-center gap-3">
            @if (icon()) {
              <span
                class="bg-brand-soft text-brand grid h-10 w-10 shrink-0 place-items-center rounded-2xl"
              >
                <i [class]="icon()"></i>
              </span>
            } @else {
              <span class="bg-accent h-6 w-1.5 shrink-0 rounded-full" aria-hidden="true"></span>
            }
            <div class="min-w-0">
              <h2 class="font-display text-ink text-lg font-bold">{{ heading() }}</h2>
              @if (subtitle()) {
                <p class="text-ink-muted text-sm">{{ subtitle() }}</p>
              }
            </div>
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
  readonly icon = input<string | null>(null);
}
